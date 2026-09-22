import { useEffect, useRef } from "react"
import type { Phase } from "../voice/machine"

/**
 * The JARVIS orb. Breathes while listening, spins faster while thinking,
 * and pulses on every spoken word (`beat` increments per word).
 */
export function Orb(props: {
  size: number
  phase?: Phase | "idle"
  muted?: boolean
  beat?: number
  rings?: boolean
  className?: string
  onClick?: () => void
  label?: string
}) {
  const ref = useRef<HTMLElement>(null)

  useEffect(() => {
    if (!props.beat || props.phase !== "speaking" || !ref.current?.animate) return
    ref.current.animate(
      [{ transform: "scale(1)" }, { transform: "scale(1.09)" }, { transform: "scale(1)" }],
      { duration: 260, easing: "cubic-bezier(0.2, 0.8, 0.2, 1)" },
    )
  }, [props.beat, props.phase])

  const Tag = props.onClick ? "button" : "div"
  return (
    <Tag
      ref={ref as any}
      type={props.onClick ? "button" : undefined}
      aria-label={props.label}
      onClick={props.onClick}
      className={`orb shrink-0 ${props.size < 32 ? "orb-sm" : ""} ${props.className ?? ""}`}
      data-phase={props.phase ?? "idle"}
      data-muted={props.muted ? "true" : "false"}
      style={{ width: props.size, height: props.size }}
    >
      {props.rings && props.phase === "listening" && !props.muted && (
        <span className="pointer-events-none absolute inset-0 -z-10">
          <span className="orb-ring" />
          <span className="orb-ring" />
          <span className="orb-ring" />
        </span>
      )}
    </Tag>
  )
}

/** Tiny static orb used as JARVIS's "app icon" in labels and the header. */
export function Mark({ size = 18, busy = false }: { size?: number; busy?: boolean }) {
  return <Orb size={size} phase={busy ? "thinking" : "idle"} />
}
