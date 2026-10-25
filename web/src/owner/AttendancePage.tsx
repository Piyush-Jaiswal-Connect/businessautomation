import { useState } from 'react'
import { useStore } from '../data/OwnerStore'
import { useLang } from '../i18n'
import { at, fmtTime, hhmm } from '../lib/format'
import { awaitsApproval } from '../lib/summary'
import type { Attendance, AttendanceStatus } from '../types'
import { Chip, useNames, type Tone } from './shared'

const tones: Record<AttendanceStatus, Tone> = {
  pending_sync: 'grey',
  submitted: 'blue',
  received: 'amber',
  approved: 'green',
  rejected: 'red',
}

type Filter = 'all' | 'waiting' | 'absent'

export function AttendancePage() {
  const store = useStore()
  const { t } = useLang()
  const { workerName, workerTrade, siteName } = useNames()
  const [filter, setFilter] = useState<Filter>('all')

  const todays = store.attendance.filter((a) => a.date === store.today)
  const attendanceSite = (workerId: string) => todays.find((a) => a.workerId === workerId)?.siteId
  const rows = store.workers
    .filter((w) => w.active)
    .map((w) => ({
      worker: w,
      attendance: todays.find((a) => a.workerId === w.id),
      siteId: attendanceSite(w.id) ?? store.assignments.find((a) => a.workerId === w.id)?.siteId,
    }))
    // waiting for you first, then present, then absent
    .sort((a, b) => rank(a.attendance) - rank(b.attendance) || (a.attendance?.deviceTime ?? 0) - (b.attendance?.deviceTime ?? 0))
    .filter((r) => (filter === 'waiting' ? r.attendance && awaitsApproval(r.attendance) : filter === 'absent' ? !r.attendance : true))

  const receivedIds = todays.filter((a) => a.status === 'received').map((a) => a.id)

  return (
    <>
      <div className="o-toolbar">
        {(['all', 'waiting', 'absent'] as Filter[]).map((f) => (
          <button key={f} className={`o-filter ${filter === f ? 'on' : ''}`} onClick={() => setFilter(f)}>
            {t(f === 'all' ? 'filterAll' : f === 'waiting' ? 'filterWaiting' : 'filterAbsent')}
          </button>
        ))}
      </div>
      {receivedIds.length > 1 && (
        <button className="o-btn o-btn-green o-wide" onClick={() => receivedIds.forEach((id) => store.approve(id))}>
          {t('approveAllReceived', { n: receivedIds.length })}
        </button>
      )}
      {rows.length === 0 && filter === 'all' && <p className="o-muted">{t('noWorkersYet')}</p>}
      <ul className="o-stack">
        {rows.map(({ worker, attendance, siteId }) => (
          <li key={worker.id} className="o-item">
            <div className="o-item-head">
              <div>
                <div className="o-item-title">{workerName(worker.id)}</div>
                <div className="o-muted">
                  {workerTrade(worker.id)} · {siteId ? siteName(siteId) : '—'}
                </div>
              </div>
              {attendance ? <Chip tone={tones[attendance.status]}>{t(`status_${attendance.status}`)}</Chip> : <Chip tone="grey">{t('absent')}</Chip>}
            </div>
            {attendance && <AttendanceDetail a={attendance} />}
          </li>
        ))}
      </ul>
    </>
  )
}

function rank(a?: Attendance) {
  if (!a) return 3
  if (awaitsApproval(a)) return 0
  if (a.status === 'pending_sync') return 1
  return 2
}

function AttendanceDetail({ a }: { a: Attendance }) {
  const store = useStore()
  const { t } = useLang()
  const [editing, setEditing] = useState(false)
  const shownTime = a.correctedTime ?? a.deviceTime

  return (
    <>
      <div className="o-times">
        <span>{t('checkInAt', { time: fmtTime(shownTime) })}</span>
        {a.checkOutTime && <span>{t('checkOutAt', { time: fmtTime(a.checkOutTime) })}</span>}
        {a.correctedTime && <span className="o-amber">{t('correctedNote', { time: fmtTime(a.deviceTime) })}</span>}
        {a.location && (
          <a className="o-link" href={`https://maps.google.com/?q=${a.location.lat},${a.location.lng}`} target="_blank" rel="noreferrer">
            {t('location')} ±{a.location.accuracy} m — {t('openMap')}
          </a>
        )}
      </div>

      {editing ? (
        <CorrectForm
          initial={hhmm(shownTime)}
          onCancel={() => setEditing(false)}
          onSave={(time, reason) => {
            store.correct(a.id, at(a.date, time), reason)
            setEditing(false)
          }}
        />
      ) : (
        a.status !== 'pending_sync' &&
        a.status !== 'submitted' && (
          <div className="o-actions">
            {a.status === 'received' && (
              <>
                <button className="o-btn o-btn-green" onClick={() => store.approve(a.id)}>{t('approve')}</button>
                <button className="o-btn o-btn-red" onClick={() => store.reject(a.id)}>{t('reject')}</button>
              </>
            )}
            <button className="o-btn" onClick={() => setEditing(true)}>{t('correct')}</button>
          </div>
        )
      )}

      <details className="o-history">
        <summary>{t('history')}</summary>
        <ul>
          {a.history.map((h, i) => (
            <li key={i}>
              {fmtTime(h.at)} — {h.by}: {h.action.replace('_', ' ')}
              {h.note && <em> “{h.note}”</em>}
            </li>
          ))}
        </ul>
      </details>
    </>
  )
}

function CorrectForm({ initial, onSave, onCancel }: { initial: string; onSave: (time: string, reason: string) => void; onCancel: () => void }) {
  const { t } = useLang()
  const [time, setTime] = useState(initial)
  const [reason, setReason] = useState('')
  const ok = /^\d\d:\d\d$/.test(time) && reason.trim().length >= 3

  return (
    <form
      className="o-form"
      onSubmit={(e) => {
        e.preventDefault()
        if (ok) onSave(time, reason.trim())
      }}
    >
      <label>
        {t('newTime')}
        <input type="time" value={time} onChange={(e) => setTime(e.target.value)} required />
      </label>
      <label>
        {t('reasonRequired')}
        <input value={reason} onChange={(e) => setReason(e.target.value)} required minLength={3} />
      </label>
      <div className="o-actions">
        <button className="o-btn o-btn-green" type="submit" disabled={!ok}>{t('save')}</button>
        <button className="o-btn" type="button" onClick={onCancel}>{t('cancel')}</button>
      </div>
    </form>
  )
}
