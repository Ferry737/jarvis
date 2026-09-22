import { useEffect, useRef, useState } from "react"

/** Number that tweens to its new value and flashes green/red on change. */
export function AnimatedNumber({ value, format }: { value: number | null; format: (n: number) => string }) {
  const [shown, setShown] = useState(value)
  const [flash, setFlash] = useState<"" | "flash-up" | "flash-down">("")
  const prev = useRef(value)

  useEffect(() => {
    const from = prev.current
    prev.current = value
    if (value == null) return setShown(null)
    if (from == null || from === value) return setShown(value)
    setFlash(value > from ? "flash-up" : "flash-down")
    const start = performance.now()
    const dur = 700
    let raf = 0
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / dur)
      const e = 1 - Math.pow(1 - p, 3)
      setShown(from + (value - from) * e)
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    const clear = setTimeout(() => setFlash(""), 1200)
    return () => {
      cancelAnimationFrame(raf)
      clearTimeout(clear)
    }
  }, [value])

  return <span className={`rounded px-0.5 tabular-nums ${flash}`}>{shown == null ? "—" : format(shown)}</span>
}

/** Sparkline that draws itself in. */
export function Sparkline({ points, up, height = 64 }: { points: number[]; up: boolean; height?: number }) {
  if (points.length < 2) return <div style={{ height }} />
  const w = 240
  const min = Math.min(...points)
  const max = Math.max(...points)
  const span = max - min || 1
  const xy = points.map((p, i) => [(i / (points.length - 1)) * w, height - 6 - ((p - min) / span) * (height - 12)])
  const d = xy.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ")
  const color = up ? "var(--j-up)" : "var(--j-down)"
  const id = `g${Math.round(points[0] * 1000) % 100000}${up ? "u" : "d"}`
  return (
    <svg viewBox={`0 0 ${w} ${height}`} width="100%" height={height} preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <linearGradient id={id} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor={color} stopOpacity="0.25" />
          <stop offset="1" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${d} L${w},${height} L0,${height} Z`} fill={`url(#${id})`} className="anim-fade" style={{ animationDuration: "900ms" }} />
      <path
        d={d}
        fill="none"
        stroke={color}
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        pathLength={1}
        style={{ strokeDasharray: 1, strokeDashoffset: 1, animation: "draw 1.1s cubic-bezier(0.3, 0.7, 0.2, 1) forwards" }}
      />
    </svg>
  )
}

/** Greeting that types itself in letter by letter. */
export function Letters({ text, delay = 0 }: { text: string; delay?: number }) {
  return (
    <>
      {[...text].map((ch, i) => (
        <span key={i} className="greet-letter" style={{ animationDelay: `${delay + i * 28}ms` }}>
          {ch}
        </span>
      ))}
    </>
  )
}
