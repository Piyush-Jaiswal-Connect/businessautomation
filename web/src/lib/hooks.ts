import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react'

function subscribeOnline(cb: () => void) {
  window.addEventListener('online', cb)
  window.addEventListener('offline', cb)
  return () => {
    window.removeEventListener('online', cb)
    window.removeEventListener('offline', cb)
  }
}

export function useOnline(): boolean {
  return useSyncExternalStore(subscribeOnline, () => navigator.onLine, () => true)
}

function subscribeHash(cb: () => void) {
  window.addEventListener('hashchange', cb)
  return () => window.removeEventListener('hashchange', cb)
}

/** Current route from the URL hash, e.g. "#/owner/sites" → "/owner/sites". */
export function useHashRoute(): string {
  return useSyncExternalStore(subscribeHash, () => window.location.hash.slice(1) || '/', () => '/')
}

export const go = (route: string) => {
  window.location.hash = route
}

const MAX_SECONDS = 180 // a work update longer than 3 minutes stops by itself

export type RecorderState =
  | { kind: 'idle' }
  | { kind: 'recording'; seconds: number }
  | { kind: 'done'; url: string; blob: Blob; seconds: number }
  | { kind: 'error'; reason: 'denied' | 'unavailable' }

/** Records from the phone microphone. The recording stays on the phone (Phase 3 uploads it). */
export function useRecorder() {
  const [state, setState] = useState<RecorderState>({ kind: 'idle' })
  const rec = useRef<MediaRecorder | null>(null)
  const timer = useRef<number | undefined>(undefined)
  const started = useRef(0)
  const urlRef = useRef<string | null>(null)

  const cleanupStream = () => {
    window.clearInterval(timer.current)
    rec.current?.stream.getTracks().forEach((t) => t.stop())
    rec.current = null
  }

  const stop = useCallback(() => {
    if (rec.current && rec.current.state !== 'inactive') rec.current.stop()
  }, [])

  const start = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setState({ kind: 'error', reason: 'unavailable' })
      return
    }
    let stream: MediaStream
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    } catch (e) {
      const denied = e instanceof DOMException && (e.name === 'NotAllowedError' || e.name === 'SecurityError')
      setState({ kind: 'error', reason: denied ? 'denied' : 'unavailable' })
      return
    }
    const mimeType = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'].find((m) => MediaRecorder.isTypeSupported(m))
    const r = new MediaRecorder(stream, mimeType ? { mimeType, audioBitsPerSecond: 32_000 } : undefined)
    const chunks: Blob[] = []
    r.ondataavailable = (ev) => ev.data.size && chunks.push(ev.data)
    r.onstop = () => {
      const seconds = (Date.now() - started.current) / 1000
      const blob = new Blob(chunks, { type: r.mimeType || 'audio/webm' })
      cleanupStream()
      if (urlRef.current) URL.revokeObjectURL(urlRef.current)
      const url = URL.createObjectURL(blob)
      urlRef.current = url
      setState({ kind: 'done', url, blob, seconds })
    }
    rec.current = r
    started.current = Date.now()
    r.start()
    setState({ kind: 'recording', seconds: 0 })
    timer.current = window.setInterval(() => {
      const seconds = (Date.now() - started.current) / 1000
      if (seconds >= MAX_SECONDS) stop()
      else setState({ kind: 'recording', seconds })
    }, 250)
  }, [stop])

  /** Forget the current recording. keepUrl: the audio is still in use elsewhere (e.g. sent). */
  const reset = useCallback((keepUrl = false) => {
    if (!keepUrl && urlRef.current) URL.revokeObjectURL(urlRef.current)
    urlRef.current = null
    setState({ kind: 'idle' })
  }, [])

  useEffect(
    () => () => {
      window.clearInterval(timer.current)
      rec.current?.stream.getTracks().forEach((t) => t.stop())
    },
    [],
  )

  return { state, start, stop, reset }
}
