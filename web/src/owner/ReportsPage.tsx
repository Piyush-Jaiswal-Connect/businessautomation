import { useState } from 'react'
import { Icon } from '../components/Icon'
import { useStore } from '../data/OwnerStore'
import { useLang } from '../i18n'
import { fmtTime, mmss } from '../lib/format'
import { Chip, useNames } from './shared'

export function ReportsPage() {
  const store = useStore()
  const { t } = useLang()
  const { workerName, siteName } = useNames()
  const [showReviewed, setShowReviewed] = useState(false)

  const list = store.reports
    .filter((r) => showReviewed || !r.reviewed)
    .sort((a, b) => b.deviceTime - a.deviceTime)

  return (
    <>
      <p className="o-notice">{t('phase3Notice')}</p>
      <label className="o-check">
        <input type="checkbox" checked={showReviewed} onChange={(e) => setShowReviewed(e.target.checked)} />
        {t('showReviewed')}
      </label>
      {list.length === 0 && <p className="o-muted">{t('noReports')}</p>}
      <ul className="o-stack">
        {list.map((r) => {
          const job = store.jobs.find((j) => j.id === r.jobId)
          return (
            <li key={r.id} className={`o-item ${r.reviewed ? 'o-dim' : ''}`}>
              <div className="o-item-head">
                <div>
                  <div className="o-item-title">{workerName(r.workerId)}</div>
                  <div className="o-muted">{siteName(r.siteId)}</div>
                </div>
                {r.reviewed ? (
                  <Chip tone="green">{t('reviewed')}</Chip>
                ) : (
                  <Chip tone={r.syncStatus === 'received' ? 'amber' : r.syncStatus === 'submitted' ? 'blue' : 'grey'}>
                    {t(`status_${r.syncStatus}`).split(' · ')[0]}
                  </Chip>
                )}
              </div>
              <div className="o-times">
                <span>{t('recordedAt', { time: fmtTime(r.deviceTime) })}</span>
                {r.serverTime && <span>{t('receivedAt', { time: fmtTime(r.serverTime) })}</span>}
                <span>{mmss(r.durationSec)}</span>
              </div>

              {r.audioUrl ? (
                <audio className="o-audio" src={r.audioUrl} controls preload="metadata" />
              ) : (
                <div className="o-noaudio">
                  <Icon name="play" size={18} /> {t('demoNoAudio')}
                </div>
              )}

              <dl className="o-dl">
                <dt>{t('workerSaysWork')}</dt>
                <dd>{r.workClaim ? t(`claim_${r.workClaim}`) : t('notAnswered')}</dd>
                <dt>{t('workerSaysPayment')}</dt>
                <dd>{r.paymentClaim ? t(`claim_${r.paymentClaim}`) : t('notAnswered')}</dd>
                <dt>{t('transcript')}</dt>
                <dd className="o-muted">{t('transcriptLater')}</dd>
              </dl>

              <div className="o-actions">
                {job && r.workClaim === 'completed' && job.workStatus === 'worker_completed' && (
                  <button className="o-btn o-btn-green" onClick={() => store.approveCompletion(job.id)}>
                    {t('approveCompletion')}
                  </button>
                )}
                {!r.reviewed && (
                  <button className="o-btn" onClick={() => store.reviewReport(r.id)}>
                    <Icon name="check" size={18} /> {t('markReviewed')}
                  </button>
                )}
              </div>
            </li>
          )
        })}
      </ul>
    </>
  )
}
