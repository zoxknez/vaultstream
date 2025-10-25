import { lazy, Suspense } from 'react';
import { Route, BrowserRouter as Router, Routes } from 'react-router-dom';
import OfflineIndicator from './components/OfflineIndicator.jsx';
import SystemTrayManager from './components/SystemTrayManager.jsx';
import UltimateLayout from './components/UltimateLayout.jsx';
import UpdateNotification from './components/UpdateNotification.jsx';
import { ServerSessionProvider } from './contexts/ServerSessionContext.jsx';
import { SyncProvider } from './contexts/SyncContext.jsx';
import { ThemeProvider } from './contexts/ThemeContext.jsx';
import useProtocolHandler from './hooks/useProtocolHandler.js';

// 🚀 REACT 19 CODE SPLITTING - Lazy load all routes
const HomePage = lazy(() => import('./pages/HomePage.jsx'));
const TorrentsPage = lazy(() => import('./pages/TorrentsPage.jsx'));
const DownloadsPage = lazy(() => import('./pages/DownloadsPage.jsx'));
const CollectionsPage = lazy(() => import('./pages/CollectionsPage.jsx'));
const WatchlistPage = lazy(() => import('./pages/WatchlistPage.jsx'));
const MetricsPage = lazy(() => import('./pages/MetricsPage.jsx'));
const AnalyticsPage = lazy(() => import('./pages/AnalyticsPage.jsx'));
const AboutPage = lazy(() => import('./pages/AboutPage.jsx'));

// 🎬 Netflix-style Loading Skeleton
function LoadingSkeleton() {
  return (
    <div className="loading-skeleton">
      <div className="skeleton-header"></div>
      <div className="skeleton-content">
        <div className="skeleton-card"></div>
        <div className="skeleton-card"></div>
        <div className="skeleton-card"></div>
      </div>
      <style>{`
        .loading-skeleton {
          min-height: 100vh;
          background: var(--bg-primary, #0f0f0f);
          padding: 2rem;
          animation: fadeIn 0.3s ease-in;
        }
        .skeleton-header {
          height: 60px;
          background: linear-gradient(90deg, #1a1a1a 25%, #252525 50%, #1a1a1a 75%);
          background-size: 200% 100%;
          animation: shimmer 1.5s infinite;
          border-radius: 8px;
          margin-bottom: 2rem;
        }
        .skeleton-content {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          gap: 1rem;
        }
        .skeleton-card {
          height: 300px;
          background: linear-gradient(90deg, #1a1a1a 25%, #252525 50%, #1a1a1a 75%);
          background-size: 200% 100%;
          animation: shimmer 1.5s infinite;
          border-radius: 8px;
        }
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </div>
  );
}

// App content with Router context
function AppContent() {
  // 🔗 Enable protocol handling (deep links & magnet links)
  useProtocolHandler();

  return (
    <>
      <UpdateNotification />
      <OfflineIndicator />
      <SystemTrayManager />
      <UltimateLayout>
        <Suspense fallback={<LoadingSkeleton />}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/search" element={<HomePage />} />
            <Route path="/torrents" element={<TorrentsPage />} />
            <Route path="/downloads" element={<DownloadsPage />} />
            <Route path="/collections" element={<CollectionsPage />} />
            <Route path="/watchlist" element={<WatchlistPage />} />
            <Route path="/metrics" element={<MetricsPage />} />
            <Route path="/analytics" element={<AnalyticsPage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/cache" element={<AboutPage />} />
          </Routes>
        </Suspense>
      </UltimateLayout>
    </>
  );
}

function App() {
  return (
    <ThemeProvider>
      <ServerSessionProvider>
        <SyncProvider>
          <Router>
            <AppContent />
          </Router>
        </SyncProvider>
      </ServerSessionProvider>
    </ThemeProvider>
  );
}

export default App;
