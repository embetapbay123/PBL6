import React from 'react'
import ReactDOM from 'react-dom/client'
import {lazy,Suspense} from 'react'
import './index.css'
import {LiveApp} from './live/LiveApp'
const LegacyDemo=lazy(()=>import('./legacy-demo'));
const ApiTools=lazy(()=>import('./bootstrap/BootstrapApp').then(module=>({default:module.BootstrapApp})));

const mockMode = new URLSearchParams(window.location.search).get('mode') === 'mock';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Suspense fallback={<p role="status">Đang tải…</p>}>{mockMode?<LegacyDemo/>:new URLSearchParams(window.location.search).get('mode')==='api-tools'?<ApiTools/>:<LiveApp/>}</Suspense>
  </React.StrictMode>,
)
