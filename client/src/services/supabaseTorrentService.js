import { supabase, isSupabaseConfigured } from '../config/supabase';

/**
 * Supabase Torrent Service
 * Syncs torrent history to cloud database
 */

class SupabaseTorrentService {
  constructor() {
    this.tableName = 'torrent_history';
    this.isConfigured = isSupabaseConfigured();
  }

  /**
   * Save torrent to user's cloud history
   */
  async saveTorrent(torrentData) {
    if (!this.isConfigured) {
      console.warn('Supabase not configured, skipping cloud save');
      return null;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        console.warn('No user logged in, skipping cloud save');
        return null;
      }

      const { data, error } = await supabase
        .from(this.tableName)
        .upsert({
          user_id: user.id,
          info_hash: torrentData.infoHash,
          name: torrentData.name,
          magnet_link: torrentData.magnetLink || torrentData.originalInput,
          size: torrentData.size || 0,
          last_watched: new Date().toISOString(),
          progress: torrentData.progress || 0,
          favorite: torrentData.favorite || false,
        }, {
          onConflict: 'user_id,info_hash',
        });

      if (error) {
        console.error('Error saving torrent to Supabase:', error);
        throw error;
      }

      console.log('✅ Torrent saved to cloud:', torrentData.name);
      return data;
    } catch (error) {
      console.error('Supabase save error:', error);
      return null;
    }
  }

  /**
   * Get user's torrent history from cloud
   */
  async getUserTorrents(limit = 50) {
    if (!this.isConfigured) {
      return [];
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        return [];
      }

      const { data, error } = await supabase
        .from(this.tableName)
        .select('*')
        .eq('user_id', user.id)
        .order('last_watched', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error fetching torrents from Supabase:', error);
        throw error;
      }

      console.log(`📥 Loaded ${data?.length || 0} torrents from cloud`);
      return data || [];
    } catch (error) {
      console.error('Supabase fetch error:', error);
      return [];
    }
  }

  /**
   * Get a specific torrent by info hash
   */
  async getTorrentByHash(infoHash) {
    if (!this.isConfigured) {
      return null;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        return null;
      }

      const { data, error } = await supabase
        .from(this.tableName)
        .select('*')
        .eq('user_id', user.id)
        .eq('info_hash', infoHash)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = not found
        console.error('Error fetching torrent:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Supabase fetch error:', error);
      return null;
    }
  }

  /**
   * Update torrent watch progress
   */
  async updateProgress(infoHash, progress) {
    if (!this.isConfigured) {
      return null;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        return null;
      }

      const { data, error } = await supabase
        .from(this.tableName)
        .update({
          progress,
          last_watched: new Date().toISOString(),
        })
        .eq('user_id', user.id)
        .eq('info_hash', infoHash);

      if (error) {
        console.error('Error updating progress:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Supabase update error:', error);
      return null;
    }
  }

  /**
   * Toggle favorite status
   */
  async toggleFavorite(infoHash) {
    if (!this.isConfigured) {
      return null;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        return null;
      }

      // Get current favorite status
      const torrent = await this.getTorrentByHash(infoHash);
      const newFavoriteStatus = !torrent?.favorite;

      const { data, error } = await supabase
        .from(this.tableName)
        .update({
          favorite: newFavoriteStatus,
        })
        .eq('user_id', user.id)
        .eq('info_hash', infoHash);

      if (error) {
        console.error('Error toggling favorite:', error);
        throw error;
      }

      console.log(`${newFavoriteStatus ? '⭐' : '☆'} Favorite toggled for:`, infoHash);
      return data;
    } catch (error) {
      console.error('Supabase toggle favorite error:', error);
      return null;
    }
  }

  /**
   * Get favorite torrents only
   */
  async getFavoriteTorrents() {
    if (!this.isConfigured) {
      return [];
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        return [];
      }

      const { data, error } = await supabase
        .from(this.tableName)
        .select('*')
        .eq('user_id', user.id)
        .eq('favorite', true)
        .order('last_watched', { ascending: false });

      if (error) {
        console.error('Error fetching favorites:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Supabase favorites fetch error:', error);
      return [];
    }
  }

  /**
   * Delete a torrent from history
   */
  async deleteTorrent(infoHash) {
    if (!this.isConfigured) {
      return null;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        return null;
      }

      const { data, error } = await supabase
        .from(this.tableName)
        .delete()
        .eq('user_id', user.id)
        .eq('info_hash', infoHash);

      if (error) {
        console.error('Error deleting torrent:', error);
        throw error;
      }

      console.log('🗑️ Torrent deleted from cloud:', infoHash);
      return data;
    } catch (error) {
      console.error('Supabase delete error:', error);
      return null;
    }
  }

  /**
   * Clear all torrent history for user
   */
  async clearHistory() {
    if (!this.isConfigured) {
      return null;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        return null;
      }

      const { data, error } = await supabase
        .from(this.tableName)
        .delete()
        .eq('user_id', user.id);

      if (error) {
        console.error('Error clearing history:', error);
        throw error;
      }

      console.log('🧹 Torrent history cleared');
      return data;
    } catch (error) {
      console.error('Supabase clear error:', error);
      return null;
    }
  }

  /**
   * Subscribe to real-time changes in torrent history
   */
  subscribeToChanges(callback) {
    if (!this.isConfigured) {
      return () => {};
    }

    const channel = supabase
      .channel('torrent_history_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: this.tableName,
        },
        (payload) => {
          console.log('🔄 Real-time update:', payload);
          callback(payload);
        }
      )
      .subscribe();

    // Return unsubscribe function
    return () => {
      supabase.removeChannel(channel);
    };
  }
}

export default new SupabaseTorrentService();
