// Small hand-drawn icon set (24×24, stroke = text colour). No icon library needed.
const paths = {
  check: 'M4.5 12.5l5 5L19.5 7',
  mic: 'M12 3a3 3 0 0 1 3 3v6a3 3 0 0 1-6 0V6a3 3 0 0 1 3-3zM5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21',
  stop: 'M7 7h10v10H7z',
  home: 'M3 11.5L12 4l9 7.5M5.5 10v10h13V10',
  users: 'M9 11.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM2.5 20a6.5 6.5 0 0 1 13 0M16.5 11a2.75 2.75 0 1 0 0-5.5M17 14.2a5 5 0 0 1 4.5 5.3',
  site: 'M4 21V9l8-5.5L20 9v12M9.5 21v-6h5v6M3 21h18',
  report: 'M4 5h16v11H9l-5 4zM9 9.5v2M12 8v5M15 9.5v2',
  rupee: 'M7 4.5h10M7 9h10M9.5 4.5c5 0 5 9 0 9H7l8 6.5',
  play: 'M8 5.5v13l10.5-6.5z',
  x: 'M6 6l12 12M18 6L6 18',
  lang: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM3 12h18M12 3c3 3.2 3 14.8 0 18M12 3c-3 3.2-3 14.8 0 18',
  clock: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 7.5V12l3 2',
  exit: 'M14 4h5v16h-5M10 8l-4 4 4 4M6 12h10',
  cloudOff: 'M3 3l18 18M8 8.5A5 5 0 0 0 6.5 18H17M20 16.5A4 4 0 0 0 17.5 10a6 6 0 0 0-7.6-4.7',
  alert: 'M12 3.5L21.5 20h-19zM12 10v4.5M12 17.2v.3',
  chevron: 'M9 6l6 6-6 6',
  redo: 'M4 12a8 8 0 1 0 2.5-5.8M4 4v4.5h4.5',
} as const

export type IconName = keyof typeof paths

export function Icon({ name, size = 24, className }: { name: IconName; size?: number; className?: string }) {
  const filled = name === 'play' || name === 'stop'
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth={filled ? 1 : 2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={paths[name]} />
    </svg>
  )
}
