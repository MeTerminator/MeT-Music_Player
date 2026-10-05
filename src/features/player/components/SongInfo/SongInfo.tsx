import { useEffect, useId, useRef, useState, type CSSProperties } from 'react';
import { usePlayer } from '../../context/PlayerContext';
import { IoMdPerson, IoMdDisc, IoMdVolumeHigh, IoMdVolumeLow, IoMdVolumeOff } from 'react-icons/io';
import './SongInfo.css';

export default function SongInfo() {
  const { playerState, setVolume } = usePlayer();
  const visible = Boolean(playerState.songMid || playerState.songName);
  const paused = !playerState.isPlaying;
  const progress = playerState.progressMax > 0
    ? Math.min(100, Math.max(0, playerState.progressValue / playerState.progressMax * 100))
    : 0;
  const volumePercent = Math.round(playerState.volume * 100);
  const muted = playerState.volume === 0;
  const previousVolume = useRef(playerState.volume > 0 ? playerState.volume : 1);
  const [volumeOpen, setVolumeOpen] = useState(false);
  const volumeRef = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const volumePanelId = useId();

  if (!visible && volumeOpen) setVolumeOpen(false);

  const openVolume = () => {
    clearTimeout(closeTimer.current);
    setVolumeOpen(true);
  };
  const closeVolume = () => {
    clearTimeout(closeTimer.current);
    setVolumeOpen(false);
  };

  useEffect(() => {
    if (playerState.volume > 0) previousVolume.current = playerState.volume;
  }, [playerState.volume]);

  const toggleMute = () => {
    openVolume();
    if (muted) setVolume(previousVolume.current);
    else {
      previousVolume.current = playerState.volume;
      setVolume(0);
    }
  };

  useEffect(() => () => clearTimeout(closeTimer.current), []);
  useEffect(() => {
    if (!volumeOpen) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!volumeRef.current?.contains(event.target as Node)) closeVolume();
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [volumeOpen]);

  return (
    <section className={`song-container ${visible ? 'visible' : 'hidden'}`} aria-label="歌曲信息" inert={!visible} aria-hidden={!visible}>
      <div className="song-container-box">
        <div className="song-cover">
          {playerState.songCoverUrl && <img src={playerState.songCoverUrl} alt={`${playerState.songName} 专辑封面`} />}
        </div>
        <div className="song-description">
          <h1 className="song-name">{playerState.songName || 'MeT-Music Player'}</h1>
          <div className="song-meta">
            {playerState.songSinger && <span className="song-meta-item"><IoMdPerson aria-hidden="true" /><span>{playerState.songSinger}</span></span>}
            {playerState.songAlbum && <span className="song-meta-item"><IoMdDisc aria-hidden="true" /><span>{playerState.songAlbum}</span></span>}
          </div>
        </div>
        <div
          className="volume-control"
          ref={volumeRef}
          data-open={volumeOpen}
          onPointerEnter={event => { if (event.pointerType === 'mouse') openVolume(); }}
          onPointerLeave={() => {
            if (!volumeRef.current?.contains(document.activeElement)) {
              closeTimer.current = setTimeout(closeVolume, 140);
            }
          }}
          onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) closeVolume(); }}
          onKeyDown={event => {
            if (event.key === 'Escape') {
              event.stopPropagation();
              volumeRef.current?.querySelector('button')?.focus();
              closeVolume();
            }
          }}
        >
          <button
            type="button"
            className="volume-icon"
            aria-label={`${muted ? '取消静音' : '静音'}，当前音量 ${volumePercent}%`}
            aria-pressed={muted}
            aria-expanded={volumeOpen}
            aria-controls={volumePanelId}
            onClick={toggleMute}
            onFocus={openVolume}
            onKeyDown={event => { if (event.key === 'ArrowUp' || event.key === 'ArrowDown') { event.preventDefault(); openVolume(); } }}
          >
            {volumePercent === 0 ? <IoMdVolumeOff aria-hidden="true" /> : volumePercent < 50 ? <IoMdVolumeLow aria-hidden="true" /> : <IoMdVolumeHigh aria-hidden="true" />}
          </button>
          <div className="volume-panel" id={volumePanelId} inert={!volumeOpen}>
            <div className="volume-panel-header"><span>音量</span><span className="volume-value" aria-hidden="true">{volumePercent}%</span></div>
            <div className="volume-slider">
              <input
              type="range"
              min={0}
              max={100}
              value={volumePercent}
              onChange={event => setVolume(Number(event.currentTarget.value) / 100)}
              aria-label="音量"
              aria-valuetext={`${volumePercent}%`}
              style={{ '--volume-progress': `${volumePercent}%` } as CSSProperties}
            />
            </div>
          </div>
        </div>
        <div
          className={`progress-ring ${paused ? 'paused' : ''}`}
          role="progressbar"
          tabIndex={0}
          aria-label={`播放进度，${playerState.statusText}`}
          aria-valuenow={Math.round(progress)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuetext={`${playerState.currentTime} / ${playerState.duration}`}
        >
          <svg viewBox="0 0 80 80" aria-hidden="true">
            <circle className="progress-ring-track" cx="40" cy="40" r="34" />
            <circle className="progress-ring-value" cx="40" cy="40" r="34" pathLength="100" style={{ strokeDashoffset: 100 - progress }} />
          </svg>
          <div className="progress-time" aria-hidden="true">
            <span>{playerState.currentTime}</span>
            <span className="progress-time-total">{playerState.duration}</span>
          </div>
        </div>
      </div>
    </section>
  );
}
