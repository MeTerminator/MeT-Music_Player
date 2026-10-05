import { useLayoutEffect, useMemo, useRef } from 'react';
import { FocusLyricPlayer } from '../../../../vendor/amll/FocusLyricPlayer';
import { usePlayer } from '../../context/PlayerContext';
import { toAmllLyrics } from '../../utils/amll';
import './Lyrics.css';

function Lyrics() {
    const { playerState, audioRef } = usePlayer();
    const hostRef = useRef<HTMLDivElement>(null);
    const playerRef = useRef<FocusLyricPlayer | null>(null);
    const trackDuration = playerState.duration === '0:00' ? NaN : playerState.progressMax;
    const lines = useMemo(() => toAmllLyrics(playerState.songLyricsLines, trackDuration),
        [playerState.songLyricsLines, trackDuration]);

    useLayoutEffect(() => {
        const player = new FocusLyricPlayer();
        playerRef.current = player;
        hostRef.current?.appendChild(player.getElement());
        return () => {
            player.dispose();
            playerRef.current = null;
        };
    }, []);

    useLayoutEffect(() => {
        playerRef.current?.setLyricLines(lines, (audioRef.current?.currentTime ?? 0) * 1000);
    }, [lines, audioRef]);

    useLayoutEffect(() => {
        const player = playerRef.current;
        const audio = audioRef.current;
        if (!player || !audio) return;
        let frame = 0;
        let lastFrame = performance.now();
        const update = (now: number) => {
            player.setCurrentTime(audio.currentTime * 1000);
            player.update(now - lastFrame);
            lastFrame = now;
            frame = requestAnimationFrame(update);
        };
        const seek = () => {
            player.setCurrentTime(audio.currentTime * 1000, true);
            player.update(16);
        };
        if (playerState.isPlaying) {
            player.resume();
            frame = requestAnimationFrame(update);
        } else player.pause();
        audio.addEventListener('seeked', seek);
        return () => {
            cancelAnimationFrame(frame);
            audio.removeEventListener('seeked', seek);
        };
    }, [audioRef, playerState.isPlaying]);

    return <div ref={hostRef} className="lyrics-container" data-playing={playerState.isPlaying} />;
}

export default Lyrics;
