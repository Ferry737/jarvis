import { X } from "@openai/apps-sdk-ui/components/Icon"
import { DOCK_APPS, launch } from "./apps"

export function Dock({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-40 flex flex-col justify-end bg-black/60" onClick={onClose}>
      <div
        className="safe-bottom rounded-t-3xl border-t border-subtle bg-surface-elevated px-4 pt-3"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Apps"
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold text-default">Apps</h2>
          <button type="button" aria-label="Close" onClick={onClose} className="grid size-9 place-items-center rounded-full text-secondary">
            <X className="size-5" />
          </button>
        </div>
        <div className="grid grid-cols-4 gap-x-2 gap-y-4 pb-4">
          {DOCK_APPS.map((app) => (
            <button key={app.name} type="button" onClick={() => launch(app)} className="flex flex-col items-center gap-1.5 active:opacity-70">
              <span
                className="grid size-14 place-items-center rounded-2xl text-lg font-semibold"
                style={{ background: app.color, color: readableOn(app.color) }}
              >
                {app.mono}
              </span>
              <span className="w-full truncate text-center text-[11px] text-secondary">{app.name}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

function readableOn(hex: string) {
  const n = parseInt(hex.slice(1), 16)
  const lum = (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255
  return lum > 0.6 ? "#111" : "#fff"
}
