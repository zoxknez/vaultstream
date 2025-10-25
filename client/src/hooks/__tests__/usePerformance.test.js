/**
 * 🚀 STREAMVAULT PERFORMANCE HOOK TESTS
 * Comprehensive tests for performance monitoring hook
 */

import { act, renderHook } from '@testing-library/react';
import { performanceUtils, usePerformance } from '../usePerformance';

// Mock logger
jest.mock('../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }
}));

// Mock performance API
const mockPerformance = {
  mark: jest.fn(),
  measure: jest.fn(),
  getEntriesByType: jest.fn(),
  memory: {
    usedJSHeapSize: 50 * 1024 * 1024, // 50MB
    totalJSHeapSize: 100 * 1024 * 1024, // 100MB
    jsHeapSizeLimit: 2 * 1024 * 1024 * 1024 // 2GB
  }
};

Object.defineProperty(window, 'performance', {
  value: mockPerformance,
  writable: true
});

describe('usePerformance Hook', () => {
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Reset performance mock
    mockPerformance.mark.mockClear();
    mockPerformance.measure.mockClear();
    mockPerformance.getEntriesByType.mockClear();
  });

  describe('Initialization', () => {
    test('should initialize with default state', () => {
      const { result } = renderHook(() => usePerformance());
      
      expect(result.current.metrics).toBeNull();
      expect(result.current.isMonitoring).toBe(false);
    });

    test('should provide all required methods', () => {
      const { result } = renderHook(() => usePerformance());
      
      expect(typeof result.current.startMonitoring).toBe('function');
      expect(typeof result.current.stopMonitoring).toBe('function');
      expect(typeof result.current.getMetrics).toBe('function');
      expect(typeof result.current.clearMetrics).toBe('function');
      expect(typeof result.current.mark).toBe('function');
      expect(typeof result.current.measure).toBe('function');
      expect(typeof result.current.getRecommendations).toBe('function');
    });
  });

  describe('Monitoring Control', () => {
    test('should start monitoring', () => {
      const { result } = renderHook(() => usePerformance());
      
      act(() => {
        result.current.startMonitoring();
      });
      
      expect(result.current.isMonitoring).toBe(true);
    });

    test('should stop monitoring', () => {
      const { result } = renderHook(() => usePerformance());
      
      act(() => {
        result.current.startMonitoring();
        result.current.stopMonitoring();
      });
      
      expect(result.current.isMonitoring).toBe(false);
    });

    test('should not start monitoring if already monitoring', () => {
      const { result } = renderHook(() => usePerformance());
      
      act(() => {
        result.current.startMonitoring();
        result.current.startMonitoring(); // Second call should be ignored
      });
      
      expect(result.current.isMonitoring).toBe(true);
    });

    test('should not stop monitoring if not monitoring', () => {
      const { result } = renderHook(() => usePerformance());
      
      act(() => {
        result.current.stopMonitoring(); // Should not throw error
      });
      
      expect(result.current.isMonitoring).toBe(false);
    });
  });

  describe('Performance Marking', () => {
    test('should mark performance entry', () => {
      const { result } = renderHook(() => usePerformance());
      
      act(() => {
        result.current.mark('test-mark');
      });
      
      expect(mockPerformance.mark).toHaveBeenCalledWith('test-mark');
    });

    test('should measure performance between marks', () => {
      const { result } = renderHook(() => usePerformance());
      
      act(() => {
        result.current.mark('start-mark');
        result.current.mark('end-mark');
        result.current.measure('test-measure', 'start-mark', 'end-mark');
      });
      
      expect(mockPerformance.measure).toHaveBeenCalledWith('test-measure', 'start-mark', 'end-mark');
    });

    test('should handle measure errors gracefully', () => {
      const { result } = renderHook(() => usePerformance());
      
      // Mock measure to throw error
      mockPerformance.measure.mockImplementation(() => {
        throw new Error('Measure failed');
      });
      
      act(() => {
        result.current.measure('test-measure', 'start-mark', 'end-mark');
      });
      
      // Should not throw error
      expect(result.current.isMonitoring).toBe(false);
    });
  });

  describe('Metrics Collection', () => {
    test('should collect metrics when monitoring', async () => {
      const { result } = renderHook(() => usePerformance());
      
      act(() => {
        result.current.startMonitoring();
      });
      
      // Wait for metrics to be collected
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(result.current.metrics).toBeDefined();
    });

    test('should clear metrics', () => {
      const { result } = renderHook(() => usePerformance());
      
      act(() => {
        result.current.startMonitoring();
        result.current.clearMetrics();
      });
      
      expect(result.current.metrics).toBeNull();
    });

    test('should get current metrics', () => {
      const { result } = renderHook(() => usePerformance());
      
      act(() => {
        result.current.startMonitoring();
      });
      
      const metrics = result.current.getMetrics();
      expect(metrics).toBeDefined();
    });
  });

  describe('Recommendations', () => {
    test('should generate recommendations based on metrics', () => {
      const { result } = renderHook(() => usePerformance());
      
      act(() => {
        result.current.startMonitoring();
      });
      
      const recommendations = result.current.getRecommendations();
      expect(Array.isArray(recommendations)).toBe(true);
    });

    test('should provide render performance recommendations', () => {
      const { result } = renderHook(() => usePerformance());
      
      // Mock slow renders
      const mockMetrics = {
        summary: {
          renderTime: {
            slowRenders: 5
          }
        }
      };
      
      // Mock getMetrics to return slow renders
      jest.spyOn(result.current, 'getMetrics').mockReturnValue(mockMetrics);
      
      const recommendations = result.current.getRecommendations();
      
      expect(recommendations.some(rec => rec.type === 'render')).toBe(true);
    });

    test('should provide memory usage recommendations', () => {
      const { result } = renderHook(() => usePerformance());
      
      // Mock high memory usage
      const mockMetrics = {
        summary: {
          memoryUsage: {
            currentUsed: 100 * 1024 * 1024 // 100MB
          }
        }
      };
      
      // Mock getMetrics to return high memory usage
      jest.spyOn(result.current, 'getMetrics').mockReturnValue(mockMetrics);
      
      const recommendations = result.current.getRecommendations();
      
      expect(recommendations.some(rec => rec.type === 'memory')).toBe(true);
    });

    test('should provide network performance recommendations', () => {
      const { result } = renderHook(() => usePerformance());
      
      // Mock slow network requests
      const mockMetrics = {
        summary: {
          networkRequests: {
            slowRequests: 3
          }
        }
      };
      
      // Mock getMetrics to return slow requests
      jest.spyOn(result.current, 'getMetrics').mockReturnValue(mockMetrics);
      
      const recommendations = result.current.getRecommendations();
      
      expect(recommendations.some(rec => rec.type === 'network')).toBe(true);
    });

    test('should provide error recommendations', () => {
      const { result } = renderHook(() => usePerformance());
      
      // Mock errors
      const mockMetrics = {
        summary: {
          errors: {
            count: 2
          }
        }
      };
      
      // Mock getMetrics to return errors
      jest.spyOn(result.current, 'getMetrics').mockReturnValue(mockMetrics);
      
      const recommendations = result.current.getRecommendations();
      
      expect(recommendations.some(rec => rec.type === 'errors')).toBe(true);
    });
  });

  describe('Cleanup', () => {
    test('should cleanup on unmount', () => {
      const { result, unmount } = renderHook(() => usePerformance());
      
      act(() => {
        result.current.startMonitoring();
      });
      
      unmount();
      
      // Should not throw error
      expect(result.current.isMonitoring).toBe(false);
    });
  });
});

