import ColorThief from 'colorthief';
import type { CoverColors, LyricLine, Platform, SongData } from '../model/types';
import { parseLyrics } from '../utils/lyrics.ts';

const API_ROOT = 'https://music.met6.top:444';
const emptyColors: CoverColors = { dominant_color: '', palette: [] };
const songCache = new Map<string, SongData>();
const lyricsCache = new Map<string, LyricLine[]>();
const colorCache = new Map<string, CoverColors>();

export function getCoverImageUrl(pic: string, platform: Platform = 'qq', highResolution = false): string {
  if (!pic) return '';
  const filename = platform === 'netease' ? pic : `T002R300x300M000${pic}.jpg`;
  return `${API_ROOT}/api/web/album/cover/${highResolution ? 'highpic' : 'pic'}?pic=${encodeURIComponent(filename)}&platform=${platform}`;
}

export async function getSong(mid: string, platform: Platform = 'qq', signal?: AbortSignal): Promise<SongData> {
  const key = `${platform}:${mid}`;
  const cached = songCache.get(key);
  if (cached) return cached;
  const response = await fetch(`${API_ROOT}/api/web/song/url/v1?id=${encodeURIComponent(mid)}&level=${platform === 'netease' ? 'exhigh' : 'hq'}&platform=${platform}`, { signal });
  if (!response.ok) throw new Error(`歌曲请求失败: ${response.status}`);
  const body = await response.json() as { data?: Array<Partial<SongData>> };
  const entry = body.data?.[0];
  if (!entry?.url) throw new Error(`歌曲 ${mid} 没有可播放链接`);
  // Keep the signed path/query intact while avoiding mixed content on HTTPS pages.
  const song: SongData = { ...entry, mid, url: entry.url.replace(/^http:/, 'https:') };
  songCache.set(key, song);
  return song;
}

export async function getLyrics(mid: string, platform: Platform = 'qq', signal?: AbortSignal): Promise<LyricLine[]> {
  const key = `${platform}:${mid}`;
  const cached = lyricsCache.get(key);
  if (cached !== undefined) return cached;
  const response = await fetch(`${API_ROOT}/api/web/lyric/new?id=${encodeURIComponent(mid)}&platform=${platform}`, { signal });
  if (!response.ok) throw new Error(`歌词请求失败: ${response.status}`);
  const body: unknown = await response.json();
  const lyrics = parseLyrics(body, platform);
  lyricsCache.set(key, lyrics);
  return lyrics;
}

export async function getCoverColors(pic: string, platform: Platform = 'qq'): Promise<CoverColors> {
  if (!pic) return emptyColors;
  const key = `${platform}:${pic}`;
  const cached = colorCache.get(key);
  if (cached) return cached;
  const colors = await new Promise<CoverColors>((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => {
      try {
        const thief = new ColorThief();
        const toHex = (rgb: number[]) => `#${rgb.map(value => value.toString(16).padStart(2, '0')).join('')}`;
        resolve({
          dominant_color: toHex(thief.getColor(image)),
          palette: thief.getPalette(image, 6).map(toHex),
        });
      } catch (error) { reject(error); }
    };
    image.onerror = () => reject(new Error('封面图片加载失败'));
    image.src = getCoverImageUrl(pic, platform);
  });
  colorCache.set(key, colors);
  return colors;
}
