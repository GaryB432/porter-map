<script lang="ts">
	import { airportGeo } from '$lib/geo';
	import { buildWorld, buildScene, makeGridLines, WORLD_BOUNDS } from '$lib/world';
	import {
		animateCamera,
		easeInOutCubic,
		type CameraState,
		type CameraTarget
	} from '$lib/animation';

	// Geo -> world happens once, here, at the boundary. Everything below
	// this line is pure local-coordinate scene data.
	const world = buildWorld(airportGeo);
	const scene = buildScene(world.points);
	const grid = makeGridLines(WORLD_BOUNDS, 40);

	const ASPECT = 3 / 2; // viewBox width : height

	function targetToCamera(target: CameraTarget): CameraState {
		const h = target.zoom;
		const w = h * ASPECT;
		return { x: target.x - w / 2, y: target.y - h / 2, w, h };
	}

	const wideCamera: CameraState = {
		x: 0,
		y: 0,
		w: WORLD_BOUNDS.width,
		h: WORLD_BOUNDS.height
	};

	interface FlyStop {
		id: string;
		label: string;
		target: CameraTarget;
	}

	const flyStops: FlyStop[] = [
		{
			id: 'wide',
			label: 'Wide overview',
			target: {
				x: WORLD_BOUNDS.width / 2,
				y: WORLD_BOUNDS.height / 2,
				zoom: WORLD_BOUNDS.height
			}
		},
		{
			id: 'approach',
			label: 'Runway 16 approach',
			target: { x: scene.runway.x1, y: scene.runway.y1, zoom: 60 }
		},
		{
			id: 'terminal',
			label: 'Terminal apron',
			target: {
				x: scene.terminal.x + scene.terminal.width / 2,
				y: scene.terminal.y + scene.terminal.height,
				zoom: 70
			}
		},
		{
			id: 'tower',
			label: 'Tower flyby',
			target: { x: scene.tower.x, y: scene.tower.y, zoom: 45 }
		}
	];

	let camera = $state<CameraState>({ ...wideCamera });
	let activeStopId = $state('wide');
	let cancelActive = $state<(() => void) | null>(null);
	const FLIGHT_DURATION_MS = 1200;

	function flyTo(stop: FlyStop) {
		if (cancelActive) cancelActive();
		activeStopId = stop.id;
		const to = targetToCamera(stop.target);
		cancelActive = animateCamera(
			{ ...camera },
			to,
			FLIGHT_DURATION_MS,
			(state) => (camera = state),
			() => (cancelActive = null),
			easeInOutCubic
		);
	}

	const viewBox = $derived(`${camera.x} ${camera.y} ${camera.w} ${camera.h}`);
</script>

<svelte:head>
	<title>Airport Fly-Through</title>
</svelte:head>

