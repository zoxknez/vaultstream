import React, { useMemo } from 'react';
import { FixedSizeList as List } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';
import './VirtualList.css';

/**
 * VirtualList Component
 * 
 * Renders large lists with virtualization for optimal performance
 * Only renders visible items + buffer
 * 
 * Props:
 * - items: Array of items to render
 * - itemHeight: Height of each item (default: 100)
 * - renderItem: Function to render each item
 * - className: Additional CSS classes
 * - overscanCount: Number of items to render outside viewport (default: 3)
 */
const VirtualList = ({ 
  items = [], 
  itemHeight = 100,
  renderItem,
  className = '',
  overscanCount = 3,
  onScroll
}) => {
  // Memoize item count for performance
  const itemCount = useMemo(() => items.length, [items.length]);

  // Row renderer
  const Row = useMemo(() => {
    return ({ index, style }) => {
      const item = items[index];
      
      return (
        <div style={style} className="virtual-list-item">
          {renderItem(item, index)}
        </div>
      );
    };
  }, [items, renderItem]);

  // Handle empty state
  if (!items || items.length === 0) {
    return (
      <div className={`virtual-list-empty ${className}`}>
        <p>No items to display</p>
      </div>
    );
  }

  return (
    <div className={`virtual-list-container ${className}`}>
      <AutoSizer>
        {({ height, width }) => (
          <List
            height={height}
            width={width}
            itemCount={itemCount}
            itemSize={itemHeight}
            overscanCount={overscanCount}
            onScroll={onScroll}
            className="virtual-list"
          >
            {Row}
          </List>
        )}
      </AutoSizer>
    </div>
  );
};

/**
 * VirtualGrid Component
 * 
 * Renders grid layouts with virtualization
 * Calculates columns based on container width
 * 
 * Props:
 * - items: Array of items
 * - itemWidth: Width of each item (default: 200)
 * - itemHeight: Height of each item (default: 300)
 * - renderItem: Function to render each item
 * - gap: Gap between items (default: 20)
 */
export const VirtualGrid = ({
  items = [],
  itemWidth = 200,
  itemHeight = 300,
  renderItem,
  className = '',
  gap = 20
}) => {
  // Calculate row renderer with dynamic columns
  const Row = useMemo(() => {
    return ({ index, style, data }) => {
      const { items: gridItems, columnsPerRow, renderItem: render } = data;
      const startIndex = index * columnsPerRow;
      const endIndex = Math.min(startIndex + columnsPerRow, gridItems.length);
      
      return (
        <div style={style} className="virtual-grid-row">
          {gridItems.slice(startIndex, endIndex).map((item, i) => (
            <div 
              key={item.id || startIndex + i}
              className="virtual-grid-item"
              style={{ 
                width: itemWidth,
                height: itemHeight,
                marginRight: i < columnsPerRow - 1 ? gap : 0
              }}
            >
              {render(item, startIndex + i)}
            </div>
          ))}
        </div>
      );
    };
  }, [itemWidth, itemHeight, gap]);

  if (!items || items.length === 0) {
    return (
      <div className={`virtual-grid-empty ${className}`}>
        <p>No items to display</p>
      </div>
    );
  }

  return (
    <div className={`virtual-grid-container ${className}`}>
      <AutoSizer>
        {({ height, width }) => {
          // Calculate columns based on container width
          const columnsPerRow = Math.floor((width + gap) / (itemWidth + gap));
          const rowCount = Math.ceil(items.length / columnsPerRow);
          const rowHeight = itemHeight + gap;

          return (
            <List
              height={height}
              width={width}
              itemCount={rowCount}
              itemSize={rowHeight}
              itemData={{
                items,
                columnsPerRow,
                renderItem
              }}
              overscanCount={2}
              className="virtual-grid"
            >
              {Row}
            </List>
          );
        }}
      </AutoSizer>
    </div>
  );
};

export default VirtualList;
