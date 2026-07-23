import React from 'react'
import ReactDOM from 'react-dom/client'
import '@fontsource-variable/instrument-sans'
import '@fontsource-variable/instrument-sans/wght-italic.css'
import '@fontsource-variable/bricolage-grotesque'
import '@fontsource-variable/manrope'
import '@fontsource-variable/syne'
import '@fontsource/fraunces/latin-600.css'
import '@fontsource/fraunces/latin-600-italic.css'
import '@fontsource/bebas-neue/latin-400.css'
import '@fontsource/playfair-display/latin-600.css'
import '@fontsource/playfair-display/latin-600-italic.css'
import '@fontsource/playfair-display/latin-700.css'
import '@fontsource/playfair-display/latin-700-italic.css'
import '@fontsource/space-mono/latin-400.css'
import '@fontsource/space-mono/latin-400-italic.css'
import '@fontsource/space-mono/latin-700.css'
import '@fontsource/space-mono/latin-700-italic.css'
import '@fontsource/caveat/latin-400.css'
import '@fontsource/caveat/latin-700.css'
import '@fontsource/dm-serif-display/latin-400.css'
import '@fontsource/dm-serif-display/latin-400-italic.css'
import './styles.css'
import App from './App'

const root = document.getElementById('root')
if (!root) throw new Error('The #root app container is missing')

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
