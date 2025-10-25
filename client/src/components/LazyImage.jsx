import React, { useState, useEffect } from 'react';
import { Film } from 'lucide-react';
import './LazyImage.css';

/**
 * LazyImage Component
 * 
 * Optimized image loading with:
 * - Intersection Observer for viewport detection
 * - Blur-up placeholder effect
 * - Error handling with fallback
 * - Loading skeleton
 */
const LazyImage = ({ 
  src, 
  alt, 
  placeholder, 
  className = '',
  width,
  height,
  onLoad,
  onError,
  fallback
}) => {
  const [imageSrc, setImageSrc] = useState(placeholder || '');
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [isInView, setIsInView] = useState(false);

  // Intersection Observer for lazy loading
  useEffect(() => {
    const imgElement = document.querySelector(`[data-src="${src}"]`);
    if (!imgElement) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInView(true);
            observer.disconnect();
          }
        });
      },
      {
        threshold: 0.01,
        rootMargin: '100px' // Load 100px before entering viewport
      }
    );

    observer.observe(imgElement);

    return () => {
      observer.disconnect();
    };
  }, [src]);

  // Load image when in view
  useEffect(() => {
    if (!isInView || !src) return;

    const img = new Image();

    img.onload = () => {
      setImageSrc(src);
      setImageLoaded(true);
      setImageError(false);
      onLoad?.();
    };

    img.onerror = () => {
      setImageError(true);
      setImageLoaded(false);
      if (fallback) {
        setImageSrc(fallback);
      }
      onError?.();
    };

    img.src = src;

    return () => {
      img.onload = null;
      img.onerror = null;
    };
  }, [src, isInView, fallback, onLoad, onError]);

  // Show error state
  if (imageError && !fallback) {
    return (
      <div 
        className={`lazy-image-error ${className}`}
        style={{ width, height }}
      >
        <Film size={48} opacity={0.3} />
        <span>Image unavailable</span>
      </div>
    );
  }

  return (
    <div 
      className={`lazy-image-container ${className}`}
      style={{ width, height }}
      data-src={src}
    >
      {/* Placeholder/Loading State */}
      {!imageLoaded && (
        <div className="lazy-image-skeleton">
          <div className="skeleton-shimmer"></div>
        </div>
      )}

      {/* Actual Image */}
      {imageSrc && (
        <img
          src={imageSrc}
          alt={alt}
          className={`lazy-image ${imageLoaded ? 'loaded' : 'loading'}`}
          style={{ width, height }}
          loading="lazy"
        />
      )}
    </div>
  );
};

export default LazyImage;
