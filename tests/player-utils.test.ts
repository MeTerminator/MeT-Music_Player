import assert from 'node:assert/strict';
import test from 'node:test';
import { decodeServerMessage } from '../src/features/player/model/protocol.ts';
import { currentLyric, parseLrc } from '../src/features/player/utils/lyrics.ts';
import { formatTime } from '../src/features/player/utils/time.ts';

test('LRC timestamps and current line', () => {
  const lines = parseLrc('[00:01.50][00:03.250]Hello\n[00:02.00]World\n[ar:Artist]');
  assert.deepEqual(lines, [
    { time: 1.5, text: 'Hello' },
    { time: 2, text: 'World' },
    { time: 3.25, text: 'Hello' },
  ]);
  assert.equal(currentLyric(lines, 0), -1);
  assert.equal(currentLyric(lines, 1.3), 0);
  assert.equal(currentLyric(lines, 2.1), 1);
  assert.equal(formatTime(Number.NaN), '0:00');
  assert.equal(formatTime(125), '2:05');
});

test('server messages reject malformed feedback', () => {
  assert.equal(decodeServerMessage('{bad'), null);
  assert.equal(decodeServerMessage(JSON.stringify({ type: 'feedback', SessionId: 'a', data: { status: 'true' } })), null);
  assert.equal(decodeServerMessage(JSON.stringify({ type: 'time', status: 'ok', timestamp: '100' })), null);
  assert.deepEqual(decodeServerMessage(JSON.stringify({ type: 'feedback', SessionId: 'a', data: { event: 'play', songMid: 'm', systemTime: 1000, currentTime: 1 } })), {
    type: 'feedback', SessionId: 'a',
    data: { event: 'play', status: undefined, songMid: 'm', systemTime: 1000, currentTime: 1 },
  });
});
