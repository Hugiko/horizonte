import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource/orbitron/500.css'
import '@fontsource/orbitron/700.css'
import '@fontsource/exo-2/400.css'
import '@fontsource/exo-2/600.css'
import '@fontsource/inter/400.css'
import '@fontsource/inter/600.css'
import 'katex/dist/katex.min.css'
import './styles/global.css'
import './styles/game.css'
import './i18n'
import App from './App'
import { CharTest } from './scenes/CharTest'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {location.hash === '#char-test' ? <CharTest /> : <App />}
  </StrictMode>,
)
