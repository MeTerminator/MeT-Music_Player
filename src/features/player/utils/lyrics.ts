import type { LyricLine } from '../model/types';

export function parseLrc(lrc: string): LyricLine[] {
  const result: LyricLine[] = [];
  for (const line of lrc.split(/\r?\n/)) {
    const stamps = [...line.matchAll(/\[(\d{1,2}):(\d{2})(?:\.(\d{2,3}))?\]/g)];
    const text = line.replace(/\[\d{1,2}:\d{2}(?:\.\d{2,3})?\]/g, '').trim();
    if (!text) continue;
    for (const stamp of stamps) {
      const milliseconds = stamp[3] ? Number(stamp[3].padEnd(3, '0')) : 0;
      result.push({ time: Number(stamp[1]) * 60 + Number(stamp[2]) + milliseconds / 1000, text });
    }
  }
  return result.sort((a, b) => a.time - b.time);
}

export function currentLyric(lines: LyricLine[], seconds: number): number {
  for (let index = lines.length - 1; index >= 0; index--) {
    if (seconds + 0.3 >= lines[index].time) return index;
  }
  return -1;
}
