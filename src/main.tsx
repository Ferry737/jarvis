// Must be imported first so Tailwind layers and kit foundations exist before component styles.
import "./main.css"

import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { applyDocumentTheme } from "@openai/apps-sdk-ui/theme"
import { App } from "./App"

applyDocumentTheme("dark")

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
