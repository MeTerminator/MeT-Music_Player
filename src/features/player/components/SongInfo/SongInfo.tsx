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

  return (
    <section className={`song-container ${visible ? 'visible' : 'hidden'}`} aria-label="歌曲信息">
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
        <div className="volume-control">
          <span className="volume-icon" aria-hidden="true">
            {volumePercent === 0 ? <IoMdVolumeOff /> : volumePercent < 50 ? <IoMdVolumeLow /> : <IoMdVolumeHigh />}
          </span>
          <div className="volume-slider">
            <input
              type="range"
              min={0}
              max={100}
              value={volumePercent}
              onChange={event => setVolume(Number(event.currentTarget.value) / 100)}
              aria-label="音量"
              aria-valuetext={`${volumePercent}%`}
              style={{ background: `linear-gradient(to right, rgba(255, 255, 255, 0.9) ${volumePercent}%, rgba(255, 255, 255, 0.25) ${volumePercent}%)` }}
            />
          </div>
          <span className="volume-value" aria-hidden="true">{volumePercent}%</span>
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
