import { usePlayer } from '../../context/PlayerContext';
import './PlaceholderText.css';

export default function PlaceholderText() {
  const { playerState } = usePlayer();
  if (playerState.isPlaying) return null;

  return (
    <div className="placeholder-text">
      <span>MeT-Music Player</span>
      {playerState.statusText === '请设置 Session ID' && (
        <a href={`${import.meta.env.BASE_URL}settings.html`}>设置 Session ID</a>
      )}
    </div>
  );
}
