import assert from 'node:assert/strict';
import test from 'node:test';
import { decodeServerMessage } from '../src/features/player/model/protocol.ts';
import { currentLyric, lyricWordProgress, parseLrc, parseLyrics, parseQrc } from '../src/features/player/utils/lyrics.ts';
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

test('QRC XML preserves words, spaces, punctuation and absolute timing', () => {
  const lines = parseQrc('<?xml version="1.0"?><QrcInfos><Lyric_1 LyricContent="[offset:100]\n[1000,1200]你(1000,400)好(1400,400)！(1800,0)\n[3000,900]Hello (3000,400)&amp; world(3400,500)"/></QrcInfos>');
  assert.deepEqual(lines[0], {
    time: 1.1, duration: 1.2, text: '你好！',
    words: [
      { time: 1.1, duration: 0.4, text: '你' },
      { time: 1.5, duration: 0.4, text: '好' },
      { time: 1.9, duration: 0, text: '！' },
    ],
  });
  assert.equal(lines[1].text, 'Hello & world');
  assert.equal(lines[1].words?.[1].time, 3.5);
  assert.equal(currentLyric(lines, 0.9), -1);
  assert.equal(currentLyric(lines, 1.1), 0);
});

test('QRC takes priority and absent or unusable QRC falls back to LRC', () => {
  const lrc = '[00:01.00]普通歌词';
  const qrc = '[1000,1000]逐(1000,500)字(1500,500)';
  assert.equal(parseLyrics({ qrc, lrc })[0].text, '逐字');
  for (const missing of [undefined, null, '', 'broken', '[1000,1000]no word timing']) {
    assert.deepEqual(parseLyrics({ qrc: missing, lrc }), parseLrc(lrc));
  }
  assert.deepEqual(parseLyrics(null), []);
  assert.deepEqual(parseLyrics({ qrc: '', lrc: null }), []);
});

test('QRC literal quotes do not truncate the XML attribute or following lines', () => {
  const content = '[offset:0]\r\n[1000,1000]他说(1000,200)"别走"(1200,800)\r\n[2500,500]下一句(2500,500)';
  const qrc = `<?xml version="1.0"?><QrcInfos><LyricInfo><Lyric_1 LyricType="1" LyricContent="${content}\r\n"/>\r\n</LyricInfo></QrcInfos>`;
  const lines = parseQrc(qrc);
  assert.deepEqual(lines, [
    { time: 1, duration: 1, text: '他说"别走"', words: [
      { text: '他说', time: 1, duration: 0.2 },
      { text: '"别走"', time: 1.2, duration: 0.8 },
    ] },
    { time: 2.5, duration: 0.5, text: '下一句', words: [{ text: '下一句', time: 2.5, duration: 0.5 }] },
  ]);
  assert.deepEqual(parseLyrics({ qrc, lrc: '[00:01]fallback' }), lines);
});

test('QRC quoted text works in raw, CDATA, escaped XML and single-quoted attributes', () => {
  const content = '[offset:100]\n[1000,1000]"Don\'t (1000,400)go"(1400,600)';
  const expected = parseQrc(content);
  assert.equal(expected[0].text, '"Don\'t go"');
  assert.equal(expected[0].words?.[1].time, 1.5);
  for (const qrc of [
    `<QrcInfos><Lyric_1 LyricContent="${content}" /></QrcInfos>`,
    `<QrcInfos><Lyric_1 LyricContent='${content}' /></QrcInfos>`,
    `<QrcInfos><Lyric_1 LyricContent="${content.replaceAll('"', '&quot;').replaceAll("'", '&apos;')}" /></QrcInfos>`,
    `<QrcInfos><Lyric_1 LyricContent="${content.replaceAll('"', '&#34;').replaceAll("'", '&#x27;')}" /></QrcInfos>`,
    `<QrcInfos><Lyric_1><![CDATA[${content}]]></Lyric_1></QrcInfos>`,
    `<QrcInfos><Lyric_1 LyricContent = "${content}" LyricType="1" /></QrcInfos>`,
  ]) assert.deepEqual(parseQrc(qrc), expected);
});

test('word progress clamps and follows backward seeks and zero duration', () => {
  const word = { time: 10, duration: 2, text: '唱' };
  assert.equal(lyricWordProgress(word, 9), 0);
  assert.equal(lyricWordProgress(word, 10), 0);
  assert.equal(lyricWordProgress(word, 11), 0.5);
  assert.equal(lyricWordProgress(word, 20), 1);
  assert.equal(lyricWordProgress(word, 10.5), 0.25);
  assert.equal(lyricWordProgress({ ...word, duration: 0 }, 9), 0);
  assert.equal(lyricWordProgress({ ...word, duration: 0 }, 10), 1);
});
