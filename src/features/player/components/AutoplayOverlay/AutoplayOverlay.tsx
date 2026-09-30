import { usePlayer } from '../../context/PlayerContext';
import './AutoplayOverlay.css';

export default function AutoplayOverlay() {
  const { isAutoplayBlocked, resumePlayback } = usePlayer();
  if (!isAutoplayBlocked) return null;

  return (
    <button
      className="autoplay-overlay"
      type="button"
      onClick={resumePlayback}
      aria-label="点击屏幕继续播放"
    >
      点击屏幕继续播放
    </button>
  );
}
