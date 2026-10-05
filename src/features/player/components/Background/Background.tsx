import { BackgroundRender, MeshGradientRenderer } from '@applemusic-like-lyrics/react';
import { usePlayer } from '../../context/PlayerContext';
import { getCoverImageUrl } from '../../api/song';
import './Background.css';

function Background() {
    const { playerState } = usePlayer();
    const { isPlaying, songCoverPmid, songLyricsLines } = playerState;
    const backgroundCoverUrl = getCoverImageUrl(songCoverPmid);
    const visible = isPlaying && !!backgroundCoverUrl;

    return (
        <div className="background-layer" aria-hidden="true">
            <BackgroundRender
                className="background-render"
                style={{ display: 'block' }}
                data-visible={visible}
                album={backgroundCoverUrl || undefined}
                renderer={MeshGradientRenderer}
                playing={visible}
                hasLyric={songLyricsLines.length > 0}
                fps={30}
            />
        </div>
    );
}

export default Background;
