import type { LyricLine } from './interfaces';
import { ENTER_DURATION, PROMOTE_DURATION } from './focus-motion.ts';

export const PREVIEW_PROGRESS = 0.85;
export const MAX_PREVIEW_LEAD = 3000;
export function focusTimeline(lines: readonly LyricLine[], time: number) {
    if (!lines.length) return { current: -1, preview: -1, revealAt: Infinity, promoteAt: Infinity, enterDuration: 0, promoteDuration: 0 };
    // Retain the first row through the intro, the previous row through interludes,
    // and the last row until playback stops. Word timing remains untouched.
    let current = 0;
    for (let i = 1; i < lines.length && lines[i].startTime <= time; i++) current = i;
    const line = lines[current];
    const next = lines[current + 1];
    const span = next ? next.startTime - line.startTime : Infinity;
    const promoteAt = next ? Math.max(line.startTime, next.startTime - PROMOTE_DURATION) : Infinity;
    // Compensate entry at the 85% landmark, but cap the actual animation start
    // (including compensation) to three seconds before the next line starts.
    // Promotion settles when singing starts; interludes extend display duration.
    const revealAt = next ? Math.max(line.startTime, next.startTime - MAX_PREVIEW_LEAD,
        Math.min(line.startTime + span * PREVIEW_PROGRESS - ENTER_DURATION, promoteAt - ENTER_DURATION)) : Infinity;
    const preview = next && time >= revealAt ? current + 1 : -1;
    const enterDuration = next ? Math.min(ENTER_DURATION, promoteAt - revealAt) : 0;
    const promoteDuration = next ? next.startTime - promoteAt : 0;
    return { current, preview, revealAt, promoteAt, enterDuration, promoteDuration };
}

/** Contact constraint: incoming row physically pushes the preceding row upward. */
export function pushedRowY(restY: number, incomingY: number, height: number) {
    return Math.min(restY, incomingY - height);
}
