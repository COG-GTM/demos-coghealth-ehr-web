import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { applyTheme, readThemePreference } from './theme'

const systemTheme = window.matchMedia('(prefers-color-scheme: dark)')
const syncTheme = () => applyTheme(document.documentElement, readThemePreference(localStorage), systemTheme.matches)
syncTheme()
systemTheme.addEventListener('change', syncTheme)
window.addEventListener('coghealth-theme-change', syncTheme)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
