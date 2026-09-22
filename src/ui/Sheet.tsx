import { useEffect } from "react"
import { X } from "@openai/apps-sdk-ui/components/Icon"

/** iOS-style bottom sheet: scrim fades, panel slides up. Tap scrim or ✕ to close. */
export function Sheet(props: { title: string; onClose: () => void; children: React.ReactNode; tall?: boolean }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && props.onClose()
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [props.onClose])

  return (
    <div className="anim-fade fixed inset-0 z-40 flex flex-col justify-end" style={{ background: "var(--j-scrim)" }} onClick={props.onClose}>
      <div
        role="dialog"
        aria-label={props.title}
        onClick={(e) => e.stopPropagation()}
        className={`anim-sheet safe-bottom flex flex-col rounded-t-[28px] ${props.tall ? "h-[92%]" : "max-h-[88%]"}`}
        style={{ background: "var(--j-bg)", boxShadow: "var(--j-shadow)" }}
      >
        <div className="mx-auto mt-2 h-1.5 w-10 rounded-full" style={{ background: "var(--j-border)" }} />
        <div className="flex items-center justify-between px-5 pb-2 pt-2">
          <h2 className="text-[17px] font-semibold">{props.title}</h2>
          <button
            type="button"
            aria-label="Close"
            onClick={props.onClose}
            className="tap grid size-9 place-items-center rounded-full"
            style={{ background: "var(--j-pill)", color: "var(--j-text-2)" }}
          >
            <X className="size-4" />
          </button>
        </div>
        <div className="no-scrollbar flex-1 overflow-y-auto px-5 pb-4">{props.children}</div>
      </div>
    </div>
  )
}
