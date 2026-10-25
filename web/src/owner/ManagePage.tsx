// Owner: add workers and sites, set each worker's site and work, connect/disconnect phones.
import qrcode from 'qrcode-generator'
import { useEffect, useState } from 'react'
import type { PushState } from '../lib/push'
import { signOutAndHome } from '../auth/AuthScreens'
import { InstallCard } from '../components/Common'
import { useStore } from '../data/OwnerStore'
import { tradeNames, useLang } from '../i18n'
import { auth } from '../lib/firebase'
import { fmtDate, fmtTime } from '../lib/format'
import type { Assignment, Trade, Worker } from '../types'
import { Chip } from './shared'

const trades = Object.keys(tradeNames) as Trade[]

export function ManagePage() {
  const store = useStore()
  const { t } = useLang()
  const [showInactive, setShowInactive] = useState(false)
  const workers = store.workers.filter((w) => w.active || showInactive)

  return (
    <>
      <section className="o-panel">
        <h2>{t('workersTitle')}</h2>
        <AddWorker />
      </section>
      <ul className="o-stack">
        {workers.map((w) => (
          <WorkerCard key={w.id} worker={w} />
        ))}
      </ul>
      {store.workers.some((w) => !w.active) && (
        <label className="o-check">
          <input type="checkbox" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} />
          {t('inactive')}
        </label>
      )}

      <section className="o-panel">
        <h2>{t('sitesTitle')}</h2>
        <AddSite />
        <ul className="o-list o-sites">
          {store.sites.map((s) => (
            <li key={s.id}>
              <span>
                {s.name.en}
                {s.name.hi && <span className="o-muted"> · {s.name.hi}</span>}
              </span>
              <Chip tone={s.active ? 'green' : 'grey'}>{t(s.active ? 'siteActive' : 'siteInactive')}</Chip>
              <button className="o-btn" onClick={() => store.setSiteActive(s, !s.active)}>
                {t(s.active ? 'makeInactive' : 'makeActive')}
              </button>
            </li>
          ))}
        </ul>
      </section>

      <InstallCard dark />

      <NotifyCard />

      <section className="o-panel">
        <h2>{t('settingsTitle')}</h2>
        <label className="o-check o-check-top">
          <input type="checkbox" checked={store.settings.askLocation} onChange={(e) => store.setAskLocation(e.target.checked)} />
          <span>
            {t('askLocation')}
            <span className="o-muted o-small o-block">{t('askLocationNote')}</span>
          </span>
        </label>
        <p className="o-muted o-small">{t('signedInAs', { email: auth.currentUser?.email ?? '' })}</p>
        <button className="o-btn" onClick={signOutAndHome}>{t('signOut')}</button>
      </section>
    </>
  )
}

function AddWorker() {
  const store = useStore()
  const { t, tx } = useLang()
  const [name, setName] = useState('')
  const [nameHi, setNameHi] = useState('')
  const [trade, setTrade] = useState<Trade>('helper')

  return (
    <form
      className="o-form"
      onSubmit={(e) => {
        e.preventDefault()
        if (!name.trim()) return
        store.addWorker(name.trim(), nameHi.trim(), trade)
        setName('')
        setNameHi('')
      }}
    >
      <label>
        {t('nameEn')}
        <input value={name} onChange={(e) => setName(e.target.value)} maxLength={60} required />
      </label>
      <label>
        {t('nameHiOpt')}
        <input value={nameHi} onChange={(e) => setNameHi(e.target.value)} maxLength={60} lang="hi" />
      </label>
      <label>
        {t('trade')}
        <select value={trade} onChange={(e) => setTrade(e.target.value as Trade)}>
          {trades.map((tr) => (
            <option key={tr} value={tr}>{tx(tradeNames[tr])}</option>
          ))}
        </select>
      </label>
      <div className="o-actions">
        <button className="o-btn o-btn-green" type="submit" disabled={!name.trim()}>{t('addWorker')}</button>
      </div>
    </form>
  )
}

