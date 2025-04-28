// Music utilities for BPM detection, categorization, and tag management
// Used to classify and analyze music for workout purposes

class MusicUtilsService {
  constructor() {
    // Workout intensity categories by BPM
    this.intensityRanges = {
      'Relaxation': { min: 60, max: 90 },
      'Warm Up': { min: 90, max: 120 },
      'Light Cardio': { min: 120, max: 140 },
      'Moderate Cardio': { min: 140, max: 160 },
      'Intense Cardio': { min: 160, max: 180 },
      'High Intensity': { min: 180, max: 200 }
    };
    
    // Common music genre tags
    this.genreTags = [
      'Rock', 'Pop', 'Hip Hop', 'R&B', 'Electronic', 'Dance', 
      'Metal', 'Jazz', 'Classical', 'Country', 'Folk', 'Indie',
      'Alternative', 'EDM', 'House', 'Techno', 'Trance', 'Dubstep',
      'Drum & Bass', 'Reggae', 'Latin', 'K-Pop', 'J-Pop', 'Funk',
      'Soul', 'Blues', 'Ambient', 'Workout', 'Motivational'
    ];
    
    // Workout music mood tags
    this.moodTags = [
      'Energetic', 'Intense', 'Uplifting', 'Motivational', 'Aggressive',
      'Upbeat', 'Powerful', 'Calm', 'Relaxed', 'Focused', 'Determined',
      'Happy', 'Euphoric', 'Angry', 'Dark', 'Melancholic', 'Epic'
    ];
  }
  
  /**
   * Get workout intensity category based on BPM
   * @param {number} bpm - Beats per minute
   * @returns {string} - Intensity category name
   */
  getIntensityCategory(bpm) {
    if (!bpm || typeof bpm !== 'number') {
      return 'Unknown';
    }
    
    for (const [category, range] of Object.entries(this.intensityRanges)) {
      if (bpm >= range.min && bpm <= range.max) {
        return category;
      }
    }
    
    if (bpm < 60) return 'Relaxation';
    if (bpm > 200) return 'High Intensity';
    
    return 'Unknown';
  }
  
  /**
   * Get recommended music for a specific workout intensity
   * @param {string} intensity - Workout intensity category
   * @returns {Object} - Recommended BPM range and genre tags
   */
  getRecommendedMusic(intensity) {
    const intensityMap = {
      'warming_up': {
        bpmRange: this.intensityRanges['Warm Up'],
        genres: ['Pop', 'R&B', 'Funk', 'Soul', 'Jazz'],
        mood: ['Upbeat', 'Happy', 'Relaxed']
      },
      'cardio': {
        bpmRange: this.intensityRanges['Moderate Cardio'],
        genres: ['Pop', 'Dance', 'Electronic', 'EDM', 'Hip Hop'],
        mood: ['Energetic', 'Uplifting', 'Upbeat']
      },
      'hiit': {
        bpmRange: this.intensityRanges['High Intensity'],
        genres: ['Electronic', 'Rock', 'Metal', 'Dubstep', 'Drum & Bass'],
        mood: ['Intense', 'Aggressive', 'Powerful']
      },
      'strength': {
        bpmRange: this.intensityRanges['Light Cardio'],
        genres: ['Rock', 'Hip Hop', 'Metal', 'Alternative'],
        mood: ['Powerful', 'Aggressive', 'Determined']
      },
      'cooldown': {
        bpmRange: this.intensityRanges['Relaxation'],
        genres: ['Ambient', 'Classical', 'Jazz', 'Acoustic'],
        mood: ['Calm', 'Relaxed', 'Melancholic']
      }
    };
    
    return intensityMap[intensity] || {
      bpmRange: { min: 120, max: 140 },
      genres: ['Pop', 'Rock', 'Electronic'],
      mood: ['Energetic', 'Uplifting']
    };
  }
  
  /**
   * Estimate BPM from a YouTube video title and genre
   * Uses common patterns in music titles and descriptions
   * @param {string} title - Video title
   * @param {string} description - Video description
   * @returns {number|null} - Estimated BPM or null if cannot determine
   */
  estimateBPM(title, description = '') {
    // Try to find explicit BPM mentions in title or description
    const bpmRegex = /\b(\d{2,3})\s*(?:bpm|BPM)\b/;
    const titleMatch = title.match(bpmRegex);
    const descMatch = description.match(bpmRegex);
    
    if (titleMatch) {
      const bpm = parseInt(titleMatch[1], 10);
      return bpm >= 60 && bpm <= 220 ? bpm : null;
    }
    
    if (descMatch) {
      const bpm = parseInt(descMatch[1], 10);
      return bpm >= 60 && bpm <= 220 ? bpm : null;
    }
    
    // Estimate by genre keywords in title
    const genreEstimates = {
      'techno': 130,
      'house': 125,
      'trance': 138,
      'drum and bass': 170,
      'dnb': 170,
      'dubstep': 140,
      'hip hop': 95,
      'trap': 140,
      'edm': 128,
      'rock': 120,
      'metal': 140,
      'punk': 160,
      'jazz': 85,
      'blues': 80,
      'reggae': 90,
      'dance': 125
    };
    
    const combinedText = (title + ' ' + description).toLowerCase();
    
    for (const [genre, bpm] of Object.entries(genreEstimates)) {
      if (combinedText.includes(genre)) {
        return bpm;
      }
    }
    
    // Use workout keywords to estimate
    if (/workout|exercise|fitness|gym|training/i.test(combinedText)) {
      return 140; // Average workout music BPM
    }
    
    if (/yoga|relaxing|meditation|calm|sleep/i.test(combinedText)) {
      return 75; // Relaxation music average
    }
    
    if (/running|jogging|cardio/i.test(combinedText)) {
      return 160; // Running music average
    }
    
    // Can't determine
    return null;
  }
  
  /**
   * Get genre tags from a video title and description
   * @param {string} title - Video title
   * @param {string} description - Video description 
   * @returns {Array} - Array of genre tags
   */
  extractGenreTags(title, description = '') {
    const combinedText = (title + ' ' + description).toLowerCase();
    return this.genreTags.filter(genre => 
      combinedText.includes(genre.toLowerCase())
    );
  }
  
  /**
   * Get mood tags from a video title and description
   * @param {string} title - Video title
   * @param {string} description - Video description
   * @returns {Array} - Array of mood tags
   */
  extractMoodTags(title, description = '') {
    const combinedText = (title + ' ' + description).toLowerCase();
    return this.moodTags.filter(mood => 
      combinedText.includes(mood.toLowerCase())
    );
  }
  
  /**
   * Format duration seconds to MM:SS or HH:MM:SS
   * @param {number} seconds - Duration in seconds
   * @returns {string} - Formatted duration
   */
  formatDuration(seconds) {
    if (!seconds || isNaN(seconds)) return '0:00';
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }
}

// Create singleton instance
const musicUtilsService = new MusicUtilsService();
export default musicUtilsService;