/**
 * Intro Detection Utility
 * 
 * Provides heuristic-based intro detection for TV series episodes.
 * Most TV show intros fall within 10-90 seconds of episode start.
 */

/**
 * Default intro detection settings
 */
export const INTRO_DETECTION_DEFAULTS = {
  // When to start showing "Skip Intro" button (seconds)
  SHOW_START: 10,
  
  // When to stop showing "Skip Intro" button (seconds)
  SHOW_END: 90,
  
  // Where to skip to when button is clicked (seconds)
  SKIP_TO: 90,
  
  // Minimum episode duration to enable skip intro (seconds)
  // Don't show for very short content
  MIN_DURATION: 300, // 5 minutes
};

/**
 * Check if skip intro should be shown based on current playback state
 * 
 * @param {number} currentTime - Current video time in seconds
 * @param {number} duration - Total video duration in seconds
 * @param {boolean} isSeries - Whether content is a TV series (not a movie)
 * @param {Object} settings - Custom settings (optional)
 * @returns {boolean} - Whether to show skip intro button
 */
export const shouldShowSkipIntro = (
  currentTime, 
  duration, 
  isSeries = false,
  settings = INTRO_DETECTION_DEFAULTS
) => {
  // Only show for TV series, not movies
  if (!isSeries) {
    return false;
  }
  
  // Don't show for very short content
  if (duration < settings.MIN_DURATION) {
    return false;
  }
  
  // Show button during intro window
  return currentTime >= settings.SHOW_START && currentTime < settings.SHOW_END;
};

/**
 * Get the timestamp to skip to when "Skip Intro" is clicked
 * 
 * @param {Object} settings - Custom settings (optional)
 * @returns {number} - Timestamp to skip to in seconds
 */
export const getSkipToTime = (settings = INTRO_DETECTION_DEFAULTS) => {
  return settings.SKIP_TO;
};

/**
 * Advanced: Detect intro based on content patterns (future enhancement)
 * 
 * This could use:
 * - Audio fingerprinting (detect theme song)
 * - Scene detection (detect opening credits)
 * - Pattern matching across episodes
 * 
 * For now, returns default heuristic values
 */
export const detectIntroSegment = () => {
  // Placeholder for future ML-based detection
  // Could analyze audio/video patterns here
  
  return {
    introStart: INTRO_DETECTION_DEFAULTS.SHOW_START,
    introEnd: INTRO_DETECTION_DEFAULTS.SKIP_TO,
    confidence: 0.8, // Heuristic confidence
  };
};

/**
 * Check if user has already manually skipped past intro
 * (to avoid showing button again on rewind)
 * 
 * @param {number} currentTime - Current video time
 * @param {number} lastSkipTime - Time when user last skipped
 * @param {Object} settings - Custom settings
 * @returns {boolean} - Whether user already skipped
 */
export const hasAlreadySkipped = (
  currentTime,
  lastSkipTime,
  settings = INTRO_DETECTION_DEFAULTS
) => {
  if (!lastSkipTime) return false;
  
  // If user is past the intro window, consider it skipped
  return currentTime >= settings.SKIP_TO;
};

/**
 * Save skip intro preference per series (future enhancement)
 * Could store in localStorage:
 * - User always/never skips intro for specific show
 * - Custom skip times per series
 */
export const saveSkipPreference = (seriesId, preference) => {
  try {
    const key = `skip_intro_${seriesId}`;
    localStorage.setItem(key, JSON.stringify(preference));
  } catch (error) {
    console.warn('Failed to save skip intro preference:', error);
  }
};

export const loadSkipPreference = (seriesId) => {
  try {
    const key = `skip_intro_${seriesId}`;
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : null;
  } catch (error) {
    console.warn('Failed to load skip intro preference:', error);
    return null;
  }
};

export default {
  INTRO_DETECTION_DEFAULTS,
  shouldShowSkipIntro,
  getSkipToTime,
  detectIntroSegment,
  hasAlreadySkipped,
  saveSkipPreference,
  loadSkipPreference,
};
