import { useState, useEffect, useLayoutEffect, useRef, type CSSProperties } from 'react';
import { usePlayer } from '../../context/PlayerContext';
import type { LyricLine } from '../../model/types';
import { lyricWordProgress } from '../../utils/lyrics';
import { adjustColorBrightnessHSV, adjustColorBrightness, hexToRgbString } from '../../utils/color';
import './Lyrics.css';

const ANIMATION_COUNT = 5;
const ANIMATION_DURATION_MS = 600;

function TimedLyric({ line }: { line: LyricLine }) {
    const { audioRef } = usePlayer();
    const textRef = useRef<HTMLSpanElement>(null);

    useLayoutEffect(() => {
        const audio = audioRef.current;
        const words = line.words;
        if (!audio || !words?.length) return;
        const spans = textRef.current?.querySelectorAll<HTMLElement>('.lyric-word');
        let frame = 0;
        const update = () => {
            spans?.forEach((span, index) => {
                span.style.setProperty('--word-progress', `${lyricWordProgress(words[index], audio.currentTime) * 100}%`);
            });
        };
        const tick = () => {
            update();
            frame = requestAnimationFrame(tick);
        };
        const start = () => {
            cancelAnimationFrame(frame);
            tick();
        };
        const stop = () => {
            cancelAnimationFrame(frame);
            update();
        };
        update();
        if (!audio.paused) start();
        audio.addEventListener('playing', start);
        audio.addEventListener('pause', stop);
        audio.addEventListener('ended', stop);
        audio.addEventListener('waiting', stop);
        audio.addEventListener('seeked', update);
        audio.addEventListener('timeupdate', update);
        return () => {
            cancelAnimationFrame(frame);
            audio.removeEventListener('playing', start);
            audio.removeEventListener('pause', stop);
            audio.removeEventListener('ended', stop);
            audio.removeEventListener('waiting', stop);
            audio.removeEventListener('seeked', update);
            audio.removeEventListener('timeupdate', update);
        };
    }, [audioRef, line]);

    if (!line.words?.length) return line.text;
    return (
        <span ref={textRef} aria-label={line.text}>
            {line.words.map((word, index) => (
                <span className="lyric-word" key={index} aria-hidden="true">{word.text}</span>
            ))}
        </span>
    );
}

function Lyrics() {
    const { playerState } = usePlayer();
    const currentLine = playerState.songLyricsLines[playerState.currentLyricsIndex];
    const containerRef = useRef<HTMLDivElement>(null);
    const currentRef = useRef<HTMLDivElement>(null);
    const previousRef = useRef<HTMLDivElement>(null);
    const [display, setDisplay] = useState<{ current?: LyricLine; previous?: LyricLine; generation: number }>({ generation: 0 });

    // 在行身份变化时切换两个 buffer；进度更新和暂停不会重新触发行动画。
    if (display.current !== currentLine) {
        setDisplay({ current: currentLine, previous: currentLine ? display.current : undefined, generation: display.generation + 1 });
    }

    useEffect(() => {
        if (!display.previous) return;
        const timeout = setTimeout(() => {
            setDisplay(value => ({ ...value, previous: undefined }));
        }, ANIMATION_DURATION_MS);
        return () => clearTimeout(timeout);
    }, [display.previous, display.generation]);

    useLayoutEffect(() => {
        const container = containerRef.current;
        if (!container) return;
        if (!display.current) {
            container.style.height = '';
            return;
        }
        const buffers = [currentRef.current, previousRef.current];
        const updateHeight = () => {
            container.style.height = `${Math.max(...buffers.map(buffer => buffer?.offsetHeight ?? 0))}px`;
        };
        updateHeight();
        const observer = new ResizeObserver(updateHeight);
        buffers.forEach(buffer => { if (buffer) observer.observe(buffer); });
        return () => observer.disconnect();
    }, [display]);

    const animationIndex = display.generation % ANIMATION_COUNT;
    const textColor = adjustColorBrightness(adjustColorBrightnessHSV(playerState.songCoverColorPalette[0] ?? '#ffffff', 100), 15);
    const rgb = hexToRgbString(textColor);
    const background = `linear-gradient(to bottom left, rgba(${rgb}, 0.7), rgba(${rgb}, 0.5)) text`;
    const style = {
        '--lyric-highlight': textColor,
        '--lyric-muted': `rgba(${rgb}, 0.32)`,
    } as CSSProperties;

    return (
        <div className={`lyrics-container ${display.current ? 'lyrics-container-playing' : ''}`} ref={containerRef}>
            {display.previous ? (
                <div key={`previous-${display.generation}`} className={`lyrics lyrics-buffer lyrics-exit-${animationIndex}`} style={{ ...style, background: display.previous.words?.length ? 'none' : background }} ref={previousRef} aria-hidden="true">
                    <TimedLyric line={display.previous} />
                </div>
            ) : null}
            {display.current ? (
                <div key={`current-${display.generation}`} className={`lyrics lyrics-buffer lyrics-enter-${animationIndex}`} style={{ ...style, background: display.current.words?.length ? 'none' : background }} ref={currentRef}>
                    <TimedLyric line={display.current} />
                </div>
            ) : null}
        </div>
    );
}

export default Lyrics;
