import { createContext, useContext, type RefObject } from 'react';
import type { PlayerState } from '../model/types';

export interface PlayerContextValue {
  playerState: PlayerState;
  audioDataArrayRef: RefObject<Uint8Array<ArrayBuffer> | null>;
  togglePlayback: () => void;
  seekTo: (seconds: number) => void;
}

export const PlayerContext = createContext<PlayerContextValue | null>(null);

export function usePlayer(): PlayerContextValue {
  const context = useContext(PlayerContext);
  if (!context) throw new Error('usePlayer must be used within PlayerProvider');
  return context;
}
