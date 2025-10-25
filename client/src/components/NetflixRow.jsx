/**
 * 🎬 NETFLIX ROW COMPONENT - GRID VERSION
 * Responsive grid layout instead of horizontal scroll
 * Better for browsing and selecting content
 */

import { memo } from 'react';
import NetflixCard from './NetflixCard';

const NetflixRow = memo(function NetflixRow({ title, items, onPlayItem }) {
  return (
    <section className="netflix-row">
      <h2 className="netflix-row-title">{title}</h2>
      <div className="netflix-row-container">
        {/* Grid Items - No scroll, responsive grid */}
        <div className="netflix-row-items">
          {items.slice(0, 24).map((item) => (
            <div key={item.id} className="netflix-row-item">
              <NetflixCard item={item} onPlay={onPlayItem} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
});

export default NetflixRow;
