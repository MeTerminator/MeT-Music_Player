import assert from 'node:assert/strict';
import test from 'node:test';
import { largestFittingFont, lyricSlots } from '../src/vendor/amll/focus-typography.ts';

test('short and long rows independently take the largest font that fits', () => {
    const short = largestFittingFont(400, 900, 200, size => ({ width: size * 3, height: size * 1.2 }));
    const long = largestFittingFont(400, 900, 200, size => ({ width: size * 12, height: size * 1.2 }));
    assert.ok(short > 166 && short <= 200 / 1.2);
    assert.ok(long > 74.8 && long <= 75);
    assert.ok(short > long * 2);
});

test('wrapped rows respect their height allowance and keep the next row inside the viewport', () => {
    for (const viewport of [120, 320, 446, 800]) {
        const { rowHeight, centerY, margin } = lyricSlots(viewport);
        assert.equal(centerY, viewport / 2, 'active row stays centered in the page');
        const size = largestFittingFont(rowHeight * 2, 300, rowHeight, font => ({
            width: Math.min(300, font * 20),
            height: Math.ceil(font * 20 / 300) * font * 1.2,
        }));
        const height = Math.ceil(size * 20 / 300) * size * 1.2;
        assert.ok(height <= rowHeight);
        assert.ok(centerY - height / 2 >= margin);
        assert.ok(centerY + height / 2 + rowHeight <= viewport - margin + 0.001);
    }
});
