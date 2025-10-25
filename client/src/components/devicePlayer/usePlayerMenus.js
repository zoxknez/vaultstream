import { useCallback, useState } from 'react';

const usePlayerMenus = () => {
  const [showSettings, setShowSettings] = useState(false);
  const [showStats, setShowStats] = useState(false);

  const toggleSettings = useCallback(() => {
    setShowSettings((previous) => !previous);
  }, []);

  const toggleStats = useCallback(() => {
    setShowStats((previous) => !previous);
  }, []);

  return {
    showSettings,
    setShowSettings,
    toggleSettings,
    showStats,
    setShowStats,
    toggleStats
  };
};

export default usePlayerMenus;
