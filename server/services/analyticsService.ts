import { logger } from '../utils/logger';

export interface AnalyticsEvent {
  id: string;
  userId?: string;
  sessionId: string;
  event: string;
  category: string;
  properties: Record<string, any>;
  timestamp: string;
  userAgent?: string;
  ip?: string;
}

export interface AnalyticsMetrics {
  totalEvents: number;
  uniqueUsers: number;
  topEvents: Array<{ event: string; count: number }>;
  topCategories: Array<{ category: string; count: number }>;
  timeRange: {
    start: string;
    end: string;
  };
}

export class AnalyticsService {
  private events: AnalyticsEvent[] = [];
  private sessions: Set<string> = new Set();

  /**
   * Track an analytics event
   */
  async trackEvent(event: Omit<AnalyticsEvent, 'id' | 'timestamp'>): Promise<{
    success: boolean;
    eventId?: string;
    error?: string;
  }> {
    try {
      const analyticsEvent: AnalyticsEvent = {
        ...event,
        id: this.generateId(),
        timestamp: new Date().toISOString()
      };

      this.events.push(analyticsEvent);
      
      if (event.userId) {
        this.sessions.add(event.sessionId);
      }

      logger.info(`Analytics event tracked: ${event.event}`, {
        category: event.category,
        userId: event.userId,
        sessionId: event.sessionId
      });

      return {
        success: true,
        eventId: analyticsEvent.id
      };
    } catch (error) {
      logger.error('Track event error:', error);
      return {
        success: false,
        error: 'Failed to track event'
      };
    }
  }

  /**
   * Get analytics metrics
   */
  async getMetrics(timeRange?: { start: string; end: string }): Promise<{
    success: boolean;
    metrics?: AnalyticsMetrics;
    error?: string;
  }> {
    try {
      let filteredEvents = this.events;

      if (timeRange) {
        const startDate = new Date(timeRange.start);
        const endDate = new Date(timeRange.end);
        
        filteredEvents = this.events.filter(event => {
          const eventDate = new Date(event.timestamp);
          return eventDate >= startDate && eventDate <= endDate;
        });
      }

      const totalEvents = filteredEvents.length;
      const uniqueUsers = new Set(filteredEvents.map(e => e.userId).filter(Boolean)).size;

      // Top events
      const eventCounts = new Map<string, number>();
      filteredEvents.forEach(event => {
        eventCounts.set(event.event, (eventCounts.get(event.event) || 0) + 1);
      });

      const topEvents = Array.from(eventCounts.entries())
        .map(([event, count]) => ({ event, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      // Top categories
      const categoryCounts = new Map<string, number>();
      filteredEvents.forEach(event => {
        categoryCounts.set(event.category, (categoryCounts.get(event.category) || 0) + 1);
      });

      const topCategories = Array.from(categoryCounts.entries())
        .map(([category, count]) => ({ category, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      const metrics: AnalyticsMetrics = {
        totalEvents,
        uniqueUsers,
        topEvents,
        topCategories,
        timeRange: {
          start: timeRange?.start || (filteredEvents.length > 0 ? filteredEvents[0].timestamp : new Date().toISOString()),
          end: timeRange?.end || new Date().toISOString()
        }
      };

      return {
        success: true,
        metrics
      };
    } catch (error) {
      logger.error('Get metrics error:', error);
      return {
        success: false,
        error: 'Failed to get metrics'
      };
    }
  }

  /**
   * Get events for a specific user
   */
  async getUserEvents(userId: string, limit = 100): Promise<{
    success: boolean;
    events?: AnalyticsEvent[];
    error?: string;
  }> {
    try {
      const userEvents = this.events
        .filter(event => event.userId === userId)
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, limit);

      return {
        success: true,
        events: userEvents
      };
    } catch (error) {
      logger.error('Get user events error:', error);
      return {
        success: false,
        error: 'Failed to get user events'
      };
    }
  }

  /**
   * Get events for a specific session
   */
  async getSessionEvents(sessionId: string, limit = 100): Promise<{
    success: boolean;
    events?: AnalyticsEvent[];
    error?: string;
  }> {
    try {
      const sessionEvents = this.events
        .filter(event => event.sessionId === sessionId)
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, limit);

      return {
        success: true,
        events: sessionEvents
      };
    } catch (error) {
      logger.error('Get session events error:', error);
      return {
        success: false,
        error: 'Failed to get session events'
      };
    }
  }

  /**
   * Clear old events (cleanup)
   */
  async clearOldEvents(olderThanDays = 30): Promise<{
    success: boolean;
    deletedCount?: number;
    error?: string;
  }> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

      const initialCount = this.events.length;
      this.events = this.events.filter(event => new Date(event.timestamp) > cutoffDate);
      const deletedCount = initialCount - this.events.length;

      logger.info(`Cleared ${deletedCount} old analytics events`);

      return {
        success: true,
        deletedCount
      };
    } catch (error) {
      logger.error('Clear old events error:', error);
      return {
        success: false,
        error: 'Failed to clear old events'
      };
    }
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }
}

export const analyticsService = new AnalyticsService();
export default analyticsService;