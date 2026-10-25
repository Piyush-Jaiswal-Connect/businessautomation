// Owner's voice report inbox: each worker voice message as a card (site · work · payment), with the recording.
import { useEffect, useState } from 'react'
import { Icon } from '../components/Icon'
import { useStore } from '../data/OwnerStore'
import { KEEP_AUDIO_DAYS } from '../data/processor'
import { useLang } from '../i18n'
import { realAi } from '../lib/firebase'
import { fmtDate, fmtTime, mmss, rupees } from '../lib/format'
import type { PaymentSaid, Report, ReportAi, WorkSaid } from '../types'
import { Chip, useNames, type Tone } from './shared'

type Filter = 'review' | 'payment' | 'all'

const workTone: Record<WorkSaid, Tone> = { completed: 'green', in_progress: 'blue', problem: 'red', not_mentioned: 'grey' }
const payTone: Record<PaymentSaid, Tone> = { paid: 'green', partial: 'amber', unpaid: 'red', not_mentioned: 'grey' }

export const needsPaymentCheck = (r: Report) =>
  !!r.ai && (r.ai.paymentStatus === 'paid' || r.ai.paymentStatus === 'partial') && !r.paymentId

export function ReportsPage() {
  const store = useStore()
  const { t, tx } = useLang()
  const [filter, setFilter] = useState<Filter>('review')
  const [siteId, setSiteId] = useState('')

  const list = store.reports.filter((r) => {
    if (siteId && r.ai?.siteId !== siteId) return false
    if (filter === 'review') return !r.reviewed
    if (filter === 'payment') return !!r.ai && r.ai.paymentStatus !== 'not_mentioned'
    return true
  })

  return (
    <>
      <p className="o-notice o-small">{realAi ? t('aiOpenAppNote') : t('aiTestNote')}</p>
      <div className="o-toolbar o-wrap">
        {(['review', 'payment', 'all'] as Filter[]).map((f) => (
          <button key={f} className={`o-filter ${filter === f ? 'on' : ''}`} onClick={() => setFilter(f)}>
            {t(f === 'review' ? 'filterToReview' : f === 'payment' ? 'filterPayment' : 'filterAll')}
          </button>
        ))}
        <select className="o-select" value={siteId} onChange={(e) => setSiteId(e.target.value)} aria-label={t('site')}>
          <option value="">{t('filterAllSites')}</option>
          {store.sites.map((s) => (
            <option key={s.id} value={s.id}>{tx(s.name)}</option>
          ))}
        </select>
      </div>
      {list.length === 0 && <p className="o-muted">{store.reports.length ? t('allClear') : t('noReportsYet')}</p>}
      <ul className="o-stack">
        {list.map((r) => (
          <ReportCard key={r.id} r={r} />
        ))}
      </ul>
    </>
  )
}