<main>
	<header>
		<p class="eyebrow">Local scene &middot; layered architecture demo</p>
		<h1>Airport Fly-Through</h1>
		<p class="sub">
			Geo facts feed a one-time projection into local world coordinates. Everything you see and
			every camera move below runs entirely in that local space.
		</p>
	</header>

	<div class="stage">
		<svg {viewBox} preserveAspectRatio="xMidYMid meet" role="img" aria-label="Airport scene">
			<rect x="0" y="0" width={WORLD_BOUNDS.width} height={WORLD_BOUNDS.height} class="backdrop" />

			<!-- gridlines: world coordinate reference -->
			<g class="grid">
				{#each grid.vertical as line}
					<line x1={line.pos} y1="0" x2={line.pos} y2={WORLD_BOUNDS.height} />
					<text x={line.pos + 2} y={WORLD_BOUNDS.height - 4}>{line.label}</text>
				{/each}
				{#each grid.horizontal as line}
					<line x1="0" y1={line.pos} x2={WORLD_BOUNDS.width} y2={line.pos} />
					<text x="2" y={line.pos - 2}>{line.label}</text>
				{/each}
			</g>

			<!-- apron -->
			<rect
				class="apron"
				x={scene.apron.x}
				y={scene.apron.y}
				width={scene.apron.width}
				height={scene.apron.height}
			/>

			<!-- runway -->
			<g class="runway">
				<line
					x1={scene.runway.x1}
					y1={scene.runway.y1}
					x2={scene.runway.x2}
					y2={scene.runway.y2}
					stroke-width={scene.runway.width}
				/>
				<line
					class="centerline"
					x1={scene.runway.x1}
					y1={scene.runway.y1}
					x2={scene.runway.x2}
					y2={scene.runway.y2}
				/>
				<text x={scene.runway.x1 + 4} y={scene.runway.y1 - 4}>{scene.runway.label}</text>
			</g>

			<!-- hangars -->
			<g class="hangars">
				{#each scene.hangars as hangar}
					<rect x={hangar.x} y={hangar.y} width={hangar.width} height={hangar.height} />
					<text x={hangar.x} y={hangar.y - 2}>{hangar.label}</text>
				{/each}
			</g>

			<!-- terminal -->
			<g class="terminal">
				<rect
					x={scene.terminal.x}
					y={scene.terminal.y}
					width={scene.terminal.width}
					height={scene.terminal.height}
				/>
				<text x={scene.terminal.x + 3} y={scene.terminal.y + 12}>{scene.terminal.label}</text>
			</g>

			<!-- tower -->
			<g class="tower">
				<circle cx={scene.tower.x} cy={scene.tower.y} r="4" />
				<text x={scene.tower.x + 6} y={scene.tower.y + 3}>{scene.tower.label}</text>
			</g>

			<!-- camera crosshair: shows current frame center -->
			<g
				class="crosshair"
				transform={`translate(${camera.x + camera.w / 2} ${camera.y + camera.h / 2})`}
			>
				<line x1="-5" y1="0" x2="5" y2="0" />
				<line x1="0" y1="-5" x2="0" y2="5" />
			</g>
		</svg>

		<aside class="hud">
			<div class="hud-readout">
				<span class="hud-label">flight data</span>
				<dl>
					<dt>x</dt>
					<dd>{camera.x.toFixed(1)}</dd>
					<dt>y</dt>
					<dd>{camera.y.toFixed(1)}</dd>
					<dt>zoom</dt>
					<dd>{camera.h.toFixed(1)}</dd>
				</dl>
			</div>

			<div class="controls">
				<span class="hud-label">fly to</span>
				{#each flyStops as stop}
					<button class:active={activeStopId === stop.id} onclick={() => flyTo(stop)}>
						{stop.label}
					</button>
				{/each}
			</div>
		</aside>
	</div>
</main>

<style>
	main {
		max-width: 960px;
		margin: 0 auto;
		padding: 48px 24px 64px;
		color: #d7e4f0;
		font-family: ui-monospace, 'JetBrains Mono', 'SFMono-Regular', Menlo, monospace;
	}

	header {
		margin-bottom: 32px;
	}

	.eyebrow {
		margin: 0 0 10px;
		font-size: 11px;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: #4fe0c1;
	}

	h1 {
		margin: 0 0 12px;
		font-family:
			system-ui,
			-apple-system,
			'Segoe UI',
			sans-serif;
		font-weight: 700;
		letter-spacing: -0.01em;
		font-size: clamp(28px, 4vw, 40px);
		color: #f2f6fb;
	}

	.sub {
		margin: 0;
		max-width: 60ch;
		font-size: 14px;
		line-height: 1.6;
		color: #8ba3bf;
	}

	.stage {
		display: grid;
		grid-template-columns: 1fr;
		gap: 16px;
		background: #0d1626;
		border: 1px solid #17304a;
		border-radius: 10px;
		padding: 16px;
	}

	@media (min-width: 760px) {
		.stage {
			grid-template-columns: 3fr 1fr;
		}
	}

	svg {
		width: 100%;
		height: auto;
		aspect-ratio: 3 / 2;
		display: block;
		background: #060b14;
		border-radius: 6px;
	}

	.backdrop {
		fill: #060b14;
	}

	.grid line {
		stroke: #12253a;
		stroke-width: 0.5;
	}

	.grid text {
		fill: #2f5678;
		font-size: 6px;
	}

	.apron {
		fill: #16283f;
	}

	.runway line {
		stroke: #e8e3d3;
		stroke-linecap: round;
	}

	.runway .centerline {
		stroke: #f2a33d;
		stroke-width: 1;
		stroke-dasharray: 4 3;
	}

	.runway text {
		fill: #f2a33d;
		font-size: 7px;
		letter-spacing: 0.04em;
	}

	.terminal rect {
		fill: #274a72;
		stroke: #6fa8dc;
		stroke-width: 1;
	}

	.terminal text {
		fill: #d7e4f0;
		font-size: 6px;
	}

	.hangars rect {
		fill: #2c3f57;
		stroke: #7fa8c9;
		stroke-width: 0.7;
	}

	.hangars text {
		fill: #7fa8c9;
		font-size: 5.5px;
	}

	.tower circle {
		fill: #4fe0c1;
	}

	.tower text {
		fill: #4fe0c1;
		font-size: 6px;
	}

	.crosshair line {
		stroke: #4fe0c1;
		stroke-width: 0.6;
		opacity: 0.85;
	}

	.hud {
		display: flex;
		flex-direction: column;
		gap: 20px;
	}

	.hud-label {
		display: block;
		font-size: 10px;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: #4fe0c1;
		margin-bottom: 8px;
	}

	.hud-readout dl {
		display: grid;
		grid-template-columns: auto 1fr;
		gap: 4px 12px;
		margin: 0;
		font-size: 13px;
	}

	.hud-readout dt {
		color: #5a7a99;
	}

	.hud-readout dd {
		margin: 0;
		color: #f2f6fb;
		text-align: right;
	}

	.controls {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.controls button {
		font-family: inherit;
		font-size: 12.5px;
		text-align: left;
		color: #d7e4f0;
		background: #101d2f;
		border: 1px solid #1c3550;
		border-radius: 5px;
		padding: 9px 12px;
		cursor: pointer;
		transition:
			border-color 120ms ease,
			color 120ms ease;
	}

	.controls button:hover {
		border-color: #4fe0c1;
		color: #4fe0c1;
	}

	.controls button:focus-visible {
		outline: 2px solid #4fe0c1;
		outline-offset: 2px;
	}

	.controls button.active {
		border-color: #4fe0c1;
		color: #4fe0c1;
		background: #0f2b26;
	}

	@media (prefers-reduced-motion: reduce) {
		.controls button {
			transition: none;
		}
	}
</style>
