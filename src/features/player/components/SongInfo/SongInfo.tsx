import { usePlayer } from '../../context/PlayerContext';
import { IoMdPerson, IoMdDisc } from 'react-icons/io';
import './SongInfo.css';

export default function SongInfo() {
  const { playerState } = usePlayer();
  const visible = playerState.isPlaying;
  const progress = playerState.progressMax > 0
    ? Math.min(100, Math.max(0, playerState.progressValue / playerState.progressMax * 100))
    : 0;

  return (
    <section className={`song-container ${visible ? 'visible' : 'hidden'}`} aria-label="歌曲信息">
      <div className="song-container-box">
        <div className="song-cover">
          {playerState.songCoverUrl && <img src={playerState.songCoverUrl} alt={`${playerState.songName} 专辑封面`} />}
        </div>
        <div className="song-description">
          <h1 className="song-name">{playerState.songName || 'MeT-Music Player'}</h1>
          <div className="song-info">
            <div className="song-info-basic">
              <div className="song-info-line"><IoMdPerson aria-hidden="true" /> {playerState.songSinger}</div>
              <div className="song-info-line"><IoMdDisc aria-hidden="true" /> {playerState.songAlbum}</div>
            </div>
            <div className="song-info-line">
              <span>{playerState.currentTime} / {playerState.duration}</span>
              <span className="song-status">{playerState.statusText}</span>
            </div>
          </div>
        </div>
      </div>
      <div className="progress-bar-container" role="progressbar" aria-label="播放进度" aria-valuenow={Math.round(progress)} aria-valuemin={0} aria-valuemax={100}>
        <div className="progress-bar" style={{ width: `${progress}%` }} />
      </div>
    </section>
  );
}
