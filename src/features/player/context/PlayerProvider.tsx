import { useMemo, useRef, useState, type ReactNode } from 'react';
import { readSessionId } from '../../../shared/session';
import { useAudioAnalyser } from '../hooks/useAudioAnalyser';
import { useMediaSession } from '../hooks/useMediaSession';
import { useRemotePlayback } from '../hooks/useRemotePlayback';
import { PlayerContext } from './PlayerContext';

export function PlayerProvider({ children }: { children: ReactNode }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [sessionId] = useState(readSessionId);
  const { playerState, togglePlayback, seekTo, isAutoplayBlocked, resumePlayback } = useRemotePlayback(audioRef, sessionId);
  const audioDataArrayRef = useAudioAnalyser(audioRef);
  useMediaSession(audioRef, playerState, resumePlayback);
  const value = useMemo(() => ({ playerState, audioDataArrayRef, togglePlayback, seekTo, isAutoplayBlocked, resumePlayback }), [playerState, audioDataArrayRef, togglePlayback, seekTo, isAutoplayBlocked, resumePlayback]);

  return (
    <PlayerContext.Provider value={value}>
      <audio ref={audioRef} id="global-audio-player" crossOrigin="anonymous" preload="auto" />
      {children}
    </PlayerContext.Provider>
  );
}
