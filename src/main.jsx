import { StrictMode, lazy, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import i18n from './utils/i18n'
import App from './App.jsx'

const AdminDashboard = lazy(() => import('./pages/AdminDashboard.jsx'))

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <Suspense fallback={<div style={{display:'flex',justifyContent:'center',alignItems:'center',height:'100vh',fontFamily:'sans-serif'}}>{i18n.t('loading_app')}</div>}>
        <Routes>
          <Route path="/admin-stats" element={<AdminDashboard />} />
          <Route path="/:lang/citta/:city" element={<App />} />
          <Route path="/:lang?" element={<App />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  </StrictMode>,
)
