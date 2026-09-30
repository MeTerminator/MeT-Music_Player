import Background from './components/Background/Background';
import Visualizer from './components/Visualizer/Visualizer';
import Lyrics from './components/Lyrics/Lyrics';
import SongInfo from './components/SongInfo/SongInfo';
import LyricsShadow from './components/LyricsShadow/LyricsShadow';
import PlaceholderText from './components/PlaceholderText/PlaceholderText';
import AutoplayOverlay from './components/AutoplayOverlay/AutoplayOverlay';
import './Player.css';

export default function Player() {
  return (
    <main>
      <PlaceholderText />
      <Background />
      <Visualizer />
      <div className="player-container">
        <div className="player-lyrics-container">
          <Lyrics />
          <LyricsShadow />
        </div>
        <SongInfo />
      </div>
      <AutoplayOverlay />
    </main>
  );
}
