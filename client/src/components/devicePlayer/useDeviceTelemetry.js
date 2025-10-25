import { useCallback, useEffect, useMemo, useState } from 'react';

const getNavigatorConnection = () => {
  if (typeof navigator === 'undefined') {
    return undefined;
  }

  return navigator.connection || navigator.mozConnection || navigator.webkitConnection;
};

const mapEffectiveTypeToQuality = (effectiveType) => {
  switch (effectiveType) {
    case '4g':
      return 'excellent';
    case '3g':
      return 'good';
    case '2g':
      return 'poor';
    default:
      return 'unknown';
  }
};

export const useDeviceTelemetry = ({
  showStats,
  getRecommendations,
  showToast,
  getDeviceStatus
}) => {
  const [networkQuality, setNetworkQuality] = useState('unknown');
  const [torrentStats, setTorrentStats] = useState(null);

  const connection = useMemo(() => getNavigatorConnection(), []);

  const handleNetworkQualityChange = useCallback(() => {
    if (!connection) {
      return;
    }

    const quality = mapEffectiveTypeToQuality(connection.effectiveType);
    setNetworkQuality(quality);
  }, [connection]);

  const handleTorrentStatsUpdate = useCallback(() => {
    // Placeholder values until real torrent stats are wired in
    setTorrentStats({
      downloadSpeed: Math.random() * 1_000_000,
      uploadSpeed: Math.random() * 100_000,
      peers: Math.floor(Math.random() * 100),
      seeds: Math.floor(Math.random() * 50),
      progress: Math.random() * 100
    });
  }, []);

  const handlePerformanceRecommendations = useCallback(() => {
    if (!getRecommendations) {
      return;
    }

    const recommendations = getRecommendations() ?? [];
    if (!recommendations.length) {
      return;
    }

    recommendations.forEach((recommendation) => {
      if (!showToast) {
        return;
      }

      switch (recommendation.priority) {
        case 'high':
          showToast(recommendation.message, 'error');
          break;
        case 'medium':
          showToast(recommendation.message, 'warning');
          break;
        default:
          showToast(recommendation.message, 'info');
          break;
      }
    });
  }, [getRecommendations, showToast]);

  const handleDeviceStatusChanges = useCallback(() => {
    if (!getDeviceStatus) {
      return;
    }

    const status = getDeviceStatus();
    if (!status) {
      return;
    }

    if (status.level === 'error') {
      status.errors?.forEach((message) => showToast?.(message, 'error'));
    } else if (status.level === 'warning') {
      status.warnings?.forEach((message) => showToast?.(message, 'warning'));
    } else if (status.level === 'info') {
      status.recommendations?.forEach((message) => showToast?.(message, 'info'));
    }
  }, [getDeviceStatus, showToast]);

  useEffect(() => {
    if (!connection) {
      return undefined;
    }

    handleNetworkQualityChange();

    if (typeof connection.addEventListener === 'function') {
      connection.addEventListener('change', handleNetworkQualityChange);
      return () => connection.removeEventListener('change', handleNetworkQualityChange);
    }

    const previousChange = connection.onchange;
    connection.onchange = handleNetworkQualityChange;

    return () => {
      if (connection.onchange === handleNetworkQualityChange) {
        connection.onchange = previousChange ?? null;
      }
    };
  }, [connection, handleNetworkQualityChange]);

  useEffect(() => {
    if (!showStats) {
      return undefined;
    }

    handleTorrentStatsUpdate();
    const interval = setInterval(handleTorrentStatsUpdate, 5_000);
    return () => clearInterval(interval);
  }, [showStats, handleTorrentStatsUpdate]);

  useEffect(() => {
    handlePerformanceRecommendations();
    const interval = setInterval(handlePerformanceRecommendations, 60_000);
    return () => clearInterval(interval);
  }, [handlePerformanceRecommendations]);

  useEffect(() => {
    handleDeviceStatusChanges();
    const interval = setInterval(handleDeviceStatusChanges, 45_000);
    return () => clearInterval(interval);
  }, [handleDeviceStatusChanges]);

  return { networkQuality, torrentStats };
};

export default useDeviceTelemetry;
