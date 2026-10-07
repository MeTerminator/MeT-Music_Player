import assert from 'node:assert/strict';
import test from 'node:test';
import { decodeServerMessage } from '../src/features/player/model/protocol.ts';
import { currentLyric, getLyricShadowWord, lyricWordProgress, parseLrc, parseLyrics, parseQrc, parseYrc } from '../src/features/player/utils/lyrics.ts';
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

test('shadow chooses longest timed word rather than longest text or emotional keyword', () => {
  const [line] = parseQrc('[1000,5000]love (1000,100)extraordinary (1100,200)oh (1300,1000) (2300,2000)!(4300,1500)');
  assert.equal(getLyricShadowWord(line), 'Oh');
  const [chinese] = parseQrc('[1000,2000]我(1000,100)爱(1100,1200)你(2300,700)');
  assert.equal(getLyricShadowWord(chinese), '爱');
  const [tie] = parseQrc('[1000,2000]first (1000,1000)second(2000,1000)');
  assert.equal(getLyricShadowWord(tie), 'First');
});

test('shadow handles LRC, punctuation-only lyrics and absent lines', () => {
  assert.equal(getLyricShadowWord(parseLrc('[00:01]hello world')[0]), 'Hello');
  assert.equal(getLyricShadowWord(parseLrc('[00:01]你好世界')[0]), '你');
  assert.equal(getLyricShadowWord(parseQrc('[1000,100]!(1000,100)')[0]), '');
  assert.equal(getLyricShadowWord(undefined), '');
});


test('NetEase feedback accepts numeric IDs, retains source and accepts empty-room stops', () => {
  const feedback = (data: unknown) => decodeServerMessage(JSON.stringify({ type: 'feedback', SessionId: 'room', data }));
  assert.deepEqual(feedback({ songMid: 123, songSource: 'netease', status: true }), {
    type: 'feedback', SessionId: 'room',
    data: { event: undefined, status: true, songMid: '123', songSource: 'netease', systemTime: undefined, currentTime: undefined },
  });
  assert.equal(feedback({ songMid: null, status: false })?.type, 'feedback');
  for (const songMid of [-1, 1.5, {}, [], true]) assert.equal(feedback({ songMid }), null);
  for (const songSource of ['unknown', null, ['netease']]) assert.equal(feedback({ songSource }), null);
});

test('YRC preserves absolute word timing, spaces, punctuation and skips JSON metadata', () => {
  const lines = parseYrc('{"t":0,"c":[{"tx":"作词"}]}\n[3000,1000](3000,1000,0)World!\n[1000,1200](1000,400,0)你(1400,400,0)好 (1800,400,0)！');
  assert.deepEqual(lines[0], {
    time: 1, duration: 1.2, text: '你好 ！', words: [
      { time: 1, duration: 0.4, text: '你' },
      { time: 1.4, duration: 0.4, text: '好 ' },
      { time: 1.8, duration: 0.4, text: '！' },
    ],
  });
  assert.equal(lines[1].text, 'World!');
  assert.equal(currentLyric(lines, 0.9), -1);
  assert.ok(Math.abs(lyricWordProgress(lines[0].words![1], 1.6) - 0.5) < 1e-9);
});

test('NetEase prefers native YRC, falls back to LRC and accepts legacy QRC only without YRC', () => {
  const yrc = '[1000,500](1000,500,0)原生';
  const qrc = '[1000,500]旧版(1000,500)';
  const lrc = '[00:01]普通';
  assert.deepEqual(parseLyrics({ yrc, qrc, lrc }, 'netease'), parseYrc(yrc));
  for (const yrc of ['', null, 'broken', '[1000,500]no word timing']) {
    assert.deepEqual(parseLyrics({ yrc, qrc, lrc }, 'netease'), parseLrc(lrc));
  }
  assert.deepEqual(parseLyrics({ qrc, lrc }, 'netease'), parseQrc(qrc));
  assert.deepEqual(parseLyrics({ yrc, qrc, lrc }), parseQrc(qrc));
});