function AddSite() {
  const store = useStore()
  const { t } = useLang()
  const [name, setName] = useState('')
  const [nameHi, setNameHi] = useState('')
  const [area, setArea] = useState('')
  const [areaHi, setAreaHi] = useState('')
  const ok = name.trim() && area.trim()

  return (
    <form
      className="o-form"
      onSubmit={(e) => {
        e.preventDefault()
        if (!ok) return
        store.addSite({ en: name.trim(), hi: nameHi.trim() }, { en: area.trim(), hi: areaHi.trim() })
        setName('')
        setNameHi('')
        setArea('')
        setAreaHi('')
      }}
    >
      <label>
        {t('siteNameEn')}
        <input value={name} onChange={(e) => setName(e.target.value)} maxLength={120} placeholder="Ghansoli — Flat 502" required />
      </label>
      <label>
        {t('siteNameHi')}
        <input value={nameHi} onChange={(e) => setNameHi(e.target.value)} maxLength={120} lang="hi" placeholder="घणसोली — फ्लैट 502" />
      </label>
      <label>
        {t('areaEn')}
        <input value={area} onChange={(e) => setArea(e.target.value)} maxLength={120} placeholder="Ghansoli" required />
      </label>
      <label>
        {t('areaHi')}
        <input value={areaHi} onChange={(e) => setAreaHi(e.target.value)} maxLength={120} lang="hi" />
      </label>
      <div className="o-actions">
        <button className="o-btn o-btn-green" type="submit" disabled={!ok}>{t('addSite')}</button>
      </div>
    </form>
  )
}

function WorkerCard({ worker }: { worker: Worker }) {
  const store = useStore()
  const { t, tx, lang } = useLang()
  const current = store.assignments.find((a) => a.workerId === worker.id)
  const [pairing, setPairing] = useState<{ code: string; expiresAt: number; pairedAtBefore: number | null } | null>(null)
  // Hide the code as soon as a phone has used it.
  const showPairing = pairing && worker.pairedAt === pairing.pairedAtBefore

  return (
    <li className={`o-item ${worker.active ? '' : 'o-dim'}`}>
      <div className="o-item-head">
        <div>
          <div className="o-item-title">
            {lang === 'hi' && worker.nameHi ? worker.nameHi : worker.name}
          </div>
          <div className="o-muted">{tx(tradeNames[worker.trade])}</div>
        </div>
        {!worker.active ? (
          <Chip tone="grey">{t('inactive')}</Chip>
        ) : worker.deviceUid ? (
          <Chip tone="green">{t('phonePaired', { date: worker.pairedAt ? fmtDate(worker.pairedAt) : '' })}</Chip>
        ) : (
          <Chip tone="amber">{t('phoneNotPaired')}</Chip>
        )}
      </div>

      {worker.active && (
        // Re-created when the saved assignment changes, so the fields start from it.
        <AssignmentForm key={`${current?.siteId}|${current?.task.en}|${current?.task.hi}`} worker={worker} current={current} />
      )}

      {showPairing && <PairingCode code={pairing.code} expiresAt={pairing.expiresAt} onClose={() => setPairing(null)} />}

      <div className="o-actions">
        {worker.active && !showPairing && (
          <button className="o-btn" onClick={() => store.createPairing(worker.id).then((p) => setPairing({ ...p, pairedAtBefore: worker.pairedAt }), () => {})}>
            {worker.deviceUid ? t('newPhone') : t('pairPhone')}
          </button>
        )}
        {worker.active ? (
          <button
            className="o-btn o-btn-red"
            onClick={() => {
              if (window.confirm(t('deactivateConfirm', { name: worker.name }))) store.setWorkerActive(worker, false)
            }}
          >
            {t('deactivate')}
          </button>
        ) : (
          <button className="o-btn" onClick={() => store.setWorkerActive(worker, true)}>{t('reactivate')}</button>
        )}
      </div>
    </li>
  )
}

