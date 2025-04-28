// MusicSearchService – keeps real titles/thumbnails when detail-fetch
import youtubeService     from './YouTubeService';
import musicUtilsService  from './MusicUtilsService';

class MusicSearchService {
  constructor() {
    this.currentAbort = null;
    this.pending      = new Set();
    this.cache        = new Map();
  }

  /* -------------- public -------------- */
  cancel() {
    this.currentAbort?.abort();
    this.currentAbort = null;
    this.pending.clear();
  }

  search(query, options = {}, onInit, onUpdate, onErr) {
    this.cancel();
    if (!query || query.length < 2) {
      onInit([]);
      return () => {};
    }

    this.currentAbort = new AbortController();
    this._perform(query, options, onInit, onUpdate, onErr, this.currentAbort.signal);
    return () => this.cancel();
  }

  /* -------------- private -------------- */
  async _perform(query, options, onInit, onUpdate, onErr, signal) {
    try {
      const key = JSON.stringify({ query, options });
      if (this.cache.has(key)) {
        onInit(this.cache.get(key));
        return;
      }

      const results = await youtubeService.searchVideos(query, {
        maxResults: options.maxResults || 10,
        searchType: options.searchType,
      });

      const enriched = results.map((it) => {
        const bpm = it.type === 'song'
          ? it.bpm || musicUtilsService.estimateBPM(it.title, it.description)
          : null;
        return { ...it, bpm, intensity: bpm ? musicUtilsService.getIntensityCategory(bpm) : null };
      });

      this.cache.set(key, enriched);
      onInit(enriched);
      if (signal.aborted) return;

      this._fetchDetails(enriched, onUpdate, signal);
    } catch (e) {
      if (e.name !== 'AbortError') onErr?.(e.message);
    }
  }

  async _fetchDetails(list, onUpdate, signal) {
    const batch = 3;
    for (let i = 0; i < list.length; i += batch) {
      if (signal.aborted) return;
      if (i) await new Promise((r) => setTimeout(r, 150));

      for (const [offset, item] of list.slice(i, i + batch).entries()) {
        const idx = i + offset;
        const p   = this._mergeDetail(item, idx, onUpdate, signal);
        this.pending.add(p);
        p.finally(() => this.pending.delete(p));
      }
    }
  }

  async _mergeDetail(item, idx, onUpdate, signal) {
    if (item.type !== 'song' || signal.aborted) return;
    try {
      const det = await youtubeService.getVideoDetails(item.id);
      if (signal.aborted || !det) return;

      const placeholderTitle = /^Track\s/i.test(det.title);
      const placeholderThumb = /placeholder\.com/.test(det.thumbnail);

      const merged = {
        ...item,
        ...det,
        title:      placeholderTitle ? item.title      : det.title,
        thumbnail:  placeholderThumb ? item.thumbnail  : det.thumbnail,
        channelTitle: item.channelTitle || det.channelTitle,
        bpm: item.bpm || musicUtilsService.estimateBPM(det.title, det.description || ''),
      };
      if (merged.bpm && !merged.intensity) {
        merged.intensity = musicUtilsService.getIntensityCategory(merged.bpm);
      }
      onUpdate?.(merged, idx);
    } catch (e) {
      if (e.name !== 'AbortError') console.error('detail merge error', e);
    }
  }
}

const musicSearchService = new MusicSearchService();
export default musicSearchService;
