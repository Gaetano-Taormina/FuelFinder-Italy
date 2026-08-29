/* oxlint-disable react/only-export-components */
import { StrictMode, lazy, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import i18n from './utils/i18n'
import { ROUTES } from './config/routes.js'
import App from './App.jsx'

import { ErrorBoundary } from './components/ErrorBoundary.jsx'

const ExplorePage = lazy(() => import('./pages/ExplorePage.jsx'))
const NotFoundPage = lazy(() => import('./pages/NotFoundPage.jsx'))

const fallbackStyle = { display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', fontFamily: 'sans-serif' };

const LoadingFallback = () => (
  <div style={fallbackStyle}>
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
        {Object.keys(ROUTES).map((lang) => (
          <Route key={`explore-${lang}`} path={`/${lang}/${ROUTES[lang].explore}`} element={<PageWrapper><ExplorePage /></PageWrapper>} />
        ))}
        {Object.keys(ROUTES).map((lang) => (
          <Route key={`explore-naked-${lang}`} path={`/${ROUTES[lang].explore}`} element={<PageWrapper><ExplorePage /></PageWrapper>} />
        ))}
        
        {Object.keys(ROUTES).map((lang) => (
          <Route key={`city-${lang}`} path={`/${lang}/${ROUTES[lang].cityPrefix}/:city/:fuel?`} element={<PageWrapper><App /></PageWrapper>} />
        ))}
        <Route path="/:lang/:fuel?" element={<PageWrapper><App /></PageWrapper>} />
        <Route path="/" element={<PageWrapper><App /></PageWrapper>} />
        
        <Route path="*" element={<PageWrapper><NotFoundPage /></PageWrapper>} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
