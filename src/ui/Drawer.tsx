import { ChatCompose, Grid, Settings as SettingsIcon } from "@openai/apps-sdk-ui/components/Icon"
import { Mark } from "./Orb"

/** Left drawer behind the ☰ button, like ChatGPT's sidebar. */
export function Drawer(props: {
  connected: boolean
  onClose: () => void
  onNewChat: () => void
  onApps: () => void
  onSettings: () => void
}) {
  const item = (label: string, icon: React.ReactNode, onClick: () => void, delay: number) => (
    <button
      type="button"
      onClick={() => {
        props.onClose()
        onClick()
      }}
      className="tap anim-rise flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-[16px]"
      style={{ animationDelay: `${delay}ms` }}
    >
      <span style={{ color: "var(--j-text-2)" }}>{icon}</span>
      {label}
    </button>
  )

  return (
    <div className="anim-fade fixed inset-0 z-40" style={{ background: "var(--j-scrim)" }} onClick={props.onClose}>
      <nav
        onClick={(e) => e.stopPropagation()}
        className="anim-drawer safe-top safe-bottom flex h-full w-[78%] max-w-[320px] flex-col px-3"
        style={{ background: "var(--j-sheet, var(--j-bg))", boxShadow: "var(--j-shadow)", WebkitBackdropFilter: "blur(30px) saturate(1.6)", backdropFilter: "blur(30px) saturate(1.6)" }}
        aria-label="Menu"
      >
        <div className="flex items-center gap-2.5 px-3 py-4">
          <Mark size={26} />
          <span className="text-[18px] font-semibold">JARVIS</span>
        </div>
        {item("New chat", <ChatCompose className="size-5" />, props.onNewChat, 40)}
        {item("Apps", <Grid className="size-5" />, props.onApps, 80)}
        {item("Settings", <SettingsIcon className="size-5" />, props.onSettings, 120)}
        <div className="mt-auto flex items-center gap-2 px-3 py-3 text-[13px]" style={{ color: "var(--j-text-3)" }}>
          <span className="size-2 rounded-full" style={{ background: props.connected ? "var(--j-up)" : "#f5a524" }} />
          {props.connected ? "Hermes key saved" : "Add your Hermes key in Settings"}
        </div>
      </nav>
    </div>
  )
}
