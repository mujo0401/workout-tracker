// Playlist service for managing local playlists
// Uses localStorage to persist playlists between sessions

// Default playlists
const DEFAULT_PLAYLISTS = [
  {
    id: 'favorites',
    name: 'Favorites',
    description: 'Your favorite tracks',
    tracks: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'workout',
    name: 'Workout',
    description: 'High energy music for your workouts',
    tracks: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'relaxation',
    name: 'Relaxation',
    description: 'Calm music for relaxation and cool-down',
    tracks: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

class PlaylistService {
  constructor() {
    this.STORAGE_KEY = 'workout-tracker-playlists';
    this.playlists = this._loadPlaylists();
    
    // Initialize with default playlists if none exist
    if (this.playlists.length === 0) {
      this.playlists = DEFAULT_PLAYLISTS;
      this._savePlaylists();
    }
  }
  
  /**
   * Get all playlists
   * @returns {Array} - Array of playlists
   */
  getPlaylists() {
    return this.playlists;
  }
  
  /**
   * Get a playlist by ID
   * @param {string} playlistId - Playlist ID
   * @returns {Object|null} - Playlist object or null if not found
   */
  getPlaylist(playlistId) {
    return this.playlists.find(playlist => playlist.id === playlistId) || null;
  }
  
  /**
   * Create a new playlist
   * @param {Object} playlistData - Playlist data
   * @returns {Object} - Created playlist
   */
  createPlaylist(playlistData) {
    const playlist = {
      id: `playlist-${Date.now()}`,
      name: playlistData.name || 'New Playlist',
      description: playlistData.description || '',
      tracks: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    this.playlists.push(playlist);
    this._savePlaylists();
    return playlist;
  }
  
  /**
   * Update a playlist
   * @param {string} playlistId - Playlist ID
   * @param {Object} playlistData - Playlist data to update
   * @returns {Object|null} - Updated playlist or null if not found
   */
  updatePlaylist(playlistId, playlistData) {
    const playlistIndex = this.playlists.findIndex(p => p.id === playlistId);
    
    if (playlistIndex === -1) {
      return null;
    }
    
    const updatedPlaylist = {
      ...this.playlists[playlistIndex],
      ...playlistData,
      updatedAt: new Date().toISOString()
    };
    
    this.playlists[playlistIndex] = updatedPlaylist;
    this._savePlaylists();
    
    return updatedPlaylist;
  }
  
  /**
   * Delete a playlist
   * @param {string} playlistId - Playlist ID
   * @returns {boolean} - true if deleted, false if not found
   */
  deletePlaylist(playlistId) {
    // Don't allow deletion of default playlists
    if (['favorites', 'workout', 'relaxation'].includes(playlistId)) {
      console.warn('Cannot delete default playlist');
      return false;
    }
    
    const initialLength = this.playlists.length;
    this.playlists = this.playlists.filter(p => p.id !== playlistId);
    
    if (this.playlists.length !== initialLength) {
      this._savePlaylists();
      return true;
    }
    
    return false;
  }
  
  /**
   * Add a track to a playlist
   * @param {string} playlistId - Playlist ID
   * @param {Object} track - Track to add
   * @returns {boolean} - true if added, false if not found
   */
  addToPlaylist(playlistId, track) {
    const playlist = this.getPlaylist(playlistId);
    
    if (!playlist) {
      return false;
    }
    
    // Check if track already exists in playlist
    const trackExists = playlist.tracks.some(t => t.id === track.id);
    
    if (!trackExists) {
      playlist.tracks.push({
        ...track,
        addedAt: new Date().toISOString()
      });
      
      playlist.updatedAt = new Date().toISOString();
      this._savePlaylists();
    }
    
    return true;
  }
  
  /**
   * Remove a track from a playlist
   * @param {string} playlistId - Playlist ID
   * @param {string} trackId - Track ID to remove
   * @returns {boolean} - true if removed, false if not found
   */
  removeFromPlaylist(playlistId, trackId) {
    const playlist = this.getPlaylist(playlistId);
    
    if (!playlist) {
      return false;
    }
    
    const initialLength = playlist.tracks.length;
    playlist.tracks = playlist.tracks.filter(track => track.id !== trackId);
    
    if (playlist.tracks.length !== initialLength) {
      playlist.updatedAt = new Date().toISOString();
      this._savePlaylists();
      return true;
    }
    
    return false;
  }
  
  /**
   * Check if a track is in a playlist
   * @param {string} playlistId - Playlist ID 
   * @param {string} trackId - Track ID
   * @returns {boolean} - true if in playlist
   */
  isInPlaylist(playlistId, trackId) {
    const playlist = this.getPlaylist(playlistId);
    
    if (!playlist) {
      return false;
    }
    
    return playlist.tracks.some(track => track.id === trackId);
  }
  
  /**
   * Export playlists to JSON
   * @returns {string} - JSON string of playlists
   */
  exportPlaylists() {
    return JSON.stringify(this.playlists);
  }
  
  /**
   * Import playlists from JSON
   * @param {string} json - JSON string of playlists
   * @returns {boolean} - true if imported successfully
   */
  importPlaylists(json) {
    try {
      const playlists = JSON.parse(json);
      
      if (!Array.isArray(playlists)) {
        throw new Error('Invalid playlist data');
      }
      
      this.playlists = playlists;
      this._savePlaylists();
      return true;
    } catch (error) {
      console.error('Failed to import playlists:', error);
      return false;
    }
  }
  
  /**
   * Load playlists from localStorage
   * @returns {Array} - Array of playlists
   * @private
   */
  _loadPlaylists() {
    try {
      const storedPlaylists = localStorage.getItem(this.STORAGE_KEY);
      return storedPlaylists ? JSON.parse(storedPlaylists) : [];
    } catch (error) {
      console.error('Failed to load playlists from localStorage:', error);
      return [];
    }
  }
  
  /**
   * Save playlists to localStorage
   * @private
   */
  _savePlaylists() {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.playlists));
    } catch (error) {
      console.error('Failed to save playlists to localStorage:', error);
    }
  }
}

// Create singleton instance
const playlistService = new PlaylistService();
export default playlistService;