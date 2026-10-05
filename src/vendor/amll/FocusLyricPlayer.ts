import { DomLyricPlayer } from './lyric-player/dom';
import type { LyricLine } from './interfaces';
import { focusTimeline, pushedRowY } from './focus-timeline';
import { ENTER_DURATION, PROMOTE_DURATION, FOCUS_MOTION, springProgress } from './focus-motion';
import { largestFittingFont, lyricSlots } from './focus-typography';
export { FOCUS_MOTION } from './focus-motion';

type Role = 'current' | 'preview' | 'exit';
interface Row {
    y: number;
    opacity: number;
    blur: number;
    role: Role;
    exitElapsed: number;
    outgoing: boolean;
}

export class FocusLyricPlayer extends DomLyricPlayer {
    private focusLines: LyricLine[] = [];
    private rows = new Map<number, Row>();
    private resetFocus = true;
    private reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    private typographyCache = new Map<number, string>();
    private invalidateTypography = () => this.typographyCache.clear();

    constructor() {
        super();
        this.getElement().classList.add('focus-lyric-player');
        this.getElement().setAttribute('aria-label', '歌词');
        this.setEnableScale(false);
        this.setEnableBlur(false);
        this.setEnableSpring(false);
        this.setEnableAutoSeekDetection(false);
        this.setOptimizeOptions({ tryAdvanceStartTime: false, resetLineTimestamps: false, cleanUnintentionalOverlaps: false });
        document.fonts.addEventListener('loadingdone', this.invalidateTypography);
    }

    override dispose() {
        document.fonts.removeEventListener('loadingdone', this.invalidateTypography);
        super.dispose();
    }

    private fitRow(index: number, maxHeight: number) {
        const root = this.getElement();
        const group = this.currentLyricGroups[index];
        // Incoming rows can still be below the clipping boundary during sizing.
        // Force real layout instead of content-visibility's intrinsic placeholder.
        group.mainLine.getElement().style.contentVisibility = 'visible';
        const cacheKey = `${root.clientWidth}:${root.clientHeight}`;
        if (this.typographyCache.get(index) === cacheKey) return;
        const measure = (fontSize: number) => {
            group.element.style.fontSize = `${fontSize}px`;
            group.mainLine.reflowTypography();
            // Measure glyphs, not AMLL's generous padding around animated words.
            const main = group.mainLine.getElement().firstElementChild!;
            const walker = document.createTreeWalker(main, NodeFilter.SHOW_TEXT);
            const range = document.createRange();
            let left = Infinity, right = -Infinity;
            while (walker.nextNode()) {
                range.selectNodeContents(walker.currentNode);
                for (const rect of range.getClientRects()) {
                    left = Math.min(left, rect.left);
                    right = Math.max(right, rect.right);
                }
            }
            return { width: Math.max(0, right - left), height: group.element.getBoundingClientRect().height };
        };
        const fontSize = largestFittingFont(maxHeight * 2, root.clientWidth * 0.9, maxHeight, measure);
        measure(Math.max(0.1, fontSize));
        this.typographyCache.set(index, cacheKey);
    }

    protected override buildLyricGroups() {
        super.buildLyricGroups();
        // Focus mode virtualizes by role rather than the upstream scrolling viewport.
        this.currentLyricGroups.forEach((group, index) => {
            group.isInRenderRange = () => this.rows?.has(index) ?? false;
        });
    }

    override pause() {
        super.pause();
        this.resetFocus = true;
    }

    override setLyricLines(lines: LyricLine[], initialTime = 0) {
        this.focusLines = lines;
        this.typographyCache.clear();
        this.rows.clear();
        this.resetFocus = true;
        super.setLyricLines(lines, initialTime);
    }

    override setCurrentTime(time: number, isSeek = false) {
        if (isSeek || time < this.getCurrentTime() || Math.abs(time - this.getCurrentTime()) > 1000) {
            this.resetFocus = true;
        }
        super.setCurrentTime(time, isSeek);
    }

