import { AppIcon } from "../ui/AppIcon"
import { Sheet } from "../ui/Sheet"
import { DOCK_APPS, launch } from "./apps"

export function Dock({ onClose }: { onClose: () => void }) {
  return (
    <Sheet title="Apps" onClose={onClose}>
      <div className="grid grid-cols-4 gap-x-2 gap-y-5 pb-2 pt-1">
        {DOCK_APPS.map((app, i) => (
          <button
            key={app.name}
            type="button"
            onClick={() => launch(app)}
            className="tap anim-pop flex flex-col items-center gap-1.5"
            style={{ animationDelay: `${60 + i * 22}ms` }}
          >
            <AppIcon app={app} />
            <span className="w-full truncate text-center text-[12px]" style={{ color: "var(--j-text-2)" }}>
              {app.name}
            </span>
          </button>
        ))}
      </div>
    </Sheet>
  )
}
