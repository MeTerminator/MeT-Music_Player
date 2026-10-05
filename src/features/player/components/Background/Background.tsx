import { BackgroundRender, MeshGradientRenderer } from '@applemusic-like-lyrics/react';
import { usePlayer } from '../../context/PlayerContext';
import './Background.css';

function Background() {
    const { playerState } = usePlayer();
    const { isPlaying, songCoverUrl, songLyricsLines } = playerState;
    const visible = isPlaying && !!songCoverUrl;

    return (
        <div className="background-layer" aria-hidden="true">
            <BackgroundRender
                className="background-render"
                style={{ display: 'block' }}
                data-visible={visible}
                album={songCoverUrl || undefined}
                renderer={MeshGradientRenderer}
                playing={visible}
                hasLyric={songLyricsLines.length > 0}
                fps={30}
            />
        </div>
    );
}

export default Background;
