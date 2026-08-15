// ---------------------------------------------------------------------------
// WORLD LAYER
//
// Converts geo reference points (lat/lon) into a local x/y coordinate
// system once, at load time. Everything downstream of buildWorld() —
// the scene geometry, gridlines, and the camera — only ever deals with
// plain local numbers. Nothing past this file needs to know a lat/lon
// value exists.
//
// The local coordinate system is a fixed-size canvas (WORLD_BOUNDS) with
// (0,0) at the top-left and y increasing downward, matching SVG's
// viewBox convention. Geo points are scaled and centered to fit inside it.
// ---------------------------------------------------------------------------

import type { GeoPoint } from './geo';

export interface WorldPoint {
	id: string;
	label: string;
	x: number;
	y: number;
}

export interface WorldBounds {
	width: number;
	height: number;
}

export interface BuiltWorld {
	points: WorldPoint[];
	bounds: WorldBounds;
}

/** Fixed size of the local coordinate system, in world units. */
export const WORLD_BOUNDS: WorldBounds = { width: 480, height: 320 };

const PADDING = 40; // world units of breathing room around the projected airport
const METERS_PER_DEGREE_LAT = 111_320;
const DEG2RAD = Math.PI / 180;

/**
 * Projects geo points into the fixed local world coordinate system.
 * Uses a simple equirectangular projection (accurate enough at airport
 * scale) then fits + centers the result inside WORLD_BOUNDS.
 */
export function buildWorld(geoPoints: GeoPoint[]): BuiltWorld {
	const lats = geoPoints.map((p) => p.lat);
	const lons = geoPoints.map((p) => p.lon);
	const minLat = Math.min(...lats);
	const minLon = Math.min(...lons);
	const centroidLat = lats.reduce((a, b) => a + b, 0) / lats.length;
	const metersPerDegreeLon = METERS_PER_DEGREE_LAT * Math.cos(centroidLat * DEG2RAD);

	// Project to meters relative to the bounding box's SW corner.
	const meters = geoPoints.map((p) => ({
		mx: (p.lon - minLon) * metersPerDegreeLon,
		my: (p.lat - minLat) * METERS_PER_DEGREE_LAT
	}));

	const geoWidthM = Math.max(...meters.map((m) => m.mx), 1);
	const geoHeightM = Math.max(...meters.map((m) => m.my), 1);

	const usableW = WORLD_BOUNDS.width - PADDING * 2;
	const usableH = WORLD_BOUNDS.height - PADDING * 2;
	const scale = Math.min(usableW / geoWidthM, usableH / geoHeightM);

	const offsetX = PADDING + (usableW - geoWidthM * scale) / 2;
	const offsetY = PADDING + (usableH - geoHeightM * scale) / 2;

	const points: WorldPoint[] = geoPoints.map((p, i) => ({
		id: p.id,
		label: p.label,
		x: offsetX + meters[i].mx * scale,
		// flip: north (larger lat / larger my) should be nearer the top of the scene
		y: WORLD_BOUNDS.height - offsetY - meters[i].my * scale
	}));

	return { points, bounds: WORLD_BOUNDS };
}

// ---------------------------------------------------------------------------
// SCENE GEOMETRY
//
// The airport drawing itself lives entirely in local space. Real-world
// anchor points (tower, terminal, runway ends...) tell us *where* to place
// things, but sizes, widths, and shapes below are authored directly as
// local-space constants — there is no per-building class hierarchy, just
// plain geometry describing what to draw.
// ---------------------------------------------------------------------------

export interface RunwayGeometry {
	x1: number;
	y1: number;
	x2: number;
	y2: number;
	width: number;
	label: string;
}

export interface RectGeometry {
	id: string;
	label: string;
	x: number;
	y: number;
	width: number;
	height: number;
}

export interface Scene {
	runway: RunwayGeometry;
	terminal: RectGeometry;
	apron: RectGeometry;
	hangars: RectGeometry[];
	tower: { x: number; y: number; label: string };
}

function findPoint(points: WorldPoint[], id: string): WorldPoint {
	const found = points.find((p) => p.id === id);
	if (!found) throw new Error(`world point "${id}" not found — check geo.ts`);
	return found;
}

/** Builds the drawable airport scene from projected world points. */
export function buildScene(points: WorldPoint[]): Scene {
	const rwy16 = findPoint(points, 'rwy16');
	const rwy34 = findPoint(points, 'rwy34');
	const terminalPt = findPoint(points, 'terminal');
	const towerPt = findPoint(points, 'tower');
	const hangarA = findPoint(points, 'hangarA');
	const hangarB = findPoint(points, 'hangarB');

	const TERMINAL_W = 56;
	const TERMINAL_H = 22;
	const APRON_W = 70;
	const APRON_H = 16;
	const HANGAR_W = 16;
	const HANGAR_H = 12;

	return {
		runway: {
			x1: rwy16.x,
			y1: rwy16.y,
			x2: rwy34.x,
			y2: rwy34.y,
			width: 10,
			label: 'RWY 16/34'
		},
		terminal: {
			id: 'terminal',
			label: terminalPt.label,
			x: terminalPt.x - TERMINAL_W / 2,
			y: terminalPt.y - TERMINAL_H / 2,
			width: TERMINAL_W,
			height: TERMINAL_H
		},
		apron: {
			id: 'apron',
			label: 'Apron',
			x: terminalPt.x - APRON_W / 2,
			y: terminalPt.y + TERMINAL_H / 2,
			width: APRON_W,
			height: APRON_H
		},
		hangars: [
			{
				id: hangarA.id,
				label: hangarA.label,
				x: hangarA.x - HANGAR_W / 2,
				y: hangarA.y - HANGAR_H / 2,
				width: HANGAR_W,
				height: HANGAR_H
			},
			{
				id: hangarB.id,
				label: hangarB.label,
				x: hangarB.x - HANGAR_W / 2,
				y: hangarB.y - HANGAR_H / 2,
				width: HANGAR_W,
				height: HANGAR_H
			}
		],
		tower: { x: towerPt.x, y: towerPt.y, label: towerPt.label }
	};
}

// ---------------------------------------------------------------------------
// GRIDLINES
// ---------------------------------------------------------------------------

export interface GridLine {
	pos: number;
	label: string;
}

export interface Grid {
	vertical: GridLine[];
	horizontal: GridLine[];
}

/** Generates evenly spaced, labeled gridlines across the world bounds. */
export function makeGridLines(bounds: WorldBounds, spacing = 40): Grid {
	const vertical: GridLine[] = [];
	for (let x = 0; x <= bounds.width; x += spacing) {
		vertical.push({ pos: x, label: String(x) });
	}
	const horizontal: GridLine[] = [];
	for (let y = 0; y <= bounds.height; y += spacing) {
		horizontal.push({ pos: y, label: String(y) });
	}
	return { vertical, horizontal };
}
