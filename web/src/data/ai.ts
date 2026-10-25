// Voice message → text + report fields, using Google Gemini (free tier) through Firebase AI Logic.
// Runs on the owner's dashboard only, so a worker cannot change the result.
import { initializeApp } from 'firebase/app'
import { GoogleAIBackend, getAI, getGenerativeModel } from 'firebase/ai'
import { aiFirebaseConfig, firebaseConfig } from '../firebase-config'
import { realAi } from '../lib/firebase'
import type { ReportAi, Site } from '../types'

// Free-tier models tested on this project with a Hindi message (Oct 2026): 3.6-flash answered in ~6 s,
// 3.5-flash-lite in ~3 s, both accurate. (3.8-flash did not answer within 3 minutes; 2.5-flash is retired.)
// If the first fails (busy, daily limit, timeout), the next is tried.
export const AI_MODELS = ['gemini-3.6-flash', 'gemini-3.5-flash-lite']
const TIMEOUT_MS = 60_000

const aiApp = realAi ? initializeApp(aiFirebaseConfig ?? firebaseConfig!, 'ai') : null

const fields = {
  transcript: { type: 'string', description: 'Exactly what was said. Hindi words in Devanagari, English words in Latin script. Empty if nothing audible.' },
  translationEn: { type: 'string', description: 'Faithful English translation of the transcript.' },
  siteId: { type: ['string', 'null'], description: 'id of the known site the worker clearly refers to, otherwise null.' },
  placeText: { type: 'string', description: "The place exactly as the worker named it, '' if none." },
  workEn: { type: 'string', description: "Very short English description of the work done (max 12 words), '' if not said." },
  workHi: { type: 'string', description: "Same in simple Hindi (Devanagari), '' if not said." },
  workStatus: { type: 'string', enum: ['completed', 'in_progress', 'problem', 'not_mentioned'] },
  paymentStatus: { type: 'string', enum: ['paid', 'partial', 'unpaid', 'not_mentioned'] },
  amount: { type: ['number', 'null'], description: 'Rupees the worker says the customer gave, as a number, else null.' },
  followUpEn: { type: 'string', description: "What must happen next, only if the worker says so, '' otherwise." },
  followUpHi: { type: 'string', description: "Same in simple Hindi, '' otherwise." },
  confidence: {
    type: 'object',
    properties: {
      site: { type: 'string', enum: ['high', 'low'] },
      work: { type: 'string', enum: ['high', 'low'] },
      payment: { type: 'string', enum: ['high', 'low'] },
    },
    required: ['site', 'work', 'payment'],
  },
  audioQuality: { type: 'string', enum: ['clear', 'noisy', 'silent'] },
}

const schema = { type: 'object', properties: fields, required: Object.keys(fields) }

function instructions(workerName: string, sites: Site[]): string {
  const list = sites.length
    ? sites.map((s) => `${s.id} | ${s.name.en} | ${s.name.hi || '-'} | ${s.area.en}`).join('\n')
    : '(no sites listed)'
  return `You turn a short voice message from a worker of Ayush Enterprises (interior renovation and civil
contracting in Navi Mumbai: Koparkhairane, Ghansoli, Vashi and nearby) into a work report for the owner.
The worker speaks Hindi, English, or a mix (sometimes with Marathi words). Worker: ${workerName}.

Known sites (id | English name | Hindi name | area):
${list}

Rules:
- Use ONLY what the worker actually says. Never guess, never add anything.
- If something is not said, use '' / null / not_mentioned.
- siteId: only when the worker clearly refers to one of the known sites (by name, area, flat/shop number or
  customer). If unsure, give your best match but set confidence.site to low. If no known site fits, null.
- paymentStatus: paid = customer paid what was due; partial = paid some; unpaid = did not pay;
  not_mentioned = payment not talked about. amount: "5 hazaar" = 5000, "dedh lakh" = 150000.
- Set a confidence to low when that part of the audio is unclear or the meaning is uncertain.
- audioQuality: silent if there is no speech.`
}

