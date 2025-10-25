import { StrictMode, startTransition } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import RootErrorBoundary from './components/ErrorBoundaries.jsx';
import { initErrorTracking } from './utils/errorTracking.js';

// � Initialize external stores
import './stores/sessionStore.js';
import './stores/syncStore.js';

//  StreamVault Design System
import './styles/components.css';
import './styles/design-system.css';
import './styles/enhanced-cards.css'; // 🎨 Enhanced movie cards
import './styles/navigation.css';
import './styles/no-scrollbar.css'; // 🚫 NO SCROLLBAR - Must be last!
import './styles/themes/dark.css'; // 🌙 Dark theme
import './styles/themes/light.css'; // ☀️ Light theme

// 🔍 Initialize error tracking BEFORE rendering
initErrorTracking();

// �🚀 OPTIMIZATION: React 19 Concurrent Features
// Use startTransition to make initial render non-blocking
// This improves perceived performance on slower devices
const root = createRoot(document.getElementById('root'));

startTransition(() => {
  root.render(
    <StrictMode>
      <RootErrorBoundary>
        <App />
      </RootErrorBoundary>
    </StrictMode>
  );
});
