export interface LyricWord {
  time: number;
  duration: number;
  text: string;
}

export interface LyricLine {
  time: number;
  text: string;
  duration?: number;
  words?: LyricWord[];
}

export type Platform = 'qq' | 'netease';
export type SongSource = 'qqmusic' | 'netease' | 'local';

export interface TrackInfo {
  mid?: string;
  title?: string;
  singer?: Array<{ name?: string; title?: string }>;
  album?: { name?: string; pmid?: string; picUrl?: string };
}

export interface SongData {
  mid: string;
  url: string;
  track_info?: TrackInfo;
}

export interface CoverColors {
  dominant_color: string;
  palette: string[];
}

export interface PlayerState {
  isPlaying: boolean;
  isBuffering: boolean;
  isWsOpen: boolean;
  statusText: string;
  songMid: string;
  songPlatform: Platform;
  songName: string;
  songSinger: string;
  songAlbum: string;
  songCoverPmid: string;
  songCoverUrl: string;
  songCoverColorDominant: string;
  songCoverColorPalette: string[];
  songLyricsLines: LyricLine[];
  currentLyrics: string;
  currentLyricsIndex: number;
  currentTime: string;
  duration: string;
  progressValue: number;
  progressMax: number;
  volume: number;
  alwaysPlaying: boolean;
}

export const initialPlayerState: PlayerState = {
  isPlaying: false,
  isBuffering: false,
  isWsOpen: false,
  statusText: '未连接',
  songMid: '',
  songPlatform: 'qq',
  songName: '',
  songSinger: '',
  songAlbum: '',
  songCoverPmid: '',
  songCoverUrl: '',
  songCoverColorDominant: '',
  songCoverColorPalette: [],
  songLyricsLines: [],
  currentLyrics: '',
  currentLyricsIndex: -1,
  currentTime: '0:00',
  duration: '0:00',
  progressValue: 0,
  progressMax: 100,
  volume: 1,
  alwaysPlaying: true,
};

export interface FeedbackMessage {
  type: 'feedback';
  SessionId: string;
  data: {
    event?: string;
    status?: boolean;
    songMid?: string | null;
    songSource?: SongSource;
    systemTime?: number;
    currentTime?: number;
  };
}

export interface TimeMessage {
  type: 'time';
  status: string;
  timestamp: number;
}
