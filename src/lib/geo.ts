// ---------------------------------------------------------------------------
// GEO LAYER
//
// This file is the ONLY place in the app that talks about the real world.
// It holds real-world reference points for the airport as plain lat/lon
// metadata — nothing here knows about pixels, SVG, or the camera.
//
// If you ever want to add a real map, satellite overlay, or GPS feed, this
// is the layer you extend. Nothing else in the app should import lat/lon
// values directly — everyone else works in local world coordinates
// (see world.ts).
// ---------------------------------------------------------------------------

import { browser } from '$app/env';
import osmChanges from '$lib/data/changes.osc?raw';

export type GeoKind = 'tower' | 'terminal' | 'runwayEnd' | 'landmark';

export interface GeoPoint {
	id: string;
	label: string;
	kind: GeoKind;
	lat: number;
	lon: number;
}

export const airportGeo: GeoPoint[] = [
	{
		id: 'tower',
		label: 'Control Tower',
		kind: 'tower',
		lat: 47.4502,
		lon: -122.3088
	},
	{
		id: 'terminal',
		label: 'Main Terminal',
		kind: 'terminal',
		lat: 47.4488,
		lon: -122.3098
	},
	{
		id: 'rwy16',
		label: 'Runway 16 Threshold',
		kind: 'runwayEnd',
		lat: 47.4602,
		lon: -122.3108
	},
	{
		id: 'rwy34',
		label: 'Runway 34 Threshold',
		kind: 'runwayEnd',
		lat: 47.4392,
		lon: -122.3068
	},
	{
		id: 'hangarA',
		label: 'Hangar A',
		kind: 'landmark',
		lat: 47.4472,
		lon: -122.312
	},
	{
		id: 'hangarB',
		label: 'Hangar B',
		kind: 'landmark',
		lat: 47.4462,
		lon: -122.3126
	}
];

if (browser) {
	const parser = new DOMParser();
	const doc = parser.parseFromString(osmChanges, 'application/xml');
	const lmnt = doc.documentElement;
	const create_nodes = lmnt.querySelectorAll('osmChange create node');
	// const t: Vector[] = [];
	// const fdf = Array.from(create_nodes).map(n=> Vector.create(n.getatt))
	for (const node of create_nodes) {
		const lat = parseFloat(node.getAttribute('lat') ?? '0');
		const lon = parseFloat(node.getAttribute('lon') ?? '0');
		const fd: GeoPoint = {
			id: '',
			label: '',
			kind: 'tower',
			lat,
			lon
		};
		console.log(JSON.stringify({ fd, lat, lon }));

		// const v = Vector.create(lon - 20, lat - 20);
		// t.push(v);
	}
}

export const porterGeo: GeoPoint[] = [
	{
		id: 'tower',
		label: 'Control Tower',
		kind: 'tower',
		lat: 47.4502,
		lon: -122.3088
	},
	{
		id: 'terminal',
		label: 'Main Terminal',
		kind: 'terminal',
		lat: 47.4488,
		lon: -122.3098
	},
	{
		id: 'rwy16',
		label: 'Runway 16 Threshold',
		kind: 'runwayEnd',
		lat: 47.4602,
		lon: -122.3108
	},
	{
		id: 'rwy34',
		label: 'Runway 34 Threshold',
		kind: 'runwayEnd',
		lat: 47.4392,
		lon: -122.3068
	},
	{
		id: 'hangarA',
		label: 'Hangar A',
		kind: 'landmark',
		lat: 47.4472,
		lon: -122.312
	},
	{
		id: 'hangarB',
		label: 'Hangar B',
		kind: 'landmark',
		lat: 47.4462,
		lon: -122.3126
	}
];
