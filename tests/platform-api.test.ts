import assert from 'node:assert/strict';
import test from 'node:test';
import { getCoverImageUrl, getLyrics, getSong } from '../src/features/player/api/song.ts';

test('platform requests select quality and isolate song and lyric caches for identical IDs', async t => {
  const requests: URL[] = [];
  const controller = new AbortController();
  t.mock.method(globalThis, 'fetch', async (input: string | URL | Request, init?: RequestInit) => {
    const url = new URL(String(input));
    requests.push(url);
    assert.equal(init?.signal, controller.signal);
    const platform = url.searchParams.get('platform');
    const body = url.pathname.endsWith('/lyric/new')
      ? platform === 'netease' ? { yrc: '[1000,500](1000,500,0)网易云' } : { lrc: '[00:01]QQ' }
      : { data: [{ url: `https://example.com/${platform}.mp3`, track_info: { title: platform } }] };
    return new Response(JSON.stringify(body));
  });
  const qq = await getSong('same-id', 'qq', controller.signal);
  const netease = await getSong('same-id', 'netease', controller.signal);
  assert.notEqual(qq.url, netease.url);
  assert.equal(requests[0].searchParams.get('level'), 'hq');
  assert.equal(requests[1].searchParams.get('level'), 'exhigh');
  assert.equal((await getLyrics('same-id', 'qq', controller.signal))[0].text, 'QQ');
  assert.equal((await getLyrics('same-id', 'netease', controller.signal))[0].words?.[0].text, '网易云');
  assert.equal(await getSong('same-id', 'qq'), qq);
  assert.equal(await getSong('same-id', 'netease'), netease);
  await getLyrics('same-id', 'qq');
  await getLyrics('same-id', 'netease');
  assert.equal(requests.length, 4);
});

test('unplayable songs and failed requests do not poison caches', async t => {
  let calls = 0;
  t.mock.method(globalThis, 'fetch', async () => {
    calls++;
    if (calls === 1) return new Response('{}', { status: 502 });
    if (calls === 2) return new Response(JSON.stringify({ data: [{ url: null }] }));
    return new Response(JSON.stringify({ data: [{ url: 'https://example.com/retry.mp3' }] }));
  });
  await assert.rejects(getSong('retry-id', 'netease'), /502/);
  await assert.rejects(getSong('retry-id', 'netease'), /没有可播放链接/);
  assert.equal((await getSong('retry-id', 'netease')).url, 'https://example.com/retry.mp3');
  assert.equal(calls, 3);
});

test('cover proxy preserves NetEase picture URLs and selects high resolution', () => {
  const pic = 'https://p1.music.126.net/image.jpg?param=800y800&x=1';
  const netease = new URL(getCoverImageUrl(pic, 'netease', true));
  assert.equal(netease.pathname, '/api/web/album/cover/highpic');
  assert.equal(netease.searchParams.get('pic'), pic);
  assert.equal(netease.searchParams.get('platform'), 'netease');
  const qq = new URL(getCoverImageUrl('album-mid'));
  assert.equal(qq.searchParams.get('pic'), 'T002R300x300M000album-mid.jpg');
  assert.equal(qq.searchParams.get('platform'), 'qq');
  assert.equal(getCoverImageUrl('', 'netease'), '');
});


test('playback upgrades HTTP links before caching without rewriting signed queries', async t => {
  const url = 'http://m801.music.126.net/signed/audio.mp3?vuutv=a+b/c==&x=%2F';
  let requests = 0;
  t.mock.method(globalThis, 'fetch', async () => {
    requests++;
    return new Response(JSON.stringify({ data: [{ url }] }));
  });
  const song = await getSong('http-url-id', 'netease');
  assert.equal(song.url, url.replace('http:', 'https:'));
  assert.equal((await getSong('http-url-id', 'netease')).url, song.url);
  assert.equal(requests, 1);
});
