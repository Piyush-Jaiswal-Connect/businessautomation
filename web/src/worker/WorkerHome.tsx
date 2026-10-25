import { useState } from 'react'
import { LangToggle, TestBanner } from '../components/Common'
import { Icon } from '../components/Icon'
import { useWorkerStore } from '../data/WorkerStore'
import { useLang } from '../i18n'
import { fmtTime, mmss } from '../lib/format'
import { useOnline, useRecorder } from '../lib/hooks'
import type { Attendance, PaymentClaim, WorkClaim } from '../types'
import './worker.css'

// Voice reports are switched on in Phase 3 (needs file storage).
const VOICE_ENABLED = false

export function WorkerHome() {
  const store = useWorkerStore()
  const { t, tx, lang } = useLang()
  const online = useOnline()
  const { worker, assignment, site, attendance } = store
  if (!worker) return null

  return (
    <div className="worker">
      <header className="w-header">
        <div className="w-hello">{t('hello', { name: lang === 'hi' && worker.nameHi ? worker.nameHi : worker.name })}</div>
        <LangToggle />
      </header>
      <TestBanner />
      {!online && (
        <div className="w-offline" role="status">
          <Icon name="cloudOff" /> {t('noNetwork')}
        </div>
      )}

      <main className="w-main">
        {assignment && site ? (
          <section className="w-site" aria-label={t('todaySite')}>
            <div className="w-label">{t('todaySite')}</div>
            <div className="w-site-name">{tx(site.name)}</div>
            <div className="w-task">
              <span className="w-label">{t('todayWork')}:</span> {tx(assignment.task)}
            </div>
          </section>
        ) : (
          <section className="w-site w-nosite">
            <Icon name="alert" size={32} />
            {t('noSiteToday')}
          </section>
        )}

        {/* Attendance already marked today stays visible even if the owner changed the site since. */}
        {((assignment && site) || attendance) && (
          <AttendanceBlock
            attendance={attendance ?? undefined}
            locating={store.locating}
            onCheckIn={() => assignment && store.checkIn(worker.id, assignment.siteId, store.settings.askLocation)}
            onCheckOut={() => attendance && store.checkOut(attendance.id)}
          />
        )}

        {store.error && (
          <div className="w-error" role="alert">
            <Icon name="alert" /> {t('checkInFailed')}
          </div>
        )}

        {assignment && site && (VOICE_ENABLED ? (
          <VoiceBlock onSend={() => {}} />
        ) : (
          <div className="w-soon">
            <Icon name="mic" size={28} /> {t('voiceSoon')}
          </div>
        ))}
      </main>

      <footer className="w-footer">
        <small>{t('appName')}</small>
      </footer>
    </div>
  )
}

function AttendanceBlock({ attendance, locating, onCheckIn, onCheckOut }: {
  attendance?: Attendance
  locating: boolean
  onCheckIn: () => void
  onCheckOut: () => void
}) {
  const { t } = useLang()
  const [confirmOut, setConfirmOut] = useState(false)

  if (!attendance) {
    return (
      <button className="w-big w-big-green" onClick={onCheckIn} disabled={locating}>
        <span className="w-big-icon"><Icon name="check" size={44} /></span>
        <span className="w-big-text">{t('markAttendance')}</span>
        {locating && <span className="w-big-sub">{t('gettingLocation')}</span>}
      </button>
    )
  }

  const statusLine = {
    pending_sync: t('savedOnPhone'),
    submitted: t('sending'),
    received: t('waitingApproval'),
    approved: t('approvedByOwner'),
    rejected: t('rejectedByOwner'),
  }[attendance.status]

  return (
    <section className={`w-done w-done-${attendance.status}`} role="status">
      <div className="w-done-head">
        <span className="w-done-tick"><Icon name={attendance.status === 'rejected' ? 'x' : 'check'} size={34} /></span>
        <div>
          <div className="w-done-title">{t('attendanceDone')}</div>
          <div className="w-done-time">{fmtTime(attendance.correctedTime ?? attendance.deviceTime)}</div>
        </div>
      </div>
      <div className="w-done-status">
        {attendance.status === 'pending_sync' && <Icon name="cloudOff" size={20} />}
        {attendance.status === 'received' && <Icon name="clock" size={20} />}
        {statusLine}
      </div>

      {attendance.checkOutTime ? (
        <div className="w-left">{t('leftAt', { time: fmtTime(attendance.checkOutTime) })}</div>
      ) : confirmOut ? (
        <div className="w-confirm">
          <button className="w-btn w-btn-dark" onClick={onCheckOut}><Icon name="exit" /> {t('checkOut')}</button>
          <button className="w-btn w-btn-plain" onClick={() => setConfirmOut(false)}>{t('cancel')}</button>
        </div>
      ) : (
        <button className="w-btn w-btn-plain" onClick={() => setConfirmOut(true)}>
          <Icon name="exit" /> {t('checkOut')}
        </button>
      )}
    </section>
  )
}

