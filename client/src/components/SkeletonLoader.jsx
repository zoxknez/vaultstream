import React from 'react';
import './SkeletonLoader.css';

// Generic Skeleton component
export const Skeleton = ({ width, height, className = '', style = {} }) => (
  <div
    className={`skeleton ${className}`}
    style={{
      width: width || '100%',
      height: height || '20px',
      ...style
    }}
  />
);

// Card Skeleton
export const SkeletonCard = ({ count = 1 }) => (
  <>
    {Array.from({ length: count }).map((_, index) => (
      <div key={index} className="skeleton-card">
        <Skeleton height="200px" className="skeleton-card-image" />
        <div className="skeleton-card-content">
          <Skeleton width="70%" height="20px" />
          <Skeleton width="90%" height="16px" style={{ marginTop: '8px' }} />
          <Skeleton width="50%" height="16px" style={{ marginTop: '8px' }} />
        </div>
      </div>
    ))}
  </>
);

// List Item Skeleton
export const SkeletonList = ({ count = 5 }) => (
  <div className="skeleton-list">
    {Array.from({ length: count }).map((_, index) => (
      <div key={index} className="skeleton-list-item">
        <Skeleton width="48px" height="48px" className="skeleton-list-icon" />
        <div className="skeleton-list-content">
          <Skeleton width="60%" height="18px" />
          <Skeleton width="40%" height="14px" style={{ marginTop: '6px' }} />
        </div>
      </div>
    ))}
  </div>
);

// Episode Grid Skeleton
export const SkeletonEpisodeGrid = ({ count = 6 }) => (
  <div className="skeleton-episode-grid">
    {Array.from({ length: count }).map((_, index) => (
      <div key={index} className="skeleton-episode-card">
        <Skeleton height="120px" className="skeleton-episode-thumbnail" />
        <div className="skeleton-episode-info">
          <Skeleton width="80%" height="16px" />
          <Skeleton width="50%" height="14px" style={{ marginTop: '6px' }} />
        </div>
      </div>
    ))}
  </div>
);

// Search Result Skeleton
export const SkeletonSearchResult = ({ count = 5 }) => (
  <div className="skeleton-search-results">
    {Array.from({ length: count }).map((_, index) => (
      <div key={index} className="skeleton-search-result">
        <div className="skeleton-result-main">
          <Skeleton width="60px" height="60px" className="skeleton-result-icon" />
          <div className="skeleton-result-content">
            <Skeleton width="70%" height="20px" />
            <Skeleton width="90%" height="14px" style={{ marginTop: '6px' }} />
            <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
              <Skeleton width="80px" height="12px" />
              <Skeleton width="80px" height="12px" />
              <Skeleton width="80px" height="12px" />
            </div>
          </div>
        </div>
        <Skeleton width="100px" height="36px" className="skeleton-result-button" />
      </div>
    ))}
  </div>
);

// Hero Section Skeleton
export const SkeletonHero = () => (
  <div className="skeleton-hero">
    <div className="skeleton-hero-content">
      <Skeleton width="200px" height="28px" />
      <Skeleton width="100%" height="60px" style={{ marginTop: '16px' }} />
      <Skeleton width="80%" height="20px" style={{ marginTop: '12px' }} />
      <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
        <Skeleton width="150px" height="48px" />
        <Skeleton width="150px" height="48px" />
      </div>
    </div>
  </div>
);

// Stats Bar Skeleton
export const SkeletonStats = ({ count = 4 }) => (
  <div className="skeleton-stats">
    {Array.from({ length: count }).map((_, index) => (
      <div key={index} className="skeleton-stat-card">
        <Skeleton width="40px" height="40px" className="skeleton-stat-icon" />
        <div className="skeleton-stat-content">
          <Skeleton width="60px" height="24px" />
          <Skeleton width="80px" height="14px" style={{ marginTop: '6px' }} />
        </div>
      </div>
    ))}
  </div>
);

export default Skeleton;
