import { useStore } from '../data/OwnerStore'
import { tradeNames, useLang } from '../i18n'

export function useNames() {
  const store = useStore()
  const { lang, tx } = useLang()
  return {
    workerName(id: string) {
      const w = store.workers.find((x) => x.id === id)
      if (!w) return '?'
      return lang === 'hi' && w.nameHi ? w.nameHi : w.name
    },
    workerTrade(id: string) {
      const w = store.workers.find((x) => x.id === id)
      return w ? tx(tradeNames[w.trade]) : ''
    },
    siteName(id: string | null | undefined) {
      if (!id) return '—'
      const s = store.sites.find((x) => x.id === id)
      return s ? tx(s.name) : '?'
    },
  }
}

export type Tone = 'green' | 'amber' | 'red' | 'blue' | 'grey'

export function Chip({ tone, children }: { tone: Tone; children: React.ReactNode }) {
  return <span className={`o-chip o-chip-${tone}`}>{children}</span>
}
