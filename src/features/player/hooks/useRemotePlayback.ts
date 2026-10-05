import { useCallback, useEffect, useRef, useState } from 'react';
import { getCoverColors, getLyrics, getSong } from '../api/song';
import { initialPlayerState, type PlayerState } from '../model/types';
import { decodeServerMessage } from '../model/protocol';
import { currentLyric } from '../utils/lyrics';
import { formatTime } from '../utils/time';

const WS_URL = 'wss://music.met6.top:444/api/ws/client';
const RECONNECT_DELAY_MS = 3000;
const SYNC_TOLERANCE_SECONDS = 0.5;

export function useRemotePlayback(audioRef: React.RefObject<HTMLAudioElement | null>, sessionId: string) {
  const [playerState, setPlayerState] = useState<PlayerState>(initialPlayerState);
  const [isAutoplayBlocked, setIsAutoplayBlocked] = useState(false);
  const stateRef = useRef(playerState);
  const wsRef = useRef<WebSocket | null>(null);
  const syncRef = useRef({ startTime: 0, serverOffset: 0, playing: false, pendingSeek: false });

  const updateState = useCallback((patch: Partial<PlayerState>) => {
    const next = { ...stateRef.current, ...patch };
    stateRef.current = next;
    setPlayerState(next);
  }, []);

  const requestPlayback = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    void audio.play().then(() => {
      setIsAutoplayBlocked(false);
    }).catch((error: unknown) => {
      if (error instanceof Error && error.name === 'NotAllowedError') {
        setIsAutoplayBlocked(true);
      }
      console.warn('播放失败', error);
    });
  }, [audioRef]);

  const togglePlayback = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) requestPlayback();
    else if (!stateRef.current.alwaysPlaying) audio.pause();
  }, [audioRef, requestPlayback]);

  const seekTo = useCallback((seconds: number) => {
    const audio = audioRef.current;
    if (!audio || !Number.isFinite(seconds)) return;
    syncRef.current.pendingSeek = false;
    audio.currentTime = Math.max(0, Math.min(seconds, Number.isFinite(audio.duration) ? audio.duration : seconds));
  }, [audioRef]);

  const setVolume = useCallback((volume: number) => {
    const audio = audioRef.current;
    if (!audio || !Number.isFinite(volume)) return;
    audio.volume = Math.min(1, Math.max(0, volume));
    updateState({ volume: audio.volume });
  }, [audioRef, updateState]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    let disposed = false;
    let reconnectTimer: ReturnType<typeof setTimeout> | undefined;
    let trackController: AbortController | undefined;
    let trackVersion = 0;
    let loadedMid = '';
    let lastStartTime = 0;
    let lyrics = initialPlayerState.songLyricsLines;

    const statusText = (isBuffering: boolean) => {
      if (wsRef.current?.readyState !== WebSocket.OPEN) return '未连接';
      if (isBuffering) return '加载中';
      if (audio.ended) return '已停止';
      return audio.paused ? '已暂停' : '播放中';
    };

    const publishAudio = (buffering = stateRef.current.isBuffering) => {
      const seconds = audio.currentTime;
      const lyricIndex = currentLyric(lyrics, seconds);
      updateState({
        isPlaying: !audio.paused && !audio.ended && !buffering,
        isBuffering: buffering,
        statusText: statusText(buffering),
        currentTime: formatTime(seconds),
        duration: formatTime(audio.duration),
        progressValue: seconds || 0,
        progressMax: Number.isFinite(audio.duration) && audio.duration > 0 ? audio.duration : 100,
        volume: audio.volume,
        currentLyricsIndex: lyricIndex,
        currentLyrics: lyricIndex < 0 ? '' : lyrics[lyricIndex].text,
      });
    };

    const seekToServerTime = () => {
      const { startTime, serverOffset } = syncRef.current;
      if (!startTime) return;
      const seconds = Math.max(0, (Date.now() + serverOffset - startTime) / 1000);
      audio.currentTime = Math.min(seconds, Number.isFinite(audio.duration) && audio.duration > 0 ? audio.duration : seconds);
      syncRef.current.pendingSeek = false;
    };

    const loadTrack = async (mid: string) => {
      const version = ++trackVersion;
      trackController?.abort();
      trackController = new AbortController();
      const signal = trackController.signal;
      loadedMid = '';
      lyrics = [];
      audio.pause();
      audio.removeAttribute('src');
      audio.load();
      updateState({
        songMid: mid, songName: '', songSinger: '', songAlbum: '',
        songCoverPmid: '', songCoverUrl: '', songCoverColorDominant: '', songCoverColorPalette: [],
        songLyricsLines: [], currentLyrics: '', currentLyricsIndex: -1, isBuffering: true,
      });
      try {
        const song = await getSong(mid, signal);
        if (disposed || version !== trackVersion) return;
        const pmid = song.track_info?.album?.pmid ?? '';
        updateState({
          songName: song.track_info?.title ?? '',
          songSinger: song.track_info?.singer?.map(singer => singer.name ?? singer.title ?? '').filter(Boolean).join(' / ') ?? '',
          songAlbum: song.track_info?.album?.name ?? '',
          songCoverPmid: pmid,
          songCoverUrl: pmid ? `https://y.qq.com/music/photo_new/T002R800x800M000${pmid}.jpg` : '',
        });
        loadedMid = mid;
        syncRef.current.pendingSeek = true;
        audio.src = song.url;
        audio.load();

        void getLyrics(mid, signal).then(lines => {
          if (disposed || version !== trackVersion) return;
          lyrics = lines;
          updateState({ songLyricsLines: lyrics });
          publishAudio();
        }).catch(error => { if (!signal.aborted) console.warn('获取歌词失败', error); });
        void getCoverColors(pmid).then(colors => {
          if (disposed || version !== trackVersion) return;
          updateState({ songCoverColorDominant: colors.dominant_color, songCoverColorPalette: colors.palette });
        }).catch(error => console.warn('提取封面颜色失败', error));
      } catch (error) {
        if (signal.aborted || disposed || version !== trackVersion) return;
        console.error('加载歌曲失败', error);
        updateState({ songMid: '', isBuffering: false, statusText: '加载失败' });
      }
    };

    const onCanPlay = () => {
      if (syncRef.current.pendingSeek) seekToServerTime();
      if (syncRef.current.playing) requestPlayback();
      publishAudio(false);
    };
    const onWaiting = () => publishAudio(true);
    // QRC 行切换按帧检查，只在行变化时发布状态，避免 timeupdate 的低频延迟。
    let lyricFrame = 0;
    const tickLyrics = () => {
      lyricFrame = 0;
      if (audio.paused || audio.ended) return;
      if (currentLyric(lyrics, audio.currentTime) !== stateRef.current.currentLyricsIndex) publishAudio();
      lyricFrame = requestAnimationFrame(tickLyrics);
    };
    const onAudioChange = () => {
      publishAudio();
      if (audio.paused || audio.ended) {
        cancelAnimationFrame(lyricFrame);
        lyricFrame = 0;
      } else if (!lyricFrame) lyricFrame = requestAnimationFrame(tickLyrics);
    };
    const onUserGesture = () => {
      if (syncRef.current.playing && audio.paused && audio.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
        requestPlayback();
      }
    };
    const onError = () => {
      if (audio.error) console.error('音频播放失败', audio.error.code, audio.error.message);
      updateState({ isBuffering: false, statusText: '播放失败' });
    };
    audio.addEventListener('canplay', onCanPlay);
    audio.addEventListener('waiting', onWaiting);
    audio.addEventListener('play', onAudioChange);
    audio.addEventListener('pause', onAudioChange);
    audio.addEventListener('ended', onAudioChange);
    audio.addEventListener('timeupdate', onAudioChange);
    audio.addEventListener('seeked', onAudioChange);
    audio.addEventListener('durationchange', onAudioChange);
    audio.addEventListener('volumechange', onAudioChange);
    audio.addEventListener('error', onError);
    document.addEventListener('pointerdown', onUserGesture, { passive: true });

    const connect = () => {
      if (disposed) return;
      let socket: WebSocket;
      try { socket = new WebSocket(WS_URL); }
      catch (error) {
        console.error('WebSocket 连接失败', error);
        reconnectTimer = setTimeout(connect, RECONNECT_DELAY_MS);
        return;
      }
      wsRef.current = socket;
      socket.onopen = () => {
        socket.send(JSON.stringify({ type: 'time' }));
        socket.send(JSON.stringify({ type: 'listen', SessionId: [sessionId] }));
        updateState({ isWsOpen: true, statusText: statusText(stateRef.current.isBuffering) });
      };
      socket.onmessage = event => {
        try {
          const message = decodeServerMessage(String(event.data));
          if (!message) return;
          if (message.type === 'time' && message.status === 'ok' && typeof message.timestamp === 'number') {
            syncRef.current.serverOffset = message.timestamp - Date.now();
          }
          if (message.type !== 'feedback' || message.SessionId !== sessionId || !message.data) return;
          const feedback = message.data;
          const playing = feedback.event === 'play' || feedback.status === true;
          const mid = feedback.songMid ?? '';
          const startTime = (feedback.systemTime ?? Date.now()) - (feedback.currentTime ?? 0) * 1000;
          syncRef.current.playing = playing;
          if (!playing || !mid) {
            audio.pause();
            publishAudio(false);
            return;
          }
          syncRef.current.startTime = startTime;
          if (mid !== loadedMid && mid !== stateRef.current.songMid) {
            lastStartTime = startTime;
            void loadTrack(mid);
          } else if (mid === loadedMid) {
            if (Math.abs(startTime - lastStartTime) > 500) lastStartTime = startTime;
            if (!audio.paused) {
              const expected = Math.max(0, (Date.now() + syncRef.current.serverOffset - startTime) / 1000);
              if (Math.abs(audio.currentTime - expected) > SYNC_TOLERANCE_SECONDS) seekToServerTime();
            } else if (audio.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
              seekToServerTime();
              requestPlayback();
            }
          }
        } catch (error) { console.warn('WebSocket 消息解析失败', error); }
      };
      socket.onerror = error => console.warn('WebSocket 错误', error);
      socket.onclose = () => {
        if (wsRef.current === socket) wsRef.current = null;
        if (disposed) return;
        updateState({ isWsOpen: false, statusText: '未连接' });
        reconnectTimer = setTimeout(connect, RECONNECT_DELAY_MS);
      };
    };
    if (sessionId) connect();
    else updateState({ statusText: '未连接' });

    return () => {
      disposed = true;
      cancelAnimationFrame(lyricFrame);
      trackVersion++;
      trackController?.abort();
      if (reconnectTimer) clearTimeout(reconnectTimer);
      const socket = wsRef.current;
      wsRef.current = null;
      socket?.close();
      audio.pause();
      audio.removeAttribute('src');
      audio.load();
      audio.removeEventListener('canplay', onCanPlay);
      audio.removeEventListener('waiting', onWaiting);
      audio.removeEventListener('play', onAudioChange);
      audio.removeEventListener('pause', onAudioChange);
      audio.removeEventListener('ended', onAudioChange);
      audio.removeEventListener('timeupdate', onAudioChange);
      audio.removeEventListener('seeked', onAudioChange);
      audio.removeEventListener('durationchange', onAudioChange);
      audio.removeEventListener('volumechange', onAudioChange);
      audio.removeEventListener('error', onError);
      document.removeEventListener('pointerdown', onUserGesture);
    };
  }, [audioRef, sessionId, updateState, requestPlayback]);

  return { playerState, togglePlayback, seekTo, setVolume, isAutoplayBlocked, resumePlayback: requestPlayback };
}
