import { useLayoutEffect, useRef } from 'react';
import { usePlayer } from '../../context/PlayerContext';
import { getLyricShadowWord } from '../../utils/lyrics';
import './LyricsShadow.css';

function LyricsShadow() {
    const { playerState } = usePlayer();
    const line = playerState.songLyricsLines[playerState.currentLyricsIndex];
    const shadowText = playerState.isPlaying ? getLyricShadowWord(line) : '';
    const containerRef = useRef<HTMLDivElement>(null);
    const textRef = useRef<HTMLDivElement>(null);

    useLayoutEffect(() => {
        const container = containerRef.current;
        const text = textRef.current;
        if (!container || !text || !shadowText) return;

        const fitText = () => {
            text.style.fontSize = '';
            const fontSize = parseFloat(getComputedStyle(text).fontSize);
            const bounds = text.getBoundingClientRect();
            const scale = Math.min(1,
                container.clientWidth / Math.max(bounds.width, 1),
                container.clientHeight / Math.max(bounds.height, 1));
            text.style.fontSize = `${fontSize * scale}px`;
        };

        fitText();
        const observer = new ResizeObserver(fitText);
        observer.observe(container);
        document.fonts.addEventListener('loadingdone', fitText);
        return () => {
            observer.disconnect();
            document.fonts.removeEventListener('loadingdone', fitText);
        };
    }, [shadowText]);

    return (
        <div ref={containerRef} className="lyrics-shadow-container" key={shadowText} data-visible={!!shadowText} aria-hidden="true">
            <div ref={textRef} className="lyrics-shadow">{shadowText}</div>
        </div>
    );
}

export default LyricsShadow;
