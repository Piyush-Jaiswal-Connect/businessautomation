// A paired worker phone's view: only its own worker record, site, work and today's attendance.
import { Timestamp, doc, onSnapshot, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore'
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { auth, db } from '../lib/firebase'
import { dayKey } from '../lib/format'
import { useOnline } from '../lib/hooks'
import type { Assignment, Attendance, GeoPoint, Settings, Site, Worker } from '../types'
import { errorText, ms, toAssignment, toAttendance, toSite, toWorker } from './convert'

export type WorkerPhase = 'loading' | 'unpaired' | 'removed' | 'ready'

function getLocation(): Promise<GeoPoint | null> {
  if (!('geolocation' in navigator)) return Promise.resolve(null)
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude, accuracy: Math.round(p.coords.accuracy) }),
      () => resolve(null), // refused or failed: attendance still goes through without it
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 60_000 },
    )
  })
}

function useWorkerStoreValue() {
  const uid = auth.currentUser!.uid
  const online = useOnline()
  const [today, setToday] = useState(dayKey)
  // Which worker this phone is paired to, and when. A new pairing restarts all listeners
  // (a listener that was refused while the phone was disconnected does not restart by itself).
  const [link, setLink] = useState<{ workerId: string; pairedAt: number | null } | null | undefined>(undefined)
  const workerId = link === undefined ? undefined : (link?.workerId ?? null)
  const linkKey = link ? `${link.workerId}|${link.pairedAt}` : null
  // Tagged with the pairing it belongs to, so an answer from an older pairing is ignored.
  const [workerSnap, setWorkerSnap] = useState<{ key: string; worker: Worker | null } | null>(null)
  const worker = workerSnap && workerSnap.key === linkKey ? workerSnap.worker : undefined
  const [assignment, setAssignment] = useState<Assignment | null>(null)
  const [site, setSite] = useState<Site | null>(null)
  const [snapAttendance, setSnapAttendance] = useState<{ doc: Attendance | null; pending: boolean }>({ doc: null, pending: false })
  const [settings, setSettings] = useState<Settings>({ askLocation: false })
  const [locating, setLocating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const t = window.setInterval(() => setToday(dayKey()), 60_000)
    return () => window.clearInterval(t)
  }, [])

  useEffect(
    () =>
      onSnapshot(
        doc(db, 'devices', uid),
        { includeMetadataChanges: true },
        (s) => {
          // Right after pairing, wait until the server has accepted it; reading the worker
          // record before that is refused, and a refused listener stops for good.
          if (s.metadata.hasPendingWrites) return
          setLink(s.exists() ? { workerId: s.data().workerId as string, pairedAt: ms(s.data().pairedAt) } : null)
        },
        () => setLink(null),
      ),
    [uid],
  )

  useEffect(() => {
    if (!linkKey) return
    const workerId = linkKey.split('|')[0]
    const unsubs = [
      onSnapshot(
        doc(db, 'workers', workerId),
        (s) => setWorkerSnap({ key: linkKey, worker: s.exists() ? toWorker(s) : null }),
        () => setWorkerSnap({ key: linkKey, worker: null }), // permission denied = this phone was disconnected
      ),
      onSnapshot(doc(db, 'assignments', workerId), (s) => setAssignment(s.exists() ? toAssignment(s) : null), () => setAssignment(null)),
      onSnapshot(doc(db, 'config/settings'), (s) => setSettings({ askLocation: s.data()?.askLocation === true }), () => {}),
    ]
    return () => unsubs.forEach((u) => u())
  }, [linkKey])

  const siteId = assignment?.siteId
  useEffect(() => {
    if (!siteId) return
    return onSnapshot(doc(db, 'sites', siteId), (s) => setSite(s.exists() ? toSite(s) : null), () => setSite(null))
  }, [siteId])

  useEffect(() => {
    if (!linkKey) return
    const workerId = linkKey.split('|')[0]
    return onSnapshot(
      doc(db, 'attendance', `${workerId}_${today}`),
      { includeMetadataChanges: true },
      (s) => setSnapAttendance({ doc: s.exists() ? toAttendance(s) : null, pending: s.metadata.hasPendingWrites }),
      () => setSnapAttendance({ doc: null, pending: false }),
    )
  }, [linkKey, today])

  // Not "received" until the server has it: while a write waits on this phone, say so.
  const attendance = useMemo<Attendance | null>(() => {
    const a = snapAttendance.doc
    if (!a) return null
    if (snapAttendance.pending || a.serverTime === null) return { ...a, status: online ? 'submitted' : 'pending_sync' }
    return a
  }, [snapAttendance, online])

  const phase: WorkerPhase =
    workerId === undefined || (workerId && worker === undefined)
      ? 'loading'
      : workerId === null
        ? 'unpaired'
        : !worker || !worker.active || worker.deviceUid !== uid
          ? 'removed'
          : 'ready'

  const actions = useMemo(
    () => ({
      async checkIn(wid: string, siteIdNow: string, askLocation: boolean) {
        setError(null)
        let location: GeoPoint | null = null
        if (askLocation) {
          setLocating(true)
          location = await getLocation()
          setLocating(false)
        }
        const now = Date.now()
        const date = dayKey(now)
        // Not awaited: offline, the write waits on the phone and is sent when network returns.
        setDoc(doc(db, 'attendance', `${wid}_${date}`), {
          workerId: wid, siteId: siteIdNow, date, deviceTime: Timestamp.fromMillis(now), serverTime: serverTimestamp(),
          location, status: 'received', checkOutTime: null, checkOutDeviceTime: null,
          correctedTime: null, correctionReason: null, decidedBy: null, decidedAt: null, lastAuditId: null,
        }).catch((e) => setError(errorText(e)))
      },
      checkOut(attendanceId: string) {
        setError(null)
        updateDoc(doc(db, 'attendance', attendanceId), {
          checkOutTime: serverTimestamp(), checkOutDeviceTime: Timestamp.now(),
        }).catch((e) => setError(errorText(e)))
      },
    }),
    [],
  )

  return { phase, today, workerId, worker, assignment, site: assignment ? site : null, attendance, settings, locating, error, ...actions }
}

export type WorkerStore = ReturnType<typeof useWorkerStoreValue>

const Ctx = createContext<WorkerStore | null>(null)

export function WorkerStoreProvider({ children }: { children: ReactNode }) {
  const store = useWorkerStoreValue()
  return <Ctx.Provider value={store}>{children}</Ctx.Provider>
}

export function useWorkerStore(): WorkerStore {
  const s = useContext(Ctx)
  if (!s) throw new Error('useWorkerStore outside WorkerStoreProvider')
  return s
}
