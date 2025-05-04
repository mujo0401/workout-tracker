import React, { useState, useEffect, useRef, useCallback } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faPlay, faPause, faStop,
  faBackward, faForward,
  faVolumeUp, faVolumeMute,
  faSearch, faTimes, faRedo,
  faList, faMusic
} from '@fortawesome/free-solid-svg-icons';
import ReactPlayer from 'react-player';

import youtubeService from '../services/YouTubeService';
import musicSearchService from '../services/MusicSearchService';
import '../css/MusicOverlay.css';

export default function MusicOverlay({
    bpm,
    onClose,
    onPlay = () => {},
    onPause = () => {},
    onStop = () => {},
  }) {
  /* ─────────── player / queue state ─────────── */
  const [results, setResults] = useState([]);
  const [idx,     setIdx]     = useState(-1);
  const [playing, setPlaying] = useState(false);
  const [volume,  setVolume]  = useState(0.8);
  const [repeat,  setRepeat]  = useState(false);

  /* ─────────── UI state ─────────── */
  const [query,       setQuery]       = useState('');
  const [loading,     setLoading]     = useState(false);
  const [searchOpen,  setSearchOpen]  = useState(false);
  const [queueOpen,   setQueueOpen]   = useState(false);
  const [collapsed,   setCollapsed]   = useState(false);

  const cancelSearch = useRef(null);
  const playerRef    = useRef(null);

  const current = idx >= 0 ? results[idx] : null;

  /* ─────────── search logic ─────────── */
  const doSearch = useCallback((q) => {
    cancelSearch.current?.();
    if (!q || q.length < 2) { setResults([]); return; }

    setLoading(true);
    cancelSearch.current = musicSearchService.search(
      q,
      { maxResults: 15 },
      init  => { setResults(init);  setLoading(false); },
      (det,i)=> setResults(p => { const c=[...p]; c[i]=det; return c; }),
      ()     => setLoading(false)
    );
  }, []);

  useEffect(() => { doSearch(query); }, [query, doSearch]);

  /* ─────────── playback handlers ─────────── */
  const start = i => {
    setIdx(i);
    setPlaying(true);
    onPlay();
    setSearchOpen(false);
    if (collapsed) setCollapsed(false);
  };
  const playPause = () => {
        setPlaying(p => {
          const next = !p;
          next ? onPlay() : onPause();
          return next;
        });
  };
  
        const stop      = () => {
              setPlaying(false);
              onStop();
             };
  const next      = () => results.length && start((idx+1) % results.length);
  const prev      = () => results.length && start((idx-1 + results.length) % results.length);
  const ended     = () => repeat ? playerRef.current?.seekTo(0) : next();

  if (collapsed) {
    return (
      <button
        className="miniplayer-badge"
        onClick={() => setCollapsed(false)}
        title="Open Mini-Player"
      >
        <FontAwesomeIcon icon={faMusic}/>
      </button>
    );
  }

  return (
    <div className="miniplayer-container">
      <header className="miniplayer-header">
        <h4>Mini Player</h4>
        <div className="actions">
          <button onClick={() => setSearchOpen(o => !o)}><FontAwesomeIcon icon={faSearch}/></button>
          <button onClick={() => setQueueOpen(o => !o)}><FontAwesomeIcon icon={faList}/></button>
          <button onClick={onClose}><FontAwesomeIcon icon={faTimes}/></button>
        </div>
      </header>

      <div className="miniplayer-body">
        {current && (
          <div className="player-wrapper">
            <ReactPlayer
              ref={playerRef}
              url={youtubeService.getEmbedUrl(current.id)}    // use embed URL with autoplay param
              playing={playing}
              muted={false}                                   // ensure sound is enabled
              volume={volume}
              width="100%"
              height="200px"
              onReady={() => {
                setPlaying(true);
                onPlay();
              }}          
              onError={e => console.error('ReactPlayer error:', e)}
              config={{
                youtube: {
                  playerVars: {
                    autoplay: 1,    // explicitly request autoplay
                    controls: 0,
                    modestbranding: 1,
                    playsinline: 1
                  }
                }
              }}
              onEnded={() => {
                          ended();
                          onStop();
                        }}
            />
          </div>
        )}

        {searchOpen && (
          <section className="miniplayer-search">
            <input
              placeholder="Search tracks or artists…"
              value={query}
              onChange={e => setQuery(e.target.value)}
              autoFocus
            />
            {loading && <div className="loader">Loading…</div>}
            <div className="search-results">
              {results.map((r,i) => (
                <div key={r.id}
                     className={`search-item ${i===idx ? 'playing' : ''}`}
                     onClick={() => start(i)}>
                  <img src={r.thumbnail} alt={r.title}/>
                  <div className="track-info">
                    <span className="track-title">{r.title}</span>
                    <span className="track-meta">
                      {r.channelTitle}{r.durationFormatted ? ` • ${r.durationFormatted}` : ''}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {queueOpen && !searchOpen && (
          <section className="queue-panel">
            {results.length === 0 && <p className="empty">Queue empty – run a search.</p>}
            {results.map((r,i) => (
              <div key={r.id}
                   className={`queue-item ${i===idx ? 'playing' : ''}`}
                   onClick={() => start(i)}>
                <span>{i+1}.</span>
                <span className="queue-title">{r.title}</span>
              </div>
            ))}
          </section>
        )}
      </div>

      <footer className="miniplayer-controls">
        <button onClick={prev}    disabled={!current}><FontAwesomeIcon icon={faBackward}/></button>
        <button onClick={playPause} disabled={!current}><FontAwesomeIcon icon={playing ? faPause : faPlay}/></button>
        <button onClick={stop}    disabled={!current}><FontAwesomeIcon icon={faStop}/></button>
        <button onClick={next}    disabled={!current}><FontAwesomeIcon icon={faForward}/></button>
        <button
          className={repeat ? 'active' : ''}
          onClick={() => setRepeat(r => !r)}
          disabled={!current}
        >
          <FontAwesomeIcon icon={faRedo}/></button>
        <div className="volume">
          <FontAwesomeIcon icon={volume>0 ? faVolumeUp : faVolumeMute}/>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={volume}
            onChange={e => setVolume(+e.target.value)}
          />
        </div>
      </footer>
    </div>
  );
}
