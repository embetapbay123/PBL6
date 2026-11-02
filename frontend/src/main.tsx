import React from 'react'
import ReactDOM from 'react-dom/client'
import {lazy,Suspense} from 'react'
import './index.css'
import {LiveApp} from './live/LiveApp'
const LegacyDemo=import.meta.env.DEV?lazy(()=>import('./legacy-demo')):null;
const ApiTools=import.meta.env.DEV?lazy(()=>import('./bootstrap/BootstrapApp').then(module=>({default:module.BootstrapApp}))):null;

const mockMode = import.meta.env.DEV && new URLSearchParams(window.location.search).get('mode') === 'mock';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Suspense fallback={<p role="status">Đang tải…</p>}>{mockMode&&LegacyDemo?<LegacyDemo/>:import.meta.env.DEV&&ApiTools&&new URLSearchParams(window.location.search).get('mode')==='api-tools'?<ApiTools/>:<LiveApp/>}</Suspense>
  </React.StrictMode>,
)
