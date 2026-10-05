import { Spring, type SpringParams } from './utils/spring.ts';
import { Duration } from './utils/time.ts';

export function springProgress(params: Partial<SpringParams>, elapsed: number) {
    const spring = new Spring(0);
    spring.updateParams(params);
    spring.setTargetPosition(1);
    spring.update(Duration.fromMillis(Math.max(0, elapsed)));
    return spring.getCurrentPosition();
}

/** Time until the actual spring stays within 1% of its destination. */
export function springDuration(params: Partial<SpringParams>) {
    let lastOutside = 0;
    for (let ms = 0; ms <= 3000; ms += 8) {
        if (Math.abs(1 - springProgress(params, ms)) > 0.01) lastOutside = ms;
    }
    return lastOutside + 8;
}

export const FOCUS_MOTION = {
    enter: { mass: 1, stiffness: 210, damping: 22 },
    promote: { mass: 1, stiffness: 280, damping: 24 },
    exitDuration: 850,
    fadeTime: 190,
    blurTime: 250,
} as const;

export const ENTER_DURATION = springDuration(FOCUS_MOTION.enter);
export const PROMOTE_DURATION = springDuration(FOCUS_MOTION.promote);