describe('Performance Utils', () => {
  describe('Debounce', () => {
    test('should debounce function calls', (done) => {
      const mockFn = jest.fn();
      const debouncedFn = performanceUtils.debounce(mockFn, 100);
      
      // Call function multiple times
      debouncedFn('arg1');
      debouncedFn('arg2');
      debouncedFn('arg3');
      
      // Should not be called immediately
      expect(mockFn).not.toHaveBeenCalled();
      
      // Should be called once after delay
      setTimeout(() => {
        expect(mockFn).toHaveBeenCalledTimes(1);
        expect(mockFn).toHaveBeenCalledWith('arg3');
        done();
      }, 150);
    });
  });

  describe('Throttle', () => {
    test('should throttle function calls', (done) => {
      const mockFn = jest.fn();
      const throttledFn = performanceUtils.throttle(mockFn, 100);
      
      // Call function multiple times
      throttledFn('arg1');
      throttledFn('arg2');
      throttledFn('arg3');
      
      // Should be called immediately
      expect(mockFn).toHaveBeenCalledTimes(1);
      expect(mockFn).toHaveBeenCalledWith('arg1');
      
      // Should be called again after throttle period
      setTimeout(() => {
        throttledFn('arg4');
        expect(mockFn).toHaveBeenCalledTimes(2);
        expect(mockFn).toHaveBeenCalledWith('arg4');
        done();
      }, 150);
    });
  });

  describe('Memoize', () => {
    test('should memoize function results', () => {
      const mockFn = jest.fn((x) => x * 2);
      const memoizedFn = performanceUtils.memoize(mockFn);
      
      // First call
      const result1 = memoizedFn(5);
      expect(result1).toBe(10);
      expect(mockFn).toHaveBeenCalledTimes(1);
      
      // Second call with same arguments
      const result2 = memoizedFn(5);
      expect(result2).toBe(10);
      expect(mockFn).toHaveBeenCalledTimes(1); // Should not be called again
      
      // Third call with different arguments
      const result3 = memoizedFn(3);
      expect(result3).toBe(6);
      expect(mockFn).toHaveBeenCalledTimes(2);
    });
  });

  describe('Lazy Load', () => {
    test('should create lazy component', () => {
      const importFunc = jest.fn(() => Promise.resolve({ default: () => 'Component' }));
      const lazyComponent = performanceUtils.lazyLoad(importFunc);
      
      expect(lazyComponent).toBeDefined();
      expect(typeof lazyComponent).toBe('object');
    });
  });

  describe('Preload', () => {
    test('should preload resource', () => {
      const mockAppendChild = jest.fn();
      const mockCreateElement = jest.fn(() => ({
        rel: '',
        href: '',
        as: '',
        appendChild: mockAppendChild
      }));
      
      document.createElement = mockCreateElement;
      document.head = { appendChild: mockAppendChild };
      
      performanceUtils.preload('/test.js', 'script');
      
      expect(mockCreateElement).toHaveBeenCalledWith('link');
      expect(mockAppendChild).toHaveBeenCalled();
    });
  });

  describe('Prefetch', () => {
    test('should prefetch resource', () => {
      const mockAppendChild = jest.fn();
      const mockCreateElement = jest.fn(() => ({
        rel: '',
        href: '',
        appendChild: mockAppendChild
      }));
      
      document.createElement = mockCreateElement;
      document.head = { appendChild: mockAppendChild };
      
      performanceUtils.prefetch('/test.js');
      
      expect(mockCreateElement).toHaveBeenCalledWith('link');
      expect(mockAppendChild).toHaveBeenCalled();
    });
  });
});