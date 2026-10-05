export interface TextBounds { width: number; height: number }

/** Find the largest measured size; each row owns half the central lyric window. */
export function largestFittingFont(maxSize: number, maxWidth: number, maxHeight: number,
    measure: (fontSize: number) => TextBounds) {
    let low = 0;
    let high = Math.max(0, maxSize);
    for (let i = 0; i < 12; i++) {
        const size = (low + high) / 2;
        const bounds = measure(size);
        if (bounds.width <= maxWidth && bounds.height <= maxHeight) low = size;
        else high = size;
    }
    return Math.floor(low * 10) / 10;
}

export function lyricSlots(viewportHeight: number) {
    const lyricWindowHeight = viewportHeight * 0.62;
    const margin = Math.min(12, Math.max(0, lyricWindowHeight * 0.025));
    const rowHeight = Math.max(0, (lyricWindowHeight - margin * 2) / 2);
    return { margin, rowHeight, centerY: viewportHeight / 2 };
}
