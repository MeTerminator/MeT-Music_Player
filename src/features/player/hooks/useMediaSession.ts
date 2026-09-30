import { useEffect } from 'react';
import type { PlayerState } from '../model/types';

export function useMediaSession(audioRef: React.RefObject<HTMLAudioElement | null>, state: PlayerState, requestPlayback: () => void): void {
  const { songName, songSinger, songAlbum, songCoverUrl, isPlaying, progressValue, progressMax } = state;

  useEffect(() => {
    const mediaSession = navigator.mediaSession;
    if (!mediaSession) return;
    if (songName) {
      mediaSession.metadata = new MediaMetadata({
        title: songName,
        artist: songSinger,
        album: songAlbum,
        artwork: songCoverUrl ? [{ src: songCoverUrl, sizes: '800x800', type: 'image/jpeg' }] : [],
      });
    }
    mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
  }, [songName, songSinger, songAlbum, songCoverUrl, isPlaying]);

  useEffect(() => {
    const mediaSession = navigator.mediaSession;
    const audio = audioRef.current;
    if (!mediaSession || !audio) return;
    const actions: Array<MediaSessionAction> = ['play', 'pause', 'seekbackward', 'seekforward', 'seekto'];
    const setHandler = (action: MediaSessionAction, handler: MediaSessionActionHandler | null) => {
      try { mediaSession.setActionHandler(action, handler); } catch { /* Browser does not support this action. */ }
    };
    setHandler('play', requestPlayback);
    setHandler('pause', () => audio.pause());
    setHandler('seekbackward', details => { audio.currentTime = Math.max(0, audio.currentTime - (details.seekOffset ?? 10)); });
    setHandler('seekforward', details => { audio.currentTime = Math.min(audio.duration, audio.currentTime + (details.seekOffset ?? 10)); });
    setHandler('seekto', details => { if (details.seekTime !== undefined) audio.currentTime = details.seekTime; });
    return () => actions.forEach(action => setHandler(action, null));
  }, [audioRef, requestPlayback]);

  useEffect(() => {
    if (!Number.isFinite(progressMax) || progressMax <= 0 || progressMax === 100) return;
    try {
      navigator.mediaSession?.setPositionState?.({ duration: progressMax, position: Math.min(progressValue, progressMax) });
    } catch { /* Some browsers reject transient media positions. */ }
  }, [progressValue, progressMax]);
}
