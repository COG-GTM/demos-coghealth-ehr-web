import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { applyTheme, resolveTheme, useThemeStore } from './store/themeStore'

applyTheme(resolveTheme(useThemeStore.getState().preference))

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