function PairingCode({ code, expiresAt, onClose }: { code: string; expiresAt: number; onClose: () => void }) {
  const { t } = useLang()
  const url = `${window.location.origin}${window.location.pathname}#/pair/${code}`
  const [img] = useState(() => {
    const qr = qrcode(0, 'M')
    qr.addData(url)
    qr.make()
    return qr.createDataURL(6, 2)
  })

  // Close by itself once the code has expired.
  useEffect(() => {
    const t = window.setTimeout(onClose, Math.max(0, expiresAt - Date.now()))
    return () => window.clearTimeout(t)
  }, [expiresAt, onClose])

  return (
    <div className="o-pair">
      <img src={img} alt="QR" width={220} height={220} />
      <div className="o-pair-code">{code.slice(0, 5)} {code.slice(5)}</div>
      <p className="o-small">{t('pairInstructions')}</p>
      <p className="o-small o-amber">{t('codeExpires', { time: fmtTime(expiresAt) })}</p>
      <button className="o-btn" onClick={onClose}>{t('close')}</button>
    </div>
  )
}

function AssignmentForm({ worker, current }: { worker: Worker; current?: Assignment }) {
  const store = useStore()
  const { t, tx } = useLang()
  const [siteId, setSiteId] = useState(current?.siteId ?? '')
  const [task, setTask] = useState(current?.task.en ?? '')
  const [taskHi, setTaskHi] = useState(current?.task.hi ?? '')
  const [saved, setSaved] = useState(false)
  const dirty = siteId !== (current?.siteId ?? '') || task !== (current?.task.en ?? '') || taskHi !== (current?.task.hi ?? '')
  const activeSites = store.sites.filter((s) => s.active || s.id === siteId)

  return (
    <form
      className="o-form"
      onSubmit={(e) => {
        e.preventDefault()
        if (!siteId || !task.trim()) return
        store.setAssignment(worker.id, siteId, { en: task.trim(), hi: taskHi.trim() }).then(() => {
          setSaved(true)
          window.setTimeout(() => setSaved(false), 2000)
        }, () => {})
      }}
    >
      <label>
        {t('site')}
        <select value={siteId} onChange={(e) => setSiteId(e.target.value)}>
          <option value="">{t('noSiteOption')}</option>
          {activeSites.map((s) => (
            <option key={s.id} value={s.id}>{tx(s.name)}</option>
          ))}
        </select>
      </label>
      <label>
        {t('taskEn')}
        <input value={task} onChange={(e) => setTask(e.target.value)} maxLength={120} />
      </label>
      <label>
        {t('taskHi')}
        <input value={taskHi} onChange={(e) => setTaskHi(e.target.value)} maxLength={120} lang="hi" />
      </label>
      <div className="o-actions">
        <button className="o-btn o-btn-green" type="submit" disabled={!dirty || !siteId || !task.trim()}>
          {saved ? t('saved') : t('saveAssignment')}
        </button>
      </div>
    </form>
  )
}

/** Owner turns notifications on for this phone/PC. (Messaging code loads only when this card is used.) */
function NotifyCard() {
  const { t, lang } = useLang()
  const [state, setState] = useState<PushState | 'busy' | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    import('../lib/push').then((m) => m.pushState()).then(setState, () => setState('unsupported'))
  }, [])

  const run = async (on: boolean) => {
    setError(null)
    setState('busy')
    try {
      const m = await import('../lib/push')
      setState(await (on ? m.enablePush(lang) : m.disablePush()))
    } catch (e) {
      setError(String((e as Error)?.message ?? e))
      setState('off')
    }
  }

  return (
    <section className="o-panel">
      <h2>{t('notifyTitle')}</h2>
      <p className="o-muted o-small">{t('notifyWhat')}</p>
      {state === 'test' && <p className="o-muted o-small">{t('notifyTestMode')}</p>}
      {state === 'unsupported' && <p className="o-amber o-small">{t('notifyUnsupported')}</p>}
      {state === 'blocked' && <p className="o-amber o-small">{t('notifyBlocked')}</p>}
      {state === 'on' && (
        <div className="o-actions">
          <Chip tone="green">{t('notifyEnabled')}</Chip>
          <button className="o-btn" onClick={() => void run(false)}>{t('notifyOff')}</button>
        </div>
      )}
      {(state === 'off' || state === 'busy') && (
        <button className="o-btn o-btn-green" disabled={state === 'busy'} onClick={() => void run(true)}>
          {state === 'busy' ? t('loading') : t('notifyOn')}
        </button>
      )}
      {error && <p className="o-red o-small">{error}</p>}
      <p className="o-muted o-small">{t('notifyDelay')}</p>
    </section>
  )
}
