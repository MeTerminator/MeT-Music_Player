import type { LyricLine as PlayerLyricLine } from '../model/types';
import type { LyricLine } from '../../../vendor/amll/interfaces';

/** Preserve QRC timing; infer untimed LRC line ends from the next line or track end. */
export function toAmllLyrics(lines: readonly PlayerLyricLine[], trackDuration = NaN): LyricLine[] {
    return lines.map((line, index) => {
        const start = line.time;
        const wordEnd = Math.max(start, ...(line.words ?? []).map(word => word.time + word.duration));
        const fallbackEnd = lines[index + 1]?.time
            ?? (Number.isFinite(trackDuration) && trackDuration > start ? trackDuration : start + 6);
        const end = line.duration !== undefined && line.duration > 0
            ? Math.max(start + line.duration, wordEnd)
            : wordEnd > start ? wordEnd : fallbackEnd;
        const endTime = Math.max(start + 0.001, end) * 1000;
        return {
            startTime: start * 1000,
            endTime,
            words: line.words?.length ? line.words.map(word => ({
                word: word.text,
                startTime: word.time * 1000,
                endTime: (word.time + word.duration) * 1000,
            })) : [{ word: line.text, startTime: start * 1000, endTime }],
            translatedLyric: '', romanLyric: '', isBG: false, isDuet: false,
        };
    });
}
