import { StrictMode, lazy, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import i18n from './utils/i18n'
import App from './App.jsx'

import { ErrorBoundary } from './components/ErrorBoundary.jsx'

const ExplorePage = lazy(() => import('./pages/ExplorePage.jsx'))
const NotFoundPage = lazy(() => import('./pages/NotFoundPage.jsx'))

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <ErrorBoundary>
        <Suspense fallback={<div style={{display:'flex',justifyContent:'center',alignItems:'center',height:'100vh',fontFamily:'sans-serif'}}>{i18n.t('loading_app')}</div>}>
          <Routes>
            <Route path="/it/esplora" element={<ExplorePage />} />
            <Route path="/en/explore" element={<ExplorePage />} />
            <Route path="/esplora" element={<ExplorePage />} />
            <Route path="/explore" element={<ExplorePage />} />
            <Route path="/it/citta/:city" element={<App />} />
            <Route path="/en/city/:city" element={<App />} />
            <Route path="/:lang" element={<App />} />
            <Route path="/" element={<App />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Suspense>
      </ErrorBoundary>
    </BrowserRouter>
  </StrictMode>,
)
