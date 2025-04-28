const cache = { search: new Map(), videoDetails: new Map() };

class YouTubeService {
  /* ───────────── SEARCH ───────────── */
  async searchVideos(rawQuery, { maxResults = 10 } = {}) {
    const query = rawQuery.trim();
    const apiKey = process.env.REACT_APP_YOUTUBE_API_KEY;
    console.log('[YouTubeService] API key:', apiKey);
    // simple memo-cache
    const cacheKey = JSON.stringify({ query, maxResults });
    if (cache.search.has(cacheKey)) return cache.search.get(cacheKey);

    let items = [];

    /* Attempt real API if key exists */
 if (apiKey) {
      // 1) strict search
      items = await this.#fetchYT(query, apiKey, maxResults, { type: 'video' });

      // 2) retry lenient if first fails
      if (items === null) {
        console.warn('[YouTubeService] strict search failed; retrying lenient');
        items = await this.#fetchYT(query, apiKey, maxResults, {
          order: 'relevance',
          regionCode: 'US',
          safeSearch: 'none',
        });
      }
    }

    if (items === null) {
      console.error('[YouTubeService] API searches failed; returning empty results');
      items = [];
    }

    /* If HTTP succeeded but zero real hits, leave empty → UI can say “No matches” */
    if (items.length === 0) {
      console.info('[YouTubeService] Zero hits for', query);
    }

    cache.search.set(cacheKey, items);
    return items;
  }

  /* Low-level fetch helper
     Returns:
       []      → HTTP OK & >0 items
       []      → HTTP OK but zero items
       null    → HTTP error / fetch throws
  */
  async #fetchYT(q, key, limit, extraParams = {}) {
    const params = new URLSearchParams({
      part: 'snippet',
      q,
      maxResults: Math.min(limit, 10),
      key,
      regionCode: 'US',
      ...extraParams,
    });

    try {
      const res = await fetch(
        `https://www.googleapis.com/youtube/v3/search?${params}`
      );

      if (!res.ok) {
        console.warn('[YT search] HTTP', res.status, await res.text());
        return null; // signal failure
      }

      const { items } = await res.json();
      return items.map((i) => ({
        id:
          i.id.videoId ||
          i.id.channelId ||
          i.id.playlistId ||
          Math.random().toString(36).slice(2, 13),
        title: i.snippet.title,
        channelTitle: i.snippet.channelTitle,
        thumbnail: i.snippet.thumbnails.medium.url,
        description: i.snippet.description,
        publishedAt: i.snippet.publishedAt,
        type: 'song',
      }));
    } catch (err) {
      console.error('[YT fetch] err:', err.message);
      return null;
    }
  }

  /* ───────────── DETAILS (unchanged logic) ───────────── */
  async getVideoDetails(videoId) {
    if (cache.videoDetails.has(videoId))
      return cache.videoDetails.get(videoId);

    // … keep your existing detail-fetch implementation here …
    return null;
  }



  /* URL helpers */
  getWatchUrl(id) {
    return `https://www.youtube.com/watch?v=${id}`;
  }
  getEmbedUrl(id) {
    return `https://www.youtube.com/embed/${id}?autoplay=1`;
  }
  getMusicUrl(id) {
    return `https://music.youtube.com/watch?v=${id}`;
  }
}

export default new YouTubeService();
