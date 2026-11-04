import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { AppShell } from './components/layout/AppShell';
import { ErrorBoundary } from './components/layout/ErrorBoundary';
import { Spinner } from './components/ui';
import { ApiError } from './lib/api';
import { useAuth } from './stores/auth';
import { useSaved } from './stores/saved';
import { applyTheme, useSettings } from './stores/settings';

const HomePage = lazy(() => import('./pages/HomePage'));
const MapPage = lazy(() => import('./pages/MapPage'));
const IndiaPage = lazy(() => import('./pages/IndiaPage'));
const StatePage = lazy(() => import('./pages/StatePage'));
const TransportPage = lazy(() => import('./pages/TransportPage'));
const ExploreHubPage = lazy(() => import('./pages/ExploreHubPage'));
const SavedPage = lazy(() => import('./pages/SavedPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const AboutPage = lazy(() => import('./pages/AboutPage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (n, e) => (e instanceof ApiError ? e.retryable && n < 2 : n < 2),
      refetchOnWindowFocus: false,
    },
  },
});

function Bootstrap() {
  const theme = useSettings((s) => s.theme);
  const dim = useSettings((s) => s.dimMapInDark);
  useEffect(() => {
    applyTheme(theme, dim);
    if (theme !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const h = () => applyTheme('system', dim);
    mq.addEventListener('change', h);
    return () => mq.removeEventListener('change', h);
  }, [theme, dim]);
  useEffect(() => {
    useAuth.getState().hydrate();
    useSaved.getState().load().then(() => useSaved.getState().sync());
    const online = () => useSaved.getState().sync();
    window.addEventListener('online', online);
    return () => window.removeEventListener('online', online);
  }, []);
  return null;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Bootstrap />
        <AppShell>
          <ErrorBoundary>
            <Suspense fallback={<div className="grid min-h-[50vh] place-items-center"><Spinner /></div>}>
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/map" element={<MapPage />} />
                <Route path="/india" element={<IndiaPage />} />
                <Route path="/india/:code" element={<StatePage />} />`n                <Route path="/transport" element={<TransportPage />} />`n                <Route path="/explore" element={<ExploreHubPage />} />
                <Route path="/saved" element={<SavedPage />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="/about" element={<AboutPage />} />
                <Route path="*" element={<NotFoundPage />} />
              </Routes>
            </Suspense>
          </ErrorBoundary>
        </AppShell>
      </BrowserRouter>
    </QueryClientProvider>
  );
}


