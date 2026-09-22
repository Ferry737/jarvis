import { Sheet } from "../ui/Sheet"
import { DOCK_APPS, launch } from "./apps"

export function Dock({ onClose }: { onClose: () => void }) {
  return (
    <Sheet title="Apps" onClose={onClose}>
      <div className="grid grid-cols-4 gap-x-2 gap-y-4 pb-2 pt-1">
        {DOCK_APPS.map((app, i) => (
          <button
            key={app.name}
            type="button"
            onClick={() => launch(app)}
            className="tap anim-pop flex flex-col items-center gap-1.5"
            style={{ animationDelay: `${60 + i * 22}ms` }}
          >
            <span
              className="grid size-[58px] place-items-center rounded-[16px] text-[18px] font-semibold shadow-sm"
              style={{ background: app.color, color: readableOn(app.color) }}
            >
              {app.mono}
            </span>
            <span className="w-full truncate text-center text-[12px]" style={{ color: "var(--j-text-2)" }}>
              {app.name}
            </span>
          </button>
        ))}
      </div>
    </Sheet>
  )
}

function readableOn(hex: string) {
  const n = parseInt(hex.slice(1), 16)
  const lum = (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255
  return lum > 0.6 ? "#111" : "#fff"
}
