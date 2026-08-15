// ---------------------------------------------------------------------------
// ANIMATION / CAMERA LAYER
//
// The camera is just an SVG viewBox frame — x, y, w, h — expressed entirely
// in local world units. It has no idea lat/lon exists. Fly-to targets are
// given as local x/y plus a "zoom" (the world-unit height the camera should
// frame), never as geo coordinates.
// ---------------------------------------------------------------------------

export interface CameraState {
	x: number;
	y: number;
	w: number;
	h: number;
}

/** A fly-to destination in local world space. Not a geo coordinate. */
export interface CameraTarget {
	x: number;
	y: number;
	/** World-unit height the camera frame should cover — smaller = closer. */
	zoom: number;
}

/** Classic ease-in-out cubic: slow start, fast middle, slow finish. */
export function easeInOutCubic(t: number): number {
	return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function lerp(a: number, b: number, t: number): number {
	return a + (b - a) * t;
}

function lerpCamera(from: CameraState, to: CameraState, t: number): CameraState {
	return {
		x: lerp(from.x, to.x, t),
		y: lerp(from.y, to.y, t),
		w: lerp(from.w, to.w, t),
		h: lerp(from.h, to.h, t)
	};
}

/**
 * Animates the camera from `from` to `to` over `durationMs`, calling
 * `onUpdate` on every frame with the interpolated camera state.
 *
 * Returns a cancel function — call it to stop the animation early (e.g.
 * because the user triggered another fly-to before this one finished).
 */
export function animateCamera(
	from: CameraState,
	to: CameraState,
	durationMs: number,
	onUpdate: (state: CameraState) => void,
	onComplete?: () => void,
	ease: (t: number) => number = easeInOutCubic
): () => void {
	let cancelled = false;
	const start = performance.now();

	function frame(now: number) {
		if (cancelled) return;
		const elapsed = now - start;
		const t = Math.min(1, elapsed / durationMs);
		onUpdate(lerpCamera(from, to, ease(t)));

		if (t < 1) {
			requestAnimationFrame(frame);
		} else {
			onComplete?.();
		}
	}

	requestAnimationFrame(frame);

	return () => {
		cancelled = true;
	};
}
