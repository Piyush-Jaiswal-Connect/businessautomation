import { useCallback, useEffect, useRef, useState } from 'react'
import { InstallCard, LangToggle, TestBanner } from '../components/Common'
import { Icon } from '../components/Icon'
import { getLocation, useWorkerStore, type SentReport } from '../data/WorkerStore'
import { useLang } from '../i18n'
import { fmtTime, mmss } from '../lib/format'
import { useOnline, useRecorder } from '../lib/hooks'
import type { Attendance, GeoPoint } from '../types'
import './worker.css'

const CANCEL_SECONDS = 5 // time to cancel after stopping, then the report sends by itself
const MIN_SECONDS = 2 // shorter recordings are almost always a mistaken tap

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
        {/* A site is shown only if the owner assigned one; workers move between sites during the day. */}
        {assignment && site && (
          <section className="w-site" aria-label={t('todaySite')}>
            <div className="w-label">{t('todaySite')}</div>
            <div className="w-site-name">{tx(site.name)}</div>
            <div className="w-task">
              <span className="w-label">{t('todayWork')}:</span> {tx(assignment.task)}
            </div>
          </section>
        )}

        <AttendanceBlock
          attendance={attendance ?? undefined}
          locating={store.locating}
          onCheckIn={() => store.checkIn(worker.id, assignment && site ? assignment.siteId : null, store.settings.askLocation)}
          onCheckOut={() => attendance && store.checkOut(attendance.id)}
        />

        {store.error && (
          <div className="w-error" role="alert">
            <Icon name="alert" /> {t('sendFailed')}
          </div>
        )}

        <VoiceBlock onSend={(r) => store.sendReport(worker.id, r)} />

        <SentList reports={store.sentToday} />

        <InstallCard />
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
        <span className="w-big-sub">{locating ? t('gettingLocation') : t('startWorkHint')}</span>
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

interface ReadyReport {
  blob: Blob
  durationSec: number
  location: GeoPoint | null
}

/** Tap mic → speak → tap stop → sends by itself after a few seconds (with a cancel button). */
function VoiceBlock({ onSend }: { onSend: (r: ReadyReport) => void }) {
  const { t } = useLang()
  const [countdown, setCountdown] = useState<number | null>(null)
  const [notice, setNotice] = useState<'sent' | 'tooShort' | null>(null)
  const pending = useRef<{ blob: Blob; seconds: number } | null>(null)
  const location = useRef<Promise<GeoPoint | null> | null>(null)
  const timer = useRef<number | undefined>(undefined)

  const flash = (n: 'sent' | 'tooShort') => {
    setNotice(n)
    window.setTimeout(() => setNotice(null), 5000)
  }

  const onFinished = useCallback((blob: Blob, seconds: number) => {
    if (seconds < MIN_SECONDS) {
      flash('tooShort')
      return
    }
    pending.current = { blob, seconds }
    setCountdown(CANCEL_SECONDS)
  }, [])

  const { state, start, stop, reset } = useRecorder(onFinished)

  // Count down, then send.
  useEffect(() => {
    if (countdown === null) return
    if (countdown > 0) {
      timer.current = window.setTimeout(() => setCountdown((c) => (c === null ? null : c - 1)), 1000)
      return () => window.clearTimeout(timer.current)
    }
    const p = pending.current
    pending.current = null
    // Location was requested when recording started; wait at most 3 more seconds for it.
    const loc = Promise.race([location.current ?? Promise.resolve(null), new Promise<null>((r) => setTimeout(() => r(null), 3000))])
    loc.then((l) => {
      if (p) onSend({ blob: p.blob, durationSec: p.seconds, location: l })
      setCountdown(null)
      reset()
      flash('sent')
    })
  }, [countdown, onSend, reset])

  const begin = () => {
    setNotice(null)
    location.current = getLocation() // only at this moment, never in the background
    start()
  }

  const cancel = () => {
    window.clearTimeout(timer.current)
    pending.current = null
    setCountdown(null)
    reset()
  }

  if (state.kind === 'recording') {
    return (
      <>
        <button className="w-big w-big-red" onClick={stop}>
          <span className="w-big-icon w-pulse"><Icon name="stop" size={40} /></span>
          <span className="w-big-text">
            {t('stop')} <span className="w-timer">{mmss(state.seconds)}</span>
          </span>
          <span className="w-big-sub">{t('recordingNow')}</span>
        </button>
        <p className="w-hint">{t('reportHint')}</p>
      </>
    )
  }

  if (countdown !== null) {
    return (
      <section className="w-sending" role="status">
        <div className="w-sending-text">{t('sendingIn', { n: Math.max(countdown, 0) })}</div>
        <button className="w-btn w-btn-plain" onClick={cancel} disabled={countdown <= 0}>
          <Icon name="x" /> {t('cancelSend')}
        </button>
      </section>
    )
  }

  return (
    <>
      {notice === 'sent' && (
        <div className="w-sent" role="status">
          <Icon name="check" size={28} /> {navigator.onLine ? t('updateSent') : t('savedOnPhone')}
        </div>
      )}
      {notice === 'tooShort' && (
        <div className="w-error" role="alert">
          <Icon name="alert" /> {t('tooShort')}
        </div>
      )}
      <button className="w-big w-big-blue" onClick={begin}>
        <span className="w-big-icon"><Icon name="mic" size={44} /></span>
        <span className="w-big-text">{t('sendWorkUpdate')}</span>
        <span className="w-big-sub">{t('reportHint')}</span>
      </button>
      {state.kind === 'error' && (
        <div className="w-error" role="alert">
          <Icon name="alert" /> {state.reason === 'denied' ? t('micDenied') : t('micUnavailable')}
        </div>
      )}
    </>
  )
}

function SentList({ reports }: { reports: SentReport[] }) {
  const { t } = useLang()
  if (reports.length === 0) return null
  return (
    <section className="w-sentlist">
      <div className="w-label">{t('updatesToday', { n: reports.length })}</div>
      <ul>
        {reports.map((r) => (
          <li key={r.id}>
            <Icon name={r.pending ? 'cloudOff' : 'check'} size={20} />
            <span>{fmtTime(r.deviceTime)}</span>
            <span className={r.pending ? 'w-wait' : 'w-ok'}>{r.pending ? t('reportWaiting') : t('reportReached')}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}
