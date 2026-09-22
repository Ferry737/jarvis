import type { DockApp } from "../dock/apps"

/** iOS-style app tile: real logo when we have one, otherwise a clean monogram. */
export function AppIcon({ app, size = 58 }: { app: DockApp; size?: number }) {
  const radius = Math.round(size * 0.27)
  return (
    <span
      className="relative grid shrink-0 place-items-center overflow-hidden"
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        background: app.color,
        color: app.fg ?? "#fff",
        boxShadow: "inset 0 0 0 0.5px rgba(0,0,0,0.08), 0 2px 6px rgba(0,0,0,0.12)",
      }}
      aria-hidden="true"
    >
      {app.icon ? (
        <svg viewBox="0 0 24 24" width={size * 0.56} height={size * 0.56} fill="currentColor">
          <path d={app.icon.path} />
        </svg>
      ) : (
        <span className="font-semibold" style={{ fontSize: size * (app.mono.length > 1 ? 0.34 : 0.44) }}>
          {app.mono}
        </span>
      )}
      {/* soft top highlight, like iOS icons */}
      <span className="pointer-events-none absolute inset-0" style={{ background: "linear-gradient(180deg, rgba(255,255,255,0.18), transparent 45%)" }} />
    </span>
  )
}
