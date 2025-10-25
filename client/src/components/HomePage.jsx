import { Sparkles } from 'lucide-react';
import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import ContinueWatchingRail from './ContinueWatchingRail';
import Footer from './Footer';
import './HomePage-new.css';

const TrendingSection = lazy(() => import('./TrendingSection'));
const PopularSection = lazy(() => import('./PopularSection'));
const SmartRecommendations = lazy(() => import('./SmartRecommendations'));

const SectionSkeleton = ({ title }) => (
  <div
    className="page-panel home-panel skeleton-panel"
    role="status"
    aria-label={`Loading ${title}`}
  >
    <div className="home-section-skeleton">
      <div className="home-section-shimmer" />
      <span className="home-section-label">{title}</span>
    </div>
  </div>
);

const HomePage = () => {
  const [smartVisible, setSmartVisible] = useState(false);
  const smartAnchorRef = useRef(null);

  useEffect(() => {
    if (smartVisible) {
      return;
    }

    if (typeof window === 'undefined') {
      return;
    }

    if (!('IntersectionObserver' in window) || !smartAnchorRef.current) {
      setSmartVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setSmartVisible(true);
            observer.disconnect();
          }
        });
      },
      { rootMargin: '200px' }
    );

    observer.observe(smartAnchorRef.current);

    return () => observer.disconnect();
  }, [smartVisible]);

  return (
    <div className="page-shell home-page">
      <div className="page-shell-content">
        <div className="page-hero home-hero">
          <div className="page-hero-header">
            <div className="page-hero-icon home-hero-icon">
              <Sparkles size={28} />
            </div>
            <div>
              <h1 className="page-hero-title">Dobro došli nazad</h1>
              <p className="page-hero-subtitle">
                Nastavite tamo gde ste stali, otkrijte pametne preporuke i trendove u katalogu.
              </p>
            </div>
          </div>
        </div>

        <div className="page-main">
          <div className="home-content">
            <div className="page-panels home-panels">
              <div className="page-panel home-panel">
                <ContinueWatchingRail />
              </div>

              <Suspense fallback={<SectionSkeleton title="Trending now" />}>
                <div className="page-panel home-panel">
                  <TrendingSection />
                </div>
              </Suspense>

              <div ref={smartAnchorRef} className="smart-rec-placeholder">
                {smartVisible ? (
                  <Suspense fallback={<SectionSkeleton title="Smart recommendations" />}>
                    <div className="page-panel home-panel">
                      <SmartRecommendations />
                    </div>
                  </Suspense>
                ) : (
                  <SectionSkeleton title="Smart recommendations" />
                )}
              </div>

              <Suspense fallback={<SectionSkeleton title="Popular right now" />}>
                <div className="page-panel home-panel">
                  <PopularSection />
                </div>
              </Suspense>
            </div>
          </div>
        </div>

        <Footer />
      </div>
    </div>
  );
};

export default HomePage;
