import type { LyricLine, LyricWord } from '../model/types';

// QRC 的字词时间为歌曲的绝对毫秒时间，不是相对行首的偏移。
export function parseQrc(qrc: string): LyricLine[] {
  // Like MeT-Music_UI's QRC extraction, stop at the XML wrapper rather than
  // a quote inside the lyrics. API responses can contain unescaped quotes.
  // Also allow whitespace, either attribute quote, and following XML attributes.
  const content = qrc.match(/\bLyricContent\s*=\s*(["'])([\s\S]*?)\1(?=\s*(?:[\w:.-]+\s*=\s*(?:"[^"]*"|'[^']*')\s*)*\/?>)/)?.[2]
    ?? qrc.match(/<!\[CDATA\[([\s\S]*?)\]\]>/)?.[1] ?? qrc;
  const decoded = content.replace(/&(#x[\da-f]+|#\d+|quot|apos|lt|gt|amp);/gi, (entity, name: string) => {
    const entities: Record<string, string> = { quot: '"', apos: "'", lt: '<', gt: '>', amp: '&' };
    if (!name.startsWith('#')) return entities[name.toLowerCase()] ?? entity;
    const code = name.toLowerCase().startsWith('#x') ? parseInt(name.slice(2), 16) : Number(name.slice(1));
    return code <= 0x10ffff ? String.fromCodePoint(code) : entity;
  });
  const offset = Number(decoded.match(/\[offset:([+-]?\d+)\]/i)?.[1] ?? 0);
  const result: LyricLine[] = [];
  for (const raw of decoded.split(/\r?\n/)) {
    const line = raw.match(/^\s*\[(\d+),(\d+)\]([\s\S]*)$/);
    if (!line) continue;
    const words: LyricWord[] = [];
    let cursor = 0;
    for (const stamp of line[3].matchAll(/\((\d+),(\d+)\)/g)) {
      const text = line[3].slice(cursor, stamp.index);
      if (text) words.push({ text, time: (Number(stamp[1]) + offset) / 1000, duration: Number(stamp[2]) / 1000 });
      cursor = stamp.index + stamp[0].length;
    }
    const trailing = line[3].slice(cursor);
    if (trailing && words.length) {
      const last = words[words.length - 1];
      words.push({ text: trailing, time: last.time + last.duration, duration: 0 });
    }
    const text = words.length ? words.map(word => word.text).join('') : line[3];
    if (!text.trim()) continue;
    result.push({ time: (Number(line[1]) + offset) / 1000, duration: Number(line[2]) / 1000, text, ...(words.length ? { words } : {}) });
  }
  return result.sort((a, b) => a.time - b.time);
}

export function parseLyrics(body: unknown): LyricLine[] {
  if (!body || typeof body !== 'object') return [];
  const { qrc, lrc } = body as { qrc?: unknown; lrc?: unknown };
  const lines = typeof qrc === 'string' ? parseQrc(qrc) : [];
  if (lines.some(line => line.words?.length)) return lines;
  return typeof lrc === 'string' ? parseLrc(lrc) : [];
}

export function lyricWordProgress(word: LyricWord, seconds: number): number {
  if (seconds < word.time) return 0;
  if (word.duration <= 0) return 1;
  return Math.min(1, (seconds - word.time) / word.duration);
}

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
    if (seconds + (lines[index].duration === undefined ? 0.3 : 0) >= lines[index].time) return index;
  }
  return -1;
}
