// Owner's dashboard: turns new voice reports into text + fields, one at a time, while the app is open.
import {
  collection, doc, getDoc, getDocs, limit, query, runTransaction, serverTimestamp, Timestamp, updateDoc, where, writeBatch,
} from 'firebase/firestore'
import { useEffect, useRef, useState } from 'react'
import { auth, db } from '../lib/firebase'
import type { Report, Site, Worker } from '../types'
import { errorText } from './convert'

const STUCK_AFTER_MS = 3 * 60_000 // a report left "processing" this long (app closed mid-way) is tried again
const GAP_MS = 4_000 // pause between AI calls: the free tier allows only a few requests per minute
export const KEEP_AUDIO_DAYS = 90 // recordings older than this are deleted; the text stays

export function audioBlobFrom(data: { audio: { toUint8Array(): Uint8Array }; mimeType?: string }): Blob {
  return new Blob([data.audio.toUint8Array() as BlobPart], { type: data.mimeType || 'audio/webm' })
}

const waiting = (r: Report, now: number) =>
  r.status === 'new' || (r.status === 'processing' && (r.processingAt ?? 0) < now - STUCK_AFTER_MS)

export function useAiProcessor(reports: Report[], workers: Worker[], sites: Site[]) {
  const busy = useRef(false)
  const lastCall = useRef(0)
  const [tick, setTick] = useState(0)

  // Re-check every minute (stuck reports, network back) even when nothing else changes.
  useEffect(() => {
    const bump = () => setTick((n) => n + 1)
    const t = window.setInterval(bump, 60_000)
    window.addEventListener('online', bump)
    return () => {
      window.clearInterval(t)
      window.removeEventListener('online', bump)
    }
  }, [])

  useEffect(() => {
    if (busy.current || !navigator.onLine) return
    const now = Date.now()
    const next = reports.filter((r) => waiting(r, now)).sort((a, b) => a.deviceTime - b.deviceTime)[0]
    if (!next) return
    busy.current = true
    const wait = Math.max(0, lastCall.current + GAP_MS - now)
    const ref = doc(db, 'reports', next.id)

    const run = async () => {
      // Claim it, so a second owner device does not process the same report.
      const claimed = await runTransaction(db, async (tx) => {
        const snap = await tx.get(ref)
        const status = snap.data()?.status
        const at = snap.data()?.processingAt?.toMillis?.() ?? 0
        if (status !== 'new' && !(status === 'processing' && at < Date.now() - STUCK_AFTER_MS)) return false
        tx.update(ref, { status: 'processing', processingAt: serverTimestamp(), processingBy: auth.currentUser!.uid })
        return true
      })
      if (!claimed) return
      try {
        const a = await getDoc(doc(db, 'reportAudio', next.id))
        if (!a.exists()) throw new Error('recording missing')
        const w = workers.find((x) => x.id === next.workerId)
        lastCall.current = Date.now()
        // Loaded only on the owner's dashboard; worker phones never download the AI code.
        const { understandVoice } = await import('./ai')
        const { ai, model } = await understandVoice(audioBlobFrom(a.data() as never), {
          workerName: w ? `${w.name}${w.nameHi ? ` (${w.nameHi})` : ''}` : 'unknown',
          sites: sites.filter((s) => s.active),
          seconds: next.durationSec,
        })
        await updateDoc(ref, { status: 'processed', ai, model, aiError: null, processedAt: serverTimestamp() })
      } catch (e) {
        const code = errorText(e)
        const why = e instanceof Error && e.message !== code ? `${code}: ${e.message}` : code
        await updateDoc(ref, { status: 'failed', aiError: why.slice(0, 300) }).catch(() => {})
      }
    }

    const timer = window.setTimeout(() => {
      run()
        .catch(() => {}) // offline or claim failed: tried again on the next check
        .finally(() => {
          busy.current = false
          setTick((n) => n + 1)
        })
    }, wait)
    return () => {
      // Only cancel if the call has not started yet.
      if (Date.now() < now + wait) {
        window.clearTimeout(timer)
        busy.current = false
      }
    }
  }, [reports, workers, sites, tick])
}

/** Deletes recordings older than KEEP_AUDIO_DAYS (a few at a time); the report text stays. */
export async function cleanOldRecordings() {
  const cutoff = Timestamp.fromMillis(Date.now() - KEEP_AUDIO_DAYS * 86_400_000)
  const old = await getDocs(query(collection(db, 'reportAudio'), where('createdAt', '<', cutoff), limit(20)))
  if (old.empty) return
  const b = writeBatch(db)
  for (const d of old.docs) {
    b.delete(d.ref)
    b.update(doc(db, 'reports', d.id), { audioDeleted: true })
  }
  await b.commit()
}
