/**
 * Image Optimization Utilities
 * Helper functions for optimizing image loading and performance
 */

/**
 * Generate srcset for responsive images
 * @param {string} baseUrl - Base image URL
 * @param {number[]} widths - Array of widths for srcset
 * @returns {string} - srcset string
 */
export function generateSrcSet(baseUrl, widths = [320, 640, 960, 1280, 1920]) {
  return widths.map((width) => `${baseUrl}?w=${width} ${width}w`).join(', ');
}

/**
 * Generate sizes attribute for responsive images
 * @param {Object} breakpoints - Object with breakpoint: size pairs
 * @returns {string} - sizes string
 */
export function generateSizes(
  breakpoints = {
    mobile: '100vw',
    tablet: '50vw',
    desktop: '33vw'
  }
) {
  const defaultBreakpoints = {
    '(max-width: 640px)': breakpoints.mobile || '100vw',
    '(max-width: 1024px)': breakpoints.tablet || '50vw',
    default: breakpoints.desktop || '33vw'
  };

  return Object.entries(defaultBreakpoints)
    .map(([query, size]) => (query === 'default' ? size : `${query} ${size}`))
    .join(', ');
}

/**
 * Lazy load image with IntersectionObserver
 * @param {HTMLImageElement} img - Image element
 * @param {Object} options - IntersectionObserver options
 */
export function lazyLoadImage(img, options = {}) {
  const defaultOptions = {
    root: null,
    rootMargin: '50px', // Start loading 50px before visible
    threshold: 0.01
  };

  const observer = new IntersectionObserver(
    (entries, observer) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const image = entry.target;

          // Load the image
          if (image.dataset.src) {
            image.src = image.dataset.src;
          }

          if (image.dataset.srcset) {
            image.srcset = image.dataset.srcset;
          }

          // Remove loading attribute
          image.removeAttribute('data-src');
          image.removeAttribute('data-srcset');

          // Add loaded class for CSS transitions
          image.classList.add('loaded');

          // Stop observing
          observer.unobserve(image);
        }
      });
    },
    { ...defaultOptions, ...options }
  );

  observer.observe(img);

  return observer;
}

/**
 * Preload critical images
 * @param {string[]} urls - Array of image URLs to preload
 * @param {string} as - Resource type (default: 'image')
 */
export function preloadImages(urls, as = 'image') {
  urls.forEach((url) => {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = as;
    link.href = url;
    document.head.appendChild(link);
  });
}

/**
 * Get optimal image format based on browser support
 * @returns {string} - Optimal format ('avif', 'webp', or 'jpg')
 */
export function getOptimalImageFormat() {
  // Check AVIF support
  const avif =
    document.createElement('canvas').toDataURL('image/avif').indexOf('data:image/avif') === 0;
  if (avif) return 'avif';

  // Check WebP support
  const webp =
    document.createElement('canvas').toDataURL('image/webp').indexOf('data:image/webp') === 0;
  if (webp) return 'webp';

  // Fallback to JPEG
  return 'jpg';
}

/**
 * Create optimized image URL with TMDB
 * @param {string} path - TMDB image path
 * @param {string} size - Size ('w185', 'w342', 'w500', 'w780', 'original')
 * @returns {string} - Full image URL
 */
export function getTMDBImageUrl(path, size = 'w500') {
  if (!path) return null;
  return `https://image.tmdb.org/t/p/${size}${path}`;
}

/**
 * Create responsive TMDB image URLs
 * @param {string} path - TMDB image path
 * @returns {Object} - Object with srcset and src
 */
export function getResponsiveTMDBImage(path) {
  if (!path) return { src: null, srcset: null };

  const sizes = ['w185', 'w342', 'w500', 'w780', 'original'];
  const widths = [185, 342, 500, 780, 1280];

  const srcset = sizes
    .map((size, index) => `${getTMDBImageUrl(path, size)} ${widths[index]}w`)
    .join(', ');

  return {
    src: getTMDBImageUrl(path, 'w500'),
    srcset: srcset,
    sizes: '(max-width: 640px) 185px, (max-width: 1024px) 342px, 500px'
  };
}

/**
 * Decode image before rendering to avoid layout shift
 * @param {HTMLImageElement} img - Image element
 * @returns {Promise} - Resolves when image is decoded
 */
export async function decodeImage(img) {
  if ('decode' in img) {
    return img.decode();
  }

  // Fallback for browsers without decode()
  return new Promise((resolve, reject) => {
    if (img.complete) {
      resolve();
    } else {
      img.onload = () => resolve();
      img.onerror = () => reject();
    }
  });
}

/**
 * Calculate blur hash placeholder (simplified)
 * @param {string} url - Image URL
 * @returns {string} - Data URL for placeholder
 */
export function getImagePlaceholder(width = 10, height = 10) {
  // Create a small canvas for blur effect
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  // Fill with gradient
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, '#1a1a1a');
  gradient.addColorStop(1, '#2a2a2a');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  return canvas.toDataURL();
}

/**
 * Create and attach a lazy-loading observer for images.
 */
export function setupLazyLoadObserver() {
  if (typeof window === 'undefined') return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const img = entry.target;
          if (img.dataset.src) {
            img.src = img.dataset.src;
            img.removeAttribute('data-src');
          }
          if (img.dataset.srcset) {
            img.srcset = img.dataset.srcset;
            img.removeAttribute('data-srcset');
          }
          img.classList.add('loaded');
          observer.unobserve(img);
        }
      });
    },
    { rootMargin: '50px', threshold: 0.01 }
  );

  // Observe all images with data-src
  document.querySelectorAll('img[data-src]').forEach((img) => {
    observer.observe(img);
  });

  return observer;
}

/**
 * Optimize image loading performance
 * - Lazy load below-the-fold images
 * - Preload critical images
 * - Use native lazy loading where supported
 */
export function optimizeImageLoading() {
  // Use native lazy loading if supported
  if ('loading' in HTMLImageElement.prototype) {
    document.querySelectorAll('img[data-src]').forEach((img) => {
      img.loading = 'lazy';
      if (img.dataset.src) {
        img.src = img.dataset.src;
        img.removeAttribute('data-src');
      }
    });
  } else {
    // Fallback to IntersectionObserver
    setupLazyLoadObserver();
  }
}

// Auto-initialize on DOM ready
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', optimizeImageLoading);
  } else {
    optimizeImageLoading();
  }
}
