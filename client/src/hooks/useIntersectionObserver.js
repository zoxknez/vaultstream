/**
 * 🔍 INTERSECTION OBSERVER HOOK
 * Optimized lazy loading for images and components
 */

import { useEffect, useRef, useState } from 'react';

/**
 * useIntersectionObserver hook
 * @param {Object} options - IntersectionObserver options
 * @returns {[ref, isIntersecting]} - Ref to attach and intersection state
 */
export function useIntersectionObserver(options = {}) {
  const [isIntersecting, setIsIntersecting] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observerOptions = {
      root: options.root || null,
      rootMargin: options.rootMargin || '50px',
      threshold: options.threshold || 0.1
    };

    const observer = new IntersectionObserver(([entry]) => {
      setIsIntersecting(entry.isIntersecting);

      // Disconnect after first intersection if once=true
      if (entry.isIntersecting && options.once) {
        observer.disconnect();
      }
    }, observerOptions);

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [options.root, options.rootMargin, options.threshold, options.once]);

  return [ref, isIntersecting];
}

/**
 * useLazyImage hook
 * Lazy loads images with intersection observer
 */
export function useLazyImage(src, placeholder = null) {
  const [imageSrc, setImageSrc] = useState(placeholder);
  const [ref, isIntersecting] = useIntersectionObserver({ once: true, rootMargin: '100px' });

  useEffect(() => {
    if (isIntersecting && src) {
      // Preload image
      const img = new Image();
      img.src = src;
      img.onload = () => {
        setImageSrc(src);
      };
      img.onerror = () => {
        console.warn('Failed to load image:', src);
        setImageSrc(placeholder);
      };
    }
  }, [isIntersecting, src, placeholder]);

  return [ref, imageSrc];
}

export default useIntersectionObserver;
