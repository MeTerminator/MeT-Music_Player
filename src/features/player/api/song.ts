import ColorThief from 'colorthief';
import type { CoverColors, SongData } from '../model/types';

const API_ROOT = 'https://music.met6.top:444';
const emptyColors: CoverColors = { dominant_color: '', palette: [] };
const songCache = new Map<string, SongData>();
const lyricsCache = new Map<string, string>();
const colorCache = new Map<string, CoverColors>();

export async function getSong(mid: string, signal?: AbortSignal): Promise<SongData> {
  const cached = songCache.get(mid);
  if (cached) return cached;
  const response = await fetch(`${API_ROOT}/api/web/song/url/v1?id=${encodeURIComponent(mid)}&level=hq`, { signal });
  if (!response.ok) throw new Error(`歌曲请求失败: ${response.status}`);
  const body = await response.json() as { data?: Array<Partial<SongData>> };
  const entry = body.data?.[0];
  if (!entry?.url) throw new Error(`歌曲 ${mid} 没有可播放链接`);
  const song: SongData = { ...entry, mid, url: entry.url };
  songCache.set(mid, song);
  return song;
}

export async function getLyrics(mid: string, signal?: AbortSignal): Promise<string> {
  const cached = lyricsCache.get(mid);
  if (cached !== undefined) return cached;
  const response = await fetch(`${API_ROOT}/api/v1/lrc?mid=${encodeURIComponent(mid)}`, { signal });
  if (!response.ok) throw new Error(`歌词请求失败: ${response.status}`);
  const lyrics = await response.text();
  lyricsCache.set(mid, lyrics);
  return lyrics;
}

export async function getCoverColors(pmid: string): Promise<CoverColors> {
  if (!pmid) return emptyColors;
  const cached = colorCache.get(pmid);
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
    image.src = `${API_ROOT}/api/web/album/cover/pic?pic=T002R300x300M000${encodeURIComponent(pmid)}.jpg`;
  });
  colorCache.set(pmid, colors);
  return colors;
}