/** Phones record Opus/WebM; convert to 16 kHz mono WAV, a format the AI officially accepts. */
export async function toWav16k(blob: Blob): Promise<Uint8Array> {
  const input = await blob.arrayBuffer()
  const ctx = new AudioContext()
  let decoded: AudioBuffer
  try {
    decoded = await ctx.decodeAudioData(input)
  } finally {
    void ctx.close()
  }
  const rate = 16000
  const offline = new OfflineAudioContext(1, Math.max(1, Math.ceil(decoded.duration * rate)), rate)
  const src = offline.createBufferSource()
  src.buffer = decoded
  src.connect(offline.destination)
  src.start()
  const pcm = (await offline.startRendering()).getChannelData(0)

  const out = new DataView(new ArrayBuffer(44 + pcm.length * 2))
  const text = (o: number, s: string) => [...s].forEach((c, i) => out.setUint8(o + i, c.charCodeAt(0)))
  text(0, 'RIFF')
  out.setUint32(4, 36 + pcm.length * 2, true)
  text(8, 'WAVE')
  text(12, 'fmt ')
  out.setUint32(16, 16, true)
  out.setUint16(20, 1, true) // PCM
  out.setUint16(22, 1, true) // mono
  out.setUint32(24, rate, true)
  out.setUint32(28, rate * 2, true)
  out.setUint16(32, 2, true)
  out.setUint16(34, 16, true)
  text(36, 'data')
  out.setUint32(40, pcm.length * 2, true)
  for (let i = 0; i < pcm.length; i++) {
    const v = Math.max(-1, Math.min(1, pcm[i]))
    out.setInt16(44 + i * 2, v < 0 ? v * 0x8000 : v * 0x7fff, true)
  }
  return new Uint8Array(out.buffer)
}

function base64(bytes: Uint8Array): string {
  let s = ''
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return btoa(s)
}

function clean(raw: Partial<ReportAi>, sites: Site[]): ReportAi {
  const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '')
  const conf = (v: unknown) => (v === 'high' ? 'high' : 'low') as 'high' | 'low'
  const c = (raw.confidence ?? {}) as Partial<ReportAi['confidence']>
  const siteId = typeof raw.siteId === 'string' && sites.some((s) => s.id === raw.siteId) ? raw.siteId : null
  const amount = typeof raw.amount === 'number' && Number.isFinite(raw.amount) && raw.amount > 0 ? Math.round(raw.amount) : null
  return {
    transcript: str(raw.transcript),
    translationEn: str(raw.translationEn),
    siteId,
    placeText: str(raw.placeText),
    workEn: str(raw.workEn),
    workHi: str(raw.workHi),
    workStatus: (['completed', 'in_progress', 'problem'] as const).find((x) => x === raw.workStatus) ?? 'not_mentioned',
    paymentStatus: (['paid', 'partial', 'unpaid'] as const).find((x) => x === raw.paymentStatus) ?? 'not_mentioned',
    amount,
    followUpEn: str(raw.followUpEn),
    followUpHi: str(raw.followUpHi),
    confidence: { site: siteId ? conf(c.site) : 'low', work: conf(c.work), payment: conf(c.payment) },
    audioQuality: raw.audioQuality === 'clear' || raw.audioQuality === 'silent' ? raw.audioQuality : 'noisy',
  }
}

/** Stand-in used with the local test database: clearly marked, never pretends to understand. */
function testResult(seconds: number): ReportAi {
  return {
    transcript: `(TEST – no real AI) ${Math.round(seconds)} s recording`,
    translationEn: '(TEST – no real AI)',
    siteId: null,
    placeText: '',
    workEn: '',
    workHi: '',
    workStatus: 'not_mentioned',
    paymentStatus: 'not_mentioned',
    amount: null,
    followUpEn: '',
    followUpHi: '',
    confidence: { site: 'low', work: 'low', payment: 'low' },
    audioQuality: 'noisy',
  }
}

export async function understandVoice(
  audio: Blob,
  ctx: { workerName: string; sites: Site[]; seconds: number },
): Promise<{ ai: ReportAi; model: string }> {
  if (!aiApp) {
    await new Promise((r) => setTimeout(r, 600))
    return { ai: testResult(ctx.seconds), model: 'test-stand-in' }
  }
  const wav = base64(await toWav16k(audio))
  const ai = getAI(aiApp, { backend: new GoogleAIBackend() })
  let lastError: unknown
  for (const name of AI_MODELS) {
    try {
      const model = getGenerativeModel(
        ai,
        {
          model: name,
          systemInstruction: instructions(ctx.workerName, ctx.sites),
          generationConfig: { responseMimeType: 'application/json', responseJsonSchema: schema, temperature: 0 },
        },
        { timeout: TIMEOUT_MS },
      )
      const res = await model.generateContent([
        { type: 'text', text: 'Make the work report from this voice message.' },
        { type: 'inlineData', inlineData: { mimeType: 'audio/wav', data: wav } },
      ])
      return { ai: clean(JSON.parse(res.response.text()), ctx.sites), model: name }
    } catch (e) {
      lastError = e // busy / limit reached / timeout / retired: try the next model
    }
  }
  throw lastError
}
