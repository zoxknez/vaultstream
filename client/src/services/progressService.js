import collectionsService from './collectionsService';

// Video progress tracking service
class ProgressService {
  constructor() {
    this.storageKey = 'seedbox-video-progress';
  }

  // Get all video progress data
  getAllProgress() {
    try {
      const data = localStorage.getItem(this.storageKey);
      return data ? JSON.parse(data) : {};
    } catch (error) {
      console.error('Error reading progress data:', error);
      return {};
    }
  }

  // Get progress for a specific video
  getProgress(torrentHash, fileIndex) {
    const allProgress = this.getAllProgress();
    const key = `${torrentHash}-${fileIndex}`;
    return allProgress[key] || null;
  }

  // Save progress for a video
  saveProgress(torrentHash, fileIndex, currentTime, duration, fileName, lastSubtitle = null) {
    try {
      const allProgress = this.getAllProgress();
      const key = `${torrentHash}-${fileIndex}`;
      
      const progressData = {
        torrentHash,
        fileIndex,
        fileName,
        currentTime,
        duration,
        percentage: (currentTime / duration) * 100,
        lastWatched: new Date().toISOString(),
        isCompleted: (currentTime / duration) > 0.9, // Mark as completed if watched > 90%
        lastSubtitle: lastSubtitle // Store last used subtitle
      };

      allProgress[key] = progressData;
      localStorage.setItem(this.storageKey, JSON.stringify(allProgress));
      
      console.log(`💾 Saved progress: ${fileName} - ${this.formatTime(currentTime)}/${this.formatTime(duration)} (${Math.round(progressData.percentage)}%)`);

      try {
        collectionsService.updateContinueWatching({
          torrentHash,
          torrentName: fileName,
          position: currentTime,
          duration,
          tmdbData: progressData.metadata || null
        });
      } catch (error) {
        console.warn('Failed to update continue watching from progressService', error);
      }
      
      return progressData;
    } catch (error) {
      console.error('Error saving progress:', error);
      return null;
    }
  }

  // Update subtitle selection for a video
  updateSubtitle(torrentHash, fileIndex, subtitleData) {
    try {
      const allProgress = this.getAllProgress();
      const key = `${torrentHash}-${fileIndex}`;
      
      if (allProgress[key]) {
        allProgress[key].lastSubtitle = subtitleData;
        localStorage.setItem(this.storageKey, JSON.stringify(allProgress));
        console.log(`💾 Updated subtitle for ${key}:`, subtitleData?.filename || 'none');
      }
      
      return allProgress[key] || null;
    } catch (error) {
      console.error('Error updating subtitle:', error);
      return null;
    }
  }

  // Get last used subtitle for a video
  getLastSubtitle(torrentHash, fileIndex) {
    const progress = this.getProgress(torrentHash, fileIndex);
    return progress?.lastSubtitle || null;
  }

  // Remove progress for a video
  removeProgress(torrentHash, fileIndex) {
    try {
      const allProgress = this.getAllProgress();
      const key = `${torrentHash}-${fileIndex}`;
      delete allProgress[key];
      localStorage.setItem(this.storageKey, JSON.stringify(allProgress));
      console.log(`🗑️ Removed progress for ${key}`);
    } catch (error) {
      console.error('Error removing progress:', error);
    }
  }

  // Mark episode as watched (100% completion)
  markAsWatched(torrentHash, fileIndex, fileName, duration = 0) {
    try {
      const allProgress = this.getAllProgress();
      const key = `${torrentHash}-${fileIndex}`;
      
      const progressData = {
        torrentHash,
        fileIndex,
        fileName: fileName || `Episode ${fileIndex}`,
        currentTime: duration || 0,
        duration: duration || 0,
        percentage: 100,
        lastWatched: new Date().toISOString(),
        isCompleted: true,
        markedAsWatched: true // Flag to indicate manual mark
      };

      allProgress[key] = progressData;
      localStorage.setItem(this.storageKey, JSON.stringify(allProgress));
      
      console.log(`✅ Marked as watched: ${fileName}`);
      return progressData;
    } catch (error) {
      console.error('Error marking as watched:', error);
      return null;
    }
  }

  // Mark episode as unwatched (remove progress)
  markAsUnwatched(torrentHash, fileIndex) {
    this.removeProgress(torrentHash, fileIndex);
  }

  // Batch mark multiple episodes as watched
  markMultipleAsWatched(episodes) {
    try {
      const allProgress = this.getAllProgress();
      let count = 0;

      episodes.forEach(episode => {
        const key = `${episode.torrentHash}-${episode.fileIndex}`;
        allProgress[key] = {
          torrentHash: episode.torrentHash,
          fileIndex: episode.fileIndex,
          fileName: episode.fileName || `Episode ${episode.fileIndex}`,
          currentTime: episode.duration || 0,
          duration: episode.duration || 0,
          percentage: 100,
          lastWatched: new Date().toISOString(),
          isCompleted: true,
          markedAsWatched: true
        };
        count++;
      });

      localStorage.setItem(this.storageKey, JSON.stringify(allProgress));
      console.log(`✅ Marked ${count} episodes as watched`);
      
      return count;
    } catch (error) {
      console.error('Error batch marking as watched:', error);
      return 0;
    }
  }

  // Check if episode is marked as watched
  isWatched(torrentHash, fileIndex) {
    const progress = this.getProgress(torrentHash, fileIndex);
    return progress?.isCompleted || false;
  }

  // Get all videos with progress
  getRecentVideos(limit = 10) {
    const allProgress = this.getAllProgress();
    const videos = Object.values(allProgress)
      .filter(progress => progress.percentage >= 1) // Only videos that were actually watched
      .sort((a, b) => new Date(b.lastWatched) - new Date(a.lastWatched))
      .slice(0, limit);
    
    return videos;
  }

  // Check if user should resume video
  shouldResumeVideo(torrentHash, fileIndex) {
    const progress = this.getProgress(torrentHash, fileIndex);
    if (!progress) return null;
    
    // Don't resume if already completed or less than 30 seconds watched
    if (progress.isCompleted || progress.currentTime < 30) return null;
    
    return {
      currentTime: progress.currentTime,
      percentage: progress.percentage,
      lastWatched: progress.lastWatched,
      fileName: progress.fileName
    };
  }

  // Format time for display
  formatTime(seconds) {
    if (isNaN(seconds) || seconds < 0) return '0:00';
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }

  // Format relative time (e.g., "2 hours ago")
  formatRelativeTime(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor(diffMs / (1000 * 60));

    if (diffDays > 7) {
      return date.toLocaleDateString();
    } else if (diffDays > 0) {
      return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    } else if (diffHours > 0) {
      return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    } else if (diffMinutes > 0) {
      return `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''} ago`;
    }
    return 'Just now';
  }

  // Clear all progress data
  clearAllProgress() {
    try {
      localStorage.removeItem(this.storageKey);
      console.log('🗑️ Cleared all video progress data');
    } catch (error) {
      console.error('Error clearing progress data:', error);
    }
  }

  // Get statistics
  getStats() {
    const allProgress = this.getAllProgress();
    const videos = Object.values(allProgress);
    
    const completed = videos.filter(v => v.isCompleted).length;
    const inProgress = videos.filter(v => !v.isCompleted && v.percentage >= 1).length;
    const totalWatchTime = videos.reduce((total, v) => total + (v.currentTime || 0), 0);
    
    return {
      totalVideos: videos.length,
      completed,
      inProgress,
      totalWatchTime: this.formatTime(totalWatchTime)
    };
  }
}

export const progressService = new ProgressService();
export default progressService;