export function ReportCard({ r }: { r: Report }) {
  const store = useStore()
  const { t, lang } = useLang()
  const { workerName, siteName } = useNames()
  const [mode, setMode] = useState<'view' | 'edit' | 'pay'>('view')
  const ai = r.ai
  const pick = (en: string, hi: string) => (lang === 'hi' ? hi || en : en || hi)
  const job = ai?.siteId ? store.jobs.find((j) => j.id === ai.siteId) : undefined

  return (
    <li className={`o-item ${r.reviewed ? 'o-dim' : ''}`}>
      <div className="o-item-head">
        <div>
          <div className="o-item-title">{workerName(r.workerId)}</div>
          <div className="o-muted o-small">
            {fmtDate(r.deviceTime)} · {fmtTime(r.deviceTime)} · {mmss(r.durationSec)}
            {r.location && (
              <>
                {' · '}
                <a className="o-link" href={`https://maps.google.com/?q=${r.location.lat},${r.location.lng}`} target="_blank" rel="noreferrer">
                  {t('location')}
                </a>
              </>
            )}
          </div>
        </div>
        {r.reviewed ? (
          <Chip tone="green">{t('reviewed')}</Chip>
        ) : (
          <Chip tone={r.status === 'failed' ? 'red' : r.status === 'processed' ? 'amber' : 'blue'}>{t(`ai_${r.status}`)}</Chip>
        )}
      </div>

      {ai && (
        <div className="o-report">
          <div className="o-report-row">
            <Icon name="site" size={18} />
            {ai.siteId ? (
              <strong>{siteName(ai.siteId)}</strong>
            ) : (
              <span className="o-amber">{t('unknownSite')}</span>
            )}
            {ai.placeText && <span className="o-muted o-small">{t('saidPlace', { place: ai.placeText })}</span>}
            {ai.confidence.site === 'low' && ai.siteId && <Chip tone="amber">⚠ {t('checkThis')}</Chip>}
          </div>
          <div className="o-report-row">
            <Icon name="report" size={18} />
            <span>{pick(ai.workEn, ai.workHi) || '—'}</span>
            <Chip tone={workTone[ai.workStatus]}>{t(`said_${ai.workStatus}`)}</Chip>
            {ai.confidence.work === 'low' && ai.workStatus !== 'not_mentioned' && <Chip tone="amber">⚠ {t('checkThis')}</Chip>}
          </div>
          <div className="o-report-row">
            <Icon name="rupee" size={18} />
            <Chip tone={payTone[ai.paymentStatus]}>{t(`paySaid_${ai.paymentStatus}`)}</Chip>
            {ai.amount !== null && <strong>{rupees(ai.amount)}</strong>}
            {ai.paymentStatus !== 'not_mentioned' && <span className="o-muted o-small">({t('workerSays')})</span>}
            {ai.confidence.payment === 'low' && ai.paymentStatus !== 'not_mentioned' && <Chip tone="amber">⚠ {t('checkThis')}</Chip>}
            {r.paymentId && <Chip tone="green">{t('paymentVerifiedChip')}</Chip>}
          </div>
          {(ai.followUpEn || ai.followUpHi) && (
            <div className="o-report-row">
              <Icon name="clock" size={18} />
              <span className="o-grow">
                <span className="o-muted">{t('followUp')}:</span> {pick(ai.followUpEn, ai.followUpHi)}
              </span>
            </div>
          )}
          {ai.audioQuality !== 'clear' && <div className="o-amber o-small">⚠ {t(ai.audioQuality === 'silent' ? 'silentAudio' : 'noisyAudio')}</div>}
          {r.edited && <div className="o-muted o-small">✎ {t('correctedByOwner')}</div>}
        </div>
      )}

      {r.status === 'failed' && <div className="o-red o-small">{t('ai_failed')}: {r.aiError}</div>}

      {r.audioDeleted ? (
        <div className="o-muted o-small">{t('audioDeletedNote', { n: KEEP_AUDIO_DAYS })}</div>
      ) : (
        <AudioPlayer reportId={r.id} />
      )}

      {ai && (ai.transcript || ai.translationEn) && (
        <details className="o-history">
          <summary>{t('transcriptLabel')}</summary>
          <p className="o-transcript" lang="hi">{ai.transcript}</p>
          {ai.translationEn && (
            <p className="o-transcript">
              <span className="o-muted">{t('translationLabel')}:</span> {ai.translationEn}
            </p>
          )}
        </details>
      )}

      {mode === 'edit' && ai && <EditForm r={r} ai={ai} onDone={() => setMode('view')} />}
      {mode === 'pay' && ai?.siteId && (
        <PayForm
          initial={ai.amount}
          onCancel={() => setMode('view')}
          onSave={(amount, evidence) => store.addPayment(ai.siteId!, amount, evidence, r.id).then(() => setMode('view'), () => {})}
        />
      )}

      {mode === 'view' && (
        <div className="o-actions">
          {r.status === 'failed' && <button className="o-btn" onClick={() => store.retryReport(r.id)}><Icon name="redo" size={18} /> {t('retry')}</button>}
          {ai && ai.siteId && needsPaymentCheck(r) && (
            <button className="o-btn o-btn-green" onClick={() => setMode('pay')}>
              {ai.amount ? t('verifyPayment', { amount: ai.amount.toLocaleString('en-IN') }) : t('recordPaymentShort')}
            </button>
          )}
          {ai?.siteId && ai.workStatus === 'completed' && job?.workStatus !== 'owner_approved' && (
            <button className="o-btn o-btn-green" onClick={() => store.approveFinished(ai.siteId!)}>{t('approveCompletion')}</button>
          )}
          {ai?.siteId && ai.workStatus === 'completed' && job?.workStatus === 'owner_approved' && <Chip tone="green">{t('workApprovedChip')}</Chip>}
          {ai && <button className="o-btn" onClick={() => setMode('edit')}>✎ {t('correctLabel')}</button>}
          <button className="o-btn" onClick={() => store.reviewReport(r.id, !r.reviewed)}>
            <Icon name="check" size={18} /> {r.reviewed ? t('filterToReview') : t('markReviewed')}
          </button>
        </div>
      )}
    </li>
  )
}

/** Loads the recording only when the owner wants to hear it (saves data and free quota). */
function AudioPlayer({ reportId }: { reportId: string }) {
  const store = useStore()
  const { t } = useLang()
  const [url, setUrl] = useState<string | null>(null)
  const [state, setState] = useState<'idle' | 'loading' | 'missing'>('idle')

  useEffect(() => () => {
    if (url) URL.revokeObjectURL(url)
  }, [url])

  if (url) {
    return (
      <audio
        className="o-audio"
        src={url}
        controls
        preload="auto"
        onLoadedMetadata={(e) => {
          // Phone (WebM) recordings carry no length; jumping to the end once makes the browser work it out.
          const a = e.currentTarget
          if (a.duration === Infinity) {
            a.currentTime = 1e9
            a.addEventListener('timeupdate', function back() {
              a.removeEventListener('timeupdate', back)
              a.currentTime = 0
              void a.play()
            })
          } else {
            void a.play()
          }
        }}
      />
    )
  }
  return (
    <button
      className="o-btn o-play"
      disabled={state !== 'idle'}
      onClick={async () => {
        setState('loading')
        const blob = await store.loadAudio(reportId).catch(() => null)
        if (blob) setUrl(URL.createObjectURL(blob))
        else setState('missing')
      }}
    >
      <Icon name="play" size={18} /> {state === 'loading' ? t('loading') : t('playRecording')}
    </button>
  )
}

