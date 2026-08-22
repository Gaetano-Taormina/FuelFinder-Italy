import { StrictMode, lazy, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import i18n from './utils/i18n'
import App from './App.jsx'

import { ErrorBoundary } from './components/ErrorBoundary.jsx'

const ExplorePage = lazy(() => import('./pages/ExplorePage.jsx'))
const NotFoundPage = lazy(() => import('./pages/NotFoundPage.jsx'))

const LoadingFallback = () => (
  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', fontFamily: 'sans-serif' }}>
    {i18n.t('loading_app')}
  </div>
);

const PageWrapper = ({ children }) => (
  <ErrorBoundary>
    <Suspense fallback={<LoadingFallback />}>
      {children}
    </Suspense>
  </ErrorBoundary>
);

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/it/esplora" element={<PageWrapper><ExplorePage /></PageWrapper>} />
        <Route path="/en/explore" element={<PageWrapper><ExplorePage /></PageWrapper>} />
        <Route path="/esplora" element={<PageWrapper><ExplorePage /></PageWrapper>} />
        <Route path="/explore" element={<PageWrapper><ExplorePage /></PageWrapper>} />
        
        <Route path="/it/citta/:city" element={<PageWrapper><App /></PageWrapper>} />
        <Route path="/en/city/:city" element={<PageWrapper><App /></PageWrapper>} />
        <Route path="/:lang" element={<PageWrapper><App /></PageWrapper>} />
        <Route path="/" element={<PageWrapper><App /></PageWrapper>} />
        
        <Route path="*" element={<PageWrapper><NotFoundPage /></PageWrapper>} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