export interface NewReport {
  durationSec: number
  audioUrl: string | null
  workClaim: WorkClaim
  paymentClaim: PaymentClaim
}

function VoiceBlock({ onSend }: { onSend: (r: NewReport) => void }) {
  const { t } = useLang()
  const { state, start, stop, reset } = useRecorder()
  const [workClaim, setWorkClaim] = useState<WorkClaim>(null)
  const [paymentClaim, setPaymentClaim] = useState<PaymentClaim>(null)
  const [sent, setSent] = useState(false)

  const send = () => {
    if (state.kind !== 'done') return
    onSend({ durationSec: Math.round(state.seconds), audioUrl: state.url, workClaim, paymentClaim })
    reset(true) // the sent report keeps using this audio
    setWorkClaim(null)
    setPaymentClaim(null)
    setSent(true)
    window.setTimeout(() => setSent(false), 4000)
  }

  if (state.kind === 'recording') {
    return (
      <button className="w-big w-big-red" onClick={stop}>
        <span className="w-big-icon w-pulse"><Icon name="stop" size={40} /></span>
        <span className="w-big-text">
          {t('stop')} <span className="w-timer">{mmss(state.seconds)}</span>
        </span>
        <span className="w-big-sub">{t('recordingNow')}</span>
      </button>
    )
  }

  if (state.kind === 'done') {
    return (
      <section className="w-review">
        <audio className="w-audio" src={state.url} controls preload="metadata" />
        <Question
          label={t('workDoneQ')}
          value={workClaim}
          onChange={setWorkClaim}
          options={[
            ['completed', t('yesFinished')],
            ['in_progress', t('stillGoing')],
          ]}
        />
        <Question
          label={t('paidQ')}
          value={paymentClaim}
          onChange={setPaymentClaim}
          options={[
            ['paid', t('yesPaid')],
            ['unpaid', t('notPaid')],
          ]}
        />
        <button className="w-big w-big-blue w-big-short" onClick={send}>
          <span className="w-big-text">{t('send')}</span>
        </button>
        <button className="w-btn w-btn-plain" onClick={() => reset()}>
          <Icon name="redo" /> {t('recordAgain')}
        </button>
      </section>
    )
  }

  return (
    <>
      {sent && (
        <div className="w-sent" role="status">
          <Icon name="check" size={28} /> {navigator.onLine ? t('updateSent') : t('savedOnPhone')}
        </div>
      )}
      <button className="w-big w-big-blue" onClick={start}>
        <span className="w-big-icon"><Icon name="mic" size={44} /></span>
        <span className="w-big-text">{t('sendWorkUpdate')}</span>
        <span className="w-big-sub">{t('tapAndSpeak')}</span>
      </button>
      {state.kind === 'error' && (
        <div className="w-error" role="alert">
          <Icon name="alert" /> {state.reason === 'denied' ? t('micDenied') : t('micUnavailable')}
        </div>
      )}
    </>
  )
}

function Question<V extends string>({ label, value, onChange, options }: {
  label: string
  value: V | null
  onChange: (v: V | null) => void
  options: [V, string][]
}) {
  const { t } = useLang()
  return (
    <fieldset className="w-q">
      <legend>
        {label} <span className="w-optional">({t('optional')})</span>
      </legend>
      <div className="w-q-row">
        {options.map(([v, text]) => (
          <button key={v} type="button" className={`w-chip ${value === v ? 'on' : ''}`} aria-pressed={value === v} onClick={() => onChange(value === v ? null : v)}>
            {value === v && <Icon name="check" size={20} />} {text}
          </button>
        ))}
      </div>
    </fieldset>
  )
}
