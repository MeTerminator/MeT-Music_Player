import { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { usePlayer } from '../../context/PlayerContext';
import './Lyrics.css';
import { adjustColorBrightnessHSV, adjustColorBrightness, hexToRgbString } from '../../utils/color';

// 预定义的动画数量
const ANIMATION_COUNT = 5;
// 动画持续时间（需要与 CSS 中的 duration 保持一致）
const ANIMATION_DURATION_MS = 600;

function Lyrics() {
    const { playerState } = usePlayer();
    const { isPlaying } = playerState;

    // --- Refs 用于解决高度坍塌问题 ---
    const containerRef = useRef<HTMLDivElement>(null); // 指向父容器 .maintext-container
    // 分别指向两个歌词 buffer，用于测量各自的高度
    const lyricBuffer1Ref = useRef<HTMLDivElement>(null);
    const lyricBuffer2Ref = useRef<HTMLDivElement>(null);

    // 'buffer1' 或 'buffer2'，表示当前正在显示 新歌词 的文本框
    const [activeBuffer, setActiveBuffer] = useState('buffer1');

    // 存储两个文本框的实际内容
    const [lyricText1, setLyricText1] = useState('');
    const [lyricText2, setLyricText2] = useState('');

    // 当前正在使用的动画索引
    const [randomAnimationIndex, setRandomAnimationIndex] = useState(0);

    // 引用存储
    const prevLyricsIndexRef = useRef(-1);

    // --- 歌词和双文本框切换逻辑 ---
    useEffect(() => {
        const currentLyricsIndex = playerState.currentLyricsIndex;
        const newLyric = playerState.songLyricsLines[currentLyricsIndex]?.text;

        let exitingBufferId = null;

        if (isPlaying && newLyric && currentLyricsIndex !== prevLyricsIndexRef.current) {

            prevLyricsIndexRef.current = currentLyricsIndex;

            // 每次切换歌词时，随机选择一个动画
            const newAnimationIndex = Math.floor(Math.random() * ANIMATION_COUNT);
            setRandomAnimationIndex(newAnimationIndex);

            const nextActiveBuffer = activeBuffer === 'buffer1' ? 'buffer2' : 'buffer1';
            exitingBufferId = activeBuffer;

            const processedContent = newLyric;

            // 将新歌词内容设置给即将进场的 buffer
            if (nextActiveBuffer === 'buffer1') {
                setLyricText1(processedContent);
            } else {
                setLyricText2(processedContent);
            }

            // 切换 activeBuffer，触发进场动画
            setActiveBuffer(nextActiveBuffer);
        } else if (!newLyric) {
            // 没有歌词时，清空内容
            prevLyricsIndexRef.current = -1;
            setLyricText1('');
            setLyricText2('');
        }

        let timeoutId: ReturnType<typeof setTimeout> | undefined;
        if (exitingBufferId) {
            // 在退出动画结束后，清空旧歌词 buffer 的内容
            timeoutId = setTimeout(() => {
                if (exitingBufferId === 'buffer1') {
                    // 当 lyricText1 被清空时，它会触发高度重新计算 (useEffect)
                    setLyricText1('');
                } else {
                    // 当 lyricText2 被清空时，它会触发高度重新计算 (useEffect)
                    setLyricText2('');
                }
            }, ANIMATION_DURATION_MS);
        }

        return () => {
            if (timeoutId) {
                clearTimeout(timeoutId);
            }
        };

    }, [playerState.currentLyricsIndex, playerState.songLyricsLines, isPlaying, activeBuffer]);


    // 在绘制前同步高度；观察实际布局，覆盖宽高断点和字体加载引起的换行。
    useLayoutEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        if (!isPlaying || !(lyricText1 || lyricText2)) {
            container.style.height = '';
            return;
        }

        const buffers = [lyricBuffer1Ref.current, lyricBuffer2Ref.current];
        const updateHeight = () => {
            const height = Math.max(...buffers.map(buffer => buffer?.offsetHeight ?? 0));
            container.style.height = `${height}px`;
        };

        updateHeight();
        const observer = new ResizeObserver(updateHeight);
        buffers.forEach(buffer => {
            if (buffer) observer.observe(buffer);
        });
        return () => observer.disconnect();
    }, [isPlaying, lyricText1, lyricText2]);


    // --- 渲染逻辑 ---
    const isPlayingLyrics = isPlaying && (lyricText1 || lyricText2);

    const containerClassName = `lyrics-container ${isPlayingLyrics ? 'lyrics-container-playing' : ''}`;

    const animationEnterClassName = `lyrics-enter-${randomAnimationIndex}`;
    const animationExitClassName = `lyrics-exit-${randomAnimationIndex}`;

    const textColor = adjustColorBrightness(adjustColorBrightnessHSV(playerState.songCoverColorPalette[0] ?? '#ffffff', 100), 15);
    const textBackgroudColor = `linear-gradient(to bottom left, rgba(${hexToRgbString(textColor)}, 0.7), rgba(${hexToRgbString(textColor)}, 0.5)) text`;

    return (
        <>
            {isPlayingLyrics ? (
                <>
                    <div className={containerClassName} ref={containerRef}>

                        {/* Buffer 1 */}
                        <div
                            id="lyric-buffer-buffer1"
                            className={`lyrics lyrics-buffer ${activeBuffer === 'buffer1' ? animationEnterClassName : animationExitClassName
                                }`}
                            style={{background: textBackgroudColor}}
                            ref={lyricBuffer1Ref}
                        >
                            {lyricText1}
                        </div>

                        {/* Buffer 2 */}
                        <div
                            id="lyric-buffer-buffer2"
                            className={`lyrics lyrics-buffer ${activeBuffer === 'buffer2' ? animationEnterClassName : animationExitClassName
                                }`}
                            style={{background: textBackgroudColor}}
                            ref={lyricBuffer2Ref}
                        >
                            {lyricText2}
                        </div>

                    </div>
                </>
            ) : (<div className={containerClassName} ref={containerRef}></div>)}
        </>
    );
}

export default Lyrics;