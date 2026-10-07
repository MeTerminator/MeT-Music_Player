import type { FeedbackMessage, SongSource, TimeMessage } from './types';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function decodeServerMessage(raw: string): FeedbackMessage | TimeMessage | null {
  let value: unknown;
  try { value = JSON.parse(raw) as unknown; }
  catch { return null; }
  if (!isRecord(value)) return null;

  if (value.type === 'time' && value.status === 'ok' && typeof value.timestamp === 'number' && Number.isFinite(value.timestamp)) {
    return { type: 'time', status: 'ok', timestamp: value.timestamp };
  }

  if (value.type !== 'feedback' || typeof value.SessionId !== 'string' || !isRecord(value.data)) return null;
  const data = value.data;
  if (data.event !== undefined && typeof data.event !== 'string') return null;
  if (data.status !== undefined && typeof data.status !== 'boolean') return null;
  if (data.songMid !== undefined && data.songMid !== null && typeof data.songMid !== 'string'
    && !(typeof data.songMid === 'number' && Number.isSafeInteger(data.songMid) && data.songMid >= 0)) return null;
  if (data.songSource !== undefined && (typeof data.songSource !== 'string' || !['qqmusic', 'netease', 'local'].includes(data.songSource))) return null;
  if (data.systemTime !== undefined && (typeof data.systemTime !== 'number' || !Number.isFinite(data.systemTime))) return null;
  if (data.currentTime !== undefined && (typeof data.currentTime !== 'number' || !Number.isFinite(data.currentTime))) return null;
  return {
    type: 'feedback',
    SessionId: value.SessionId,
    data: {
      event: data.event,
      status: data.status,
      songMid: data.songMid == null ? data.songMid : String(data.songMid),
      ...(data.songSource !== undefined ? { songSource: data.songSource as SongSource } : {}),
      systemTime: data.systemTime,
      currentTime: data.currentTime,
    },
  };
}