    override update(delta = 0) {
        super.update(delta);
        if (!this.rows || !this.focusLines) return;
        const dt = Math.max(0, Math.min(delta, 64));
        const time = this.getCurrentTime();
        const { current, preview, revealAt, promoteAt, enterDuration, promoteDuration } = focusTimeline(this.focusLines, time);
        const root = this.getElement();
        const slots = lyricSlots(root.clientHeight);
        this.interludeDots.getElement().style.display = 'none';
        this.bottomLine.getElement().style.display = 'none';
        if (this.resetFocus) this.rows.clear();
        const desired = new Map<number, Role>();
        if (current >= 0) desired.set(current, 'current');
        if (preview >= 0) desired.set(preview, 'preview');
        for (const [index, role] of desired) {
            if (!this.rows.has(index)) {
                this.rows.set(index, { y: 0, role, opacity: 1, blur: 0, exitElapsed: 0, outgoing: false });
            }
        }
        for (const [index, row] of this.rows) {
            row.role = desired.get(index) ?? 'exit';
            if (row.role === 'exit') row.exitElapsed += dt;
            if (row.exitElapsed >= FOCUS_MOTION.exitDuration || (this.reduceMotion.matches && row.role === 'exit')) this.rows.delete(index);
        }
        for (let index = 0; index < this.currentLyricGroups.length; index++) {
            const group = this.currentLyricGroups[index];
            const row = this.rows.get(index);
            // Restore the normal brightness lifecycle after seeks or row reuse.
            const held = row?.role === 'current' && (time < this.focusLines[index].startTime || time >= this.focusLines[index].endTime);
            const singleLayer = !!row && (row.outgoing || row.role === 'exit' || held);
            group.mainLine.setSingleLayer(singleLayer);
            group.bgLine?.setSingleLayer(singleLayer);
            if (this.rows.has(index)) {
                group.show();
                this.fitRow(index, slots.rowHeight);
            }
            else group.hide();
        }
        const currentGroup = this.currentLyricGroups[current];
        const currentRow = this.rows.get(current);
        const currentHeight = currentGroup?.element.getBoundingClientRect().height ?? this.baseFontSize * 1.6;
        const currentRestY = slots.centerY - currentHeight / 2;
        if (currentRow) {
            currentRow.y = currentRestY;
            currentRow.opacity = 1;
            currentRow.blur = 0;
        }
        const previewGroup = this.currentLyricGroups[preview];
        const previewRow = this.rows.get(preview);
        if (previewRow && previewGroup) {
            const height = previewGroup.element.getBoundingClientRect().height;
            const dockY = currentRestY + currentHeight;
            const bottomY = root.clientHeight + height * 0.2;
            const targetY = slots.centerY - height / 2;
            const enter = (elapsed: number) => enterDuration > 0
                ? springProgress(FOCUS_MOTION.enter, elapsed * ENTER_DURATION / enterDuration) : 1;
            const entering = Math.max(0, enter(time - revealAt));
            const promoting = time >= promoteAt;
            const promotion = promoting ? springProgress(FOCUS_MOTION.promote,
                (time - promoteAt) * PROMOTE_DURATION / Math.max(promoteDuration, 1)) : 0;
            const promotionStartY = bottomY + (dockY - bottomY) * enter(promoteAt - revealAt);
            previewRow.y = promoting
                ? promotionStartY + (targetY - promotionStartY) * promotion
                : bottomY + (dockY - bottomY) * entering;
            if (this.reduceMotion.matches) previewRow.y = promoting ? targetY : dockY;
            const progress = Math.max(0, Math.min(1, promotion));
            previewRow.opacity = Math.min(1, Math.max(0, entering)) * (0.58 + 0.42 * progress);
            previewRow.blur = Math.max(0, 12 * (1 - Math.min(1, entering)), 1.5 * (1 - progress));
            if (currentRow) {
                // Tight contact couples both positions; the previous row cannot
                // exit before the incoming row reaches and pushes its lower edge.
                currentRow.y = pushedRowY(currentRestY, previewRow.y, currentHeight);
                const pushed = Math.min(1, Math.max(0, (currentRestY - currentRow.y) / currentHeight));
                if (pushed > 0) currentRow.outgoing = true;
                currentRow.opacity = 1 - pushed;
                currentRow.blur = 14 * pushed;
            }
        }
        for (const [index, row] of this.rows) {
            const group = this.currentLyricGroups[index];
            if (!group) continue;
            const held = row.role === 'current' && (time < this.focusLines[index].startTime || time >= this.focusLines[index].endTime);
            const singleLayer = row.outgoing || row.role === 'exit' || held;
            group.mainLine.setSingleLayer(singleLayer);
            group.bgLine?.setSingleLayer(singleLayer);
            if (row.role === 'exit') {
                // Continue contact with the incoming current row after handover.
                row.y = Math.min(row.y, (currentRow?.y ?? currentRestY) - group.element.getBoundingClientRect().height);
                row.opacity *= Math.exp(-dt / FOCUS_MOTION.fadeTime);
                row.blur += (14 - row.blur) * (1 - Math.exp(-dt / FOCUS_MOTION.blurTime));
            }
            group.element.dataset.focusRole = row.role;
            group.element.dataset.focusHeld = String(held);
            group.element.setAttribute('aria-hidden', String(row.role !== 'current'));
            group.element.style.transform = `translateY(${row.y}px)`;
            group.element.style.opacity = `${row.opacity}`;
            group.element.style.filter = `blur(${row.blur}px)`;
        }
        this.resetFocus = false;
    }
}
