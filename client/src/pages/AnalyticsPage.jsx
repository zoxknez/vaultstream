/**
 * Analytics Page
 * Clean dashboard with stats and charts
 */

import { BarChart3, Clock, Download, Eye, Heart, Play, Star, TrendingUp } from 'lucide-react';
import { useEffect, useState } from 'react';

const AnalyticsPage = () => {
  const [analytics, setAnalytics] = useState({});
  const [timeRange, setTimeRange] = useState('7d');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadAnalytics = async () => {
      setIsLoading(true);
      await new Promise((resolve) => setTimeout(resolve, 1000));

      setAnalytics({
        overview: {
          totalViews: 1247,
          totalWatchTime: '89h 32m',
          averageSession: '1h 23m',
          completionRate: 78
        },
        content: {
          mostWatched: 'The Matrix Resurrections',
          topGenre: 'Action',
          averageRating: 4.2,
          totalContent: 156
        },
        engagement: {
          likes: 89,
          shares: 23,
          bookmarks: 67
        },
        trends: [
          { day: 'Mon', views: 45, watchTime: 320 },
          { day: 'Tue', views: 52, watchTime: 380 },
          { day: 'Wed', views: 38, watchTime: 290 },
          { day: 'Thu', views: 61, watchTime: 420 },
          { day: 'Fri', views: 78, watchTime: 560 },
          { day: 'Sat', views: 95, watchTime: 680 },
          { day: 'Sun', views: 88, watchTime: 620 }
        ]
      });

      setIsLoading(false);
    };

    loadAnalytics();
  }, [timeRange]);

  if (isLoading) {
    return (
      <div className="netflix-loading">
        <div className="netflix-spinner"></div>
      </div>
    );
  }

  return (
    <div className="netflix-page">
      <div className="netflix-page-header">
        <h1 className="netflix-page-title">Analytics</h1>

        {/* Time Range Selector */}
        <div className="netflix-tabs">
          {['24h', '7d', '30d', '90d'].map((range) => (
            <button
              key={range}
              className={`netflix-tab ${timeRange === range ? 'active' : ''}`}
              onClick={() => setTimeRange(range)}
            >
              {range}
            </button>
          ))}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="netflix-stats-grid">
        <div className="netflix-stat-card">
          <div className="netflix-stat-icon" style={{ backgroundColor: 'var(--netflix-red)' }}>
            <Eye size={24} />
          </div>
          <div className="netflix-stat-content">
            <div className="netflix-stat-value">{analytics.overview.totalViews}</div>
            <div className="netflix-stat-label">Total Views</div>
          </div>
        </div>

        <div className="netflix-stat-card">
          <div className="netflix-stat-icon" style={{ backgroundColor: '#0080ff' }}>
            <Clock size={24} />
          </div>
          <div className="netflix-stat-content">
            <div className="netflix-stat-value">{analytics.overview.totalWatchTime}</div>
            <div className="netflix-stat-label">Watch Time</div>
          </div>
        </div>

        <div className="netflix-stat-card">
          <div className="netflix-stat-icon" style={{ backgroundColor: '#00b341' }}>
            <Play size={24} />
          </div>
          <div className="netflix-stat-content">
            <div className="netflix-stat-value">{analytics.overview.averageSession}</div>
            <div className="netflix-stat-label">Avg Session</div>
          </div>
        </div>

        <div className="netflix-stat-card">
          <div className="netflix-stat-icon" style={{ backgroundColor: '#ffa500' }}>
            <TrendingUp size={24} />
          </div>
          <div className="netflix-stat-content">
            <div className="netflix-stat-value">{analytics.overview.completionRate}%</div>
            <div className="netflix-stat-label">Completion</div>
          </div>
        </div>
      </div>

      {/* Content Stats */}
      <div className="netflix-content-section">
        <h2 className="netflix-section-title">Content Statistics</h2>
        <div className="netflix-stats-grid">
          <div className="netflix-info-card">
            <div className="netflix-info-label">Most Watched</div>
            <div className="netflix-info-value">{analytics.content.mostWatched}</div>
          </div>

          <div className="netflix-info-card">
            <div className="netflix-info-label">Top Genre</div>
            <div className="netflix-info-value">{analytics.content.topGenre}</div>
          </div>

          <div className="netflix-info-card">
            <div className="netflix-info-label">Average Rating</div>
            <div className="netflix-info-value">
              <Star size={20} fill="var(--netflix-red)" color="var(--netflix-red)" />
              {analytics.content.averageRating}
            </div>
          </div>

          <div className="netflix-info-card">
            <div className="netflix-info-label">Total Content</div>
            <div className="netflix-info-value">{analytics.content.totalContent}</div>
          </div>
        </div>
      </div>

      {/* Engagement */}
      <div className="netflix-content-section">
        <h2 className="netflix-section-title">Engagement</h2>
        <div className="netflix-engagement-grid">
          <div className="netflix-engagement-item">
            <Heart size={24} />
            <span className="value">{analytics.engagement.likes}</span>
            <span className="label">Likes</span>
          </div>
          <div className="netflix-engagement-item">
            <Download size={24} />
            <span className="value">{analytics.engagement.shares}</span>
            <span className="label">Downloads</span>
          </div>
          <div className="netflix-engagement-item">
            <BarChart3 size={24} />
            <span className="value">{analytics.engagement.bookmarks}</span>
            <span className="label">Bookmarks</span>
          </div>
        </div>
      </div>

      {/* Weekly Trends */}
      <div className="netflix-content-section">
        <h2 className="netflix-section-title">Weekly Trends</h2>
        <div className="netflix-chart">
          {analytics.trends.map((trend, index) => {
            const maxViews = Math.max(...analytics.trends.map((t) => t.views));
            const height = (trend.views / maxViews) * 100;

            return (
              <div key={index} className="netflix-chart-bar">
                <div
                  className="netflix-chart-fill"
                  style={{ height: `${height}%` }}
                  title={`${trend.views} views`}
                />
                <div className="netflix-chart-label">{trend.day}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default AnalyticsPage;
