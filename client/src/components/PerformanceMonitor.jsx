import React, { useState, useEffect } from 'react';
import { Activity, Zap, Clock, Database } from 'lucide-react';
import './PerformanceMonitor.css';

/**
 * PerformanceMonitor Component
 * 
 * Real-time performance metrics display (dev mode only)
 * Shows FPS, memory usage, load time, cache size
 */
const PerformanceMonitor = ({ enabled = Boolean(import.meta.env.DEV) }) => {
  const [metrics, setMetrics] = useState({
    fps: 0,
    memory: 0,
    loadTime: 0,
    cacheSize: 0
  });
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!enabled) return;

    let frameCount = 0;
    let lastTime = performance.now();
    let rafId;

    // FPS Calculator
    const calculateFPS = () => {
      frameCount++;
      const currentTime = performance.now();
      
      if (currentTime >= lastTime + 1000) {
        const fps = Math.round((frameCount * 1000) / (currentTime - lastTime));
        
        setMetrics(prev => ({
          ...prev,
          fps
        }));
        
        frameCount = 0;
        lastTime = currentTime;
      }
      
      rafId = requestAnimationFrame(calculateFPS);
    };

    // Memory Usage (if available)
    const updateMemory = () => {
      if (performance.memory) {
        const usedMemory = Math.round(performance.memory.usedJSHeapSize / 1048576); // MB
        setMetrics(prev => ({
          ...prev,
          memory: usedMemory
        }));
      }
    };

    // Load Time
    const updateLoadTime = () => {
      const perfData = performance.timing;
      const loadTime = perfData.loadEventEnd - perfData.navigationStart;
      
      setMetrics(prev => ({
        ...prev,
        loadTime: Math.round(loadTime)
      }));
    };

    // Cache Size Estimate
    const updateCacheSize = () => {
      let totalSize = 0;
      
      for (let key in localStorage) {
        if (Object.prototype.hasOwnProperty.call(localStorage, key)) {
          totalSize += localStorage[key].length + key.length;
        }
      }
      
      setMetrics(prev => ({
        ...prev,
        cacheSize: Math.round(totalSize / 1024) // KB
      }));
    };

    // Initialize
    calculateFPS();
    updateLoadTime();
    
    // Update intervals
    const memoryInterval = setInterval(updateMemory, 2000);
    const cacheInterval = setInterval(updateCacheSize, 5000);

    // Keyboard shortcut: Ctrl+Shift+P to toggle
    const handleKeyPress = (e) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'P') {
        setVisible(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyPress);

    return () => {
      cancelAnimationFrame(rafId);
      clearInterval(memoryInterval);
      clearInterval(cacheInterval);
      window.removeEventListener('keydown', handleKeyPress);
    };
  }, [enabled]);

  if (!enabled || !visible) return null;

  const { fps, memory, loadTime, cacheSize } = metrics;

  // FPS color coding
  const getFPSColor = () => {
    if (fps >= 55) return '#10b981'; // Green
    if (fps >= 30) return '#f59e0b'; // Amber
    return '#ef4444'; // Red
  };

  return (
    <div className="performance-monitor">
      <div className="performance-header">
        <Activity size={14} />
        <span>Performance</span>
        <button 
          className="btn-close-monitor"
          onClick={() => setVisible(false)}
          title="Close (Ctrl+Shift+P)"
        >
          ×
        </button>
      </div>

      <div className="performance-metrics">
        {/* FPS */}
        <div className="metric">
          <div className="metric-icon" style={{ color: getFPSColor() }}>
            <Zap size={16} />
          </div>
          <div className="metric-info">
            <span className="metric-label">FPS</span>
            <span className="metric-value" style={{ color: getFPSColor() }}>
              {fps}
            </span>
          </div>
        </div>

        {/* Memory */}
        {memory > 0 && (
          <div className="metric">
            <div className="metric-icon">
              <Database size={16} />
            </div>
            <div className="metric-info">
              <span className="metric-label">Memory</span>
              <span className="metric-value">{memory} MB</span>
            </div>
          </div>
        )}

        {/* Load Time */}
        <div className="metric">
          <div className="metric-icon">
            <Clock size={16} />
          </div>
          <div className="metric-info">
            <span className="metric-label">Load</span>
            <span className="metric-value">{loadTime}ms</span>
          </div>
        </div>

        {/* Cache Size */}
        <div className="metric">
          <div className="metric-icon">
            <Database size={16} />
          </div>
          <div className="metric-info">
            <span className="metric-label">Cache</span>
            <span className="metric-value">{cacheSize} KB</span>
          </div>
        </div>
      </div>

      <div className="performance-hint">
        Press Ctrl+Shift+P to toggle
      </div>
    </div>
  );
};

export default PerformanceMonitor;
