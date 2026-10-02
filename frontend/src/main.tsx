import React from 'react'
import ReactDOM from 'react-dom/client'
import { App } from './App'
import { AppProvider } from './context/AppContext'
import './index.css'
import { BootstrapApp } from './bootstrap/BootstrapApp'

const mockMode = new URLSearchParams(window.location.search).get('mode') === 'mock';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {mockMode ? <AppProvider><App /></AppProvider> : <BootstrapApp />}
  </React.StrictMode>,
)