function EditForm({ r, ai, onDone }: { r: Report; ai: ReportAi; onDone: () => void }) {
  const store = useStore()
  const { t, tx } = useLang()
  const [v, setV] = useState(ai)
  const set = <K extends keyof ReportAi>(k: K, val: ReportAi[K]) => setV((x) => ({ ...x, [k]: val }))

  return (
    <form
      className="o-form"
      onSubmit={(e) => {
        e.preventDefault()
        // Fields the owner fixes count as checked.
        const confidence = { site: 'high', work: 'high', payment: 'high' } as ReportAi['confidence']
        store.editReport(r, { ...v, confidence }).then(onDone, () => {})
      }}
    >
      <label>
        {t('site')}
        <select value={v.siteId ?? ''} onChange={(e) => set('siteId', e.target.value || null)}>
          <option value="">{t('otherPlace')}</option>
          {store.sites.map((s) => (
            <option key={s.id} value={s.id}>{tx(s.name)}</option>
          ))}
        </select>
      </label>
      <label>
        {t('taskEn')}
        <input value={v.workEn} onChange={(e) => set('workEn', e.target.value)} maxLength={200} />
      </label>
      <label>
        {t('taskHi')}
        <input value={v.workHi} onChange={(e) => set('workHi', e.target.value)} maxLength={200} lang="hi" />
      </label>
      <label>
        {t('workStatusLabel')}
        <select value={v.workStatus} onChange={(e) => set('workStatus', e.target.value as WorkSaid)}>
          {(['completed', 'in_progress', 'problem', 'not_mentioned'] as WorkSaid[]).map((w) => (
            <option key={w} value={w}>{t(`said_${w}`)}</option>
          ))}
        </select>
      </label>
      <label>
        {t('workerSaysPayment')}
        <select value={v.paymentStatus} onChange={(e) => set('paymentStatus', e.target.value as PaymentSaid)}>
          {(['paid', 'partial', 'unpaid', 'not_mentioned'] as PaymentSaid[]).map((p) => (
            <option key={p} value={p}>{t(`paySaid_${p}`)}</option>
          ))}
        </select>
      </label>
      <label>
        {t('amount')}
        <input
          inputMode="numeric"
          value={v.amount ?? ''}
          onChange={(e) => {
            const n = Number(e.target.value.replace(/[^0-9]/g, ''))
            set('amount', n > 0 ? n : null)
          }}
        />
      </label>
      <label>
        {t('followUpEn')}
        <input value={v.followUpEn} onChange={(e) => set('followUpEn', e.target.value)} maxLength={200} />
      </label>
      <label>
        {t('followUpHi')}
        <input value={v.followUpHi} onChange={(e) => set('followUpHi', e.target.value)} maxLength={200} lang="hi" />
      </label>
      <div className="o-actions">
        <button className="o-btn o-btn-green" type="submit">{t('save')}</button>
        <button className="o-btn" type="button" onClick={onDone}>{t('cancel')}</button>
      </div>
    </form>
  )
}

/** Owner records money they have actually checked (UPI, cash in hand, cheque…). */
export function PayForm({ initial, max, onSave, onCancel }: {
  initial: number | null
  max?: number
  onSave: (amount: number, evidence: string) => void
  onCancel: () => void
}) {
  const { t } = useLang()
  const [amount, setAmount] = useState(initial ? String(initial) : '')
  const [evidence, setEvidence] = useState('')
  const n = Number(amount)
  const tooBig = max !== undefined && max > 0 && n > max
  const ok = Number.isFinite(n) && n > 0 && !tooBig && evidence.trim().length >= 2

  return (
    <form
      className="o-form"
      onSubmit={(e) => {
        e.preventDefault()
        if (ok) onSave(Math.round(n), evidence.trim())
      }}
    >
      <label>
        {t('amount')}
        <input inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^0-9]/g, ''))} required />
      </label>
      {tooBig && <div className="o-red o-small">{t('amountTooBig')}</div>}
      <label>
        {t('evidence')}
        <input value={evidence} onChange={(e) => setEvidence(e.target.value)} maxLength={300} required />
      </label>
      <div className="o-actions">
        <button className="o-btn o-btn-green" type="submit" disabled={!ok}>{t('save')}</button>
        <button className="o-btn" type="button" onClick={onCancel}>{t('cancel')}</button>
      </div>
    </form>
  )
}
