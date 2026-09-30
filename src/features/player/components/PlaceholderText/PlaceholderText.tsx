import { usePlayer } from '../../context/PlayerContext';
import './PlaceholderText.css';

export default function PlaceholderText() {
  const { playerState } = usePlayer();
  if (playerState.isPlaying) return null;
  return <div className="placeholder-text">MeT-Music Player</div>;
}
