import assert from 'node:assert/strict';
import test from 'node:test';
import { toAmllLyrics } from '../src/features/player/utils/amll.ts';
import { focusTimeline, pushedRowY } from '../src/vendor/amll/focus-timeline.ts';
import { ENTER_DURATION, PROMOTE_DURATION, FOCUS_MOTION, springProgress } from '../src/vendor/amll/focus-motion.ts';
import { Spring } from '../src/vendor/amll/utils/spring.ts';
import { Duration } from '../src/vendor/amll/utils/time.ts';

const lines = toAmllLyrics([
    { time: 1, duration: 4, text: '第一句', words: [{ text: '第一句', time: 1, duration: 4 }] },
    { time: 6, duration: 2, text: '下一句' },
    { time: 8, duration: 1, text: '最后一句' },
]);

const visibleRows = (source: typeof lines, time: number) => {
    const { current, preview } = focusTimeline(source, time);
    return { current, preview };
};

test('intro, interlude and outro keep a current lyric without changing word timing', () => {
    assert.equal(visibleRows(lines, 999).current, 0);
    assert.equal(visibleRows(lines, 5000).current, 0);
    assert.equal(visibleRows(lines, 5999).current, 0);
    assert.equal(visibleRows(lines, 6000).current, 1);
    assert.equal(visibleRows(lines, 9000).current, 2);
    assert.equal(visibleRows(lines, 1000).current, 0);
    assert.equal(lines[0].endTime, 5000);
    assert.equal(lines[0].words[0].endTime, 5000);
    for (let time = 0; time < 20000; time += 23) assert.ok(visibleRows(lines, time).current >= 0);
});

test('entry and promotion compensate actual spring duration ahead of singing', () => {
    const plan = focusTimeline(lines, 1000);
    const landmark = 1000 + (6000 - 1000) * 0.85;
    assert.equal(plan.revealAt + ENTER_DURATION, landmark);
    assert.equal(plan.promoteAt + PROMOTE_DURATION, 6000);
    assert.equal(visibleRows(lines, plan.revealAt - 1).preview, -1);
    assert.equal(visibleRows(lines, plan.revealAt).preview, 1);
    assert.ok(Math.abs(1 - springProgress(FOCUS_MOTION.promote, PROMOTE_DURATION)) <= 0.01);
    assert.ok(Math.abs(1 - springProgress(FOCUS_MOTION.enter, ENTER_DURATION)) <= 0.01);
});

test('preview animation including compensation never starts more than three seconds early', () => {
    for (const span of [100, 1000, 5000, 16000, 17000, 20000, 60000]) {
        const source = toAmllLyrics([{ time: 1, duration: 1, text: '间奏前一句' }, { time: 1 + span / 1000, text: '下一句' }]);
        const plan = focusTimeline(source, 1000);
        const nextStart = source[1].startTime;
        assert.ok(nextStart - plan.revealAt <= 3000);
        assert.ok(plan.revealAt >= source[0].startTime);
        assert.equal(visibleRows(source, plan.revealAt - 1).preview, -1);
        assert.equal(visibleRows(source, plan.revealAt).preview, 1);
        if (span >= 17000) assert.equal(plan.revealAt, nextStart - 3000);
        assert.ok(plan.enterDuration >= 0);
        assert.ok(plan.promoteDuration >= 0);
        assert.equal(plan.promoteAt + plan.promoteDuration, nextStart);
    }
});

test('contact pushes the outgoing row, with no overlap or independent early exit', () => {
    const rest = 150, height = 120;
    assert.equal(pushedRowY(rest, 310, height), rest);
    assert.equal(pushedRowY(rest, 270, height), rest);
    assert.equal(pushedRowY(rest, 240, height), 120);
    assert.equal(pushedRowY(rest, 150, height), 30);
    for (let incoming = 400; incoming >= 100; incoming--) {
        assert.ok(pushedRowY(rest, incoming, height) + height <= incoming);
    }
});

test('short lines compress motion and seeks reconstruct the same compensated timeline', () => {
    const short = toAmllLyrics([{ time: 0, text: 'A' }, { time: 0.1, text: 'B' }]);
    const plan = focusTimeline(short, 50);
    assert.equal(plan.promoteAt, 0);
    assert.equal(plan.promoteDuration, 100);
    assert.equal(plan.enterDuration, 0);
    assert.equal(plan.preview, 1);
    assert.equal(visibleRows(short, 100).current, 1);
    const before = focusTimeline(lines, 5800);
    focusTimeline(lines, 12000);
    assert.deepEqual(focusTimeline(lines, 5800), before);
});

test('LRC ends use the next start and track duration; QRC timestamps retain millisecond precision', () => {
    const lrc = toAmllLyrics([{ time: 1, text: 'Hello' }, { time: 4, text: 'World' }], 10);
    assert.equal(lrc[0].endTime, 4000);
    assert.equal(lrc[1].endTime, 10000);
    assert.deepEqual(lrc[0].words, [{ word: 'Hello', startTime: 1000, endTime: 4000 }]);
    const qrc = toAmllLyrics([{ time: 1.125, duration: 1, text: '你！', words: [
        { time: 1.125, duration: 0.875, text: '你' }, { time: 2, duration: 0, text: '！' },
    ] }]);
    assert.equal(qrc[0].startTime, 1125);
    assert.equal(qrc[0].endTime, 2125);
    assert.equal(qrc[0].words[1].endTime, 2000);
    assert.deepEqual(visibleRows([], 4000), { current: -1, preview: -1 });
});

test('intentional overlap promotes the latest active row without displaying a full list', () => {
    const overlap = toAmllLyrics([{ time: 0, duration: 4, text: 'A' }, { time: 3, duration: 4, text: 'B' }]);
    assert.deepEqual(visibleRows(overlap, 2900), { current: 0, preview: 1 });
    assert.deepEqual(visibleRows(overlap, 3000), { current: 1, preview: -1 });
});

test('magnetic spring accelerates, slightly overshoots and settles; retargeting preserves motion', () => {
    const spring = new Spring(100);
    spring.updateParams({ mass: 1, stiffness: 210, damping: 22 });
    spring.setTargetPosition(0);
    const positions: number[] = [];
    for (let i = 0; i < 120; i++) {
        spring.update(Duration.fromMillis(16));
        positions.push(spring.getCurrentPosition());
    }
    assert.ok(100 - positions[0] < positions[0] - positions[1], 'starts gently then accelerates');
    assert.ok(Math.min(...positions) < 0, 'small spring overshoot');
    assert.ok(Math.min(...positions) > -5, 'overshoot stays restrained');
    assert.ok(Math.abs(positions.at(-1)!) < 0.02, 'settles into place');
    spring.setPosition(100);
    spring.setTargetPosition(50);
    spring.update(Duration.fromMillis(80));
    const before = spring.getCurrentPosition();
    spring.setTargetPosition(0);
    assert.equal(spring.getCurrentPosition(), before, 'promotion does not teleport');
});
