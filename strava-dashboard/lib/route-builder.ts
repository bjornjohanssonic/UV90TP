// Pure, client-side route model used by the /rutter draw editor.
//
// A route is an ordered list of nodes connected by legs (legs[i] joins nodes[i] -> nodes[i+1]).
// - A "straight" leg is a single straight line between its two nodes (the simplified draw model).
// - A "path" leg carries a dense polyline (e.g. a slice of a real activity route) so the original
//   geometry — and its true distance — is preserved when you start from an existing run or break out.
//
// Invariant: path legs only ever connect locked nodes; free (user-placed) nodes only border
// straight legs. This keeps move/delete simple — they only touch straight legs.

import { haversineMeters, routeDistanceMeters, type LatLng } from "./polyline";

export type Leg = { kind: "straight" } | { kind: "path"; points: LatLng[] };

export interface RouteNode {
  id: string;
  latlng: LatLng;
  locked: boolean;
}

export interface RouteModel {
  nodes: RouteNode[];
  legs: Leg[];
}

function makeId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `n_${Math.random().toString(36).slice(2)}_${Date.now()}`;
}

export function emptyRoute(): RouteModel {
  return { nodes: [], legs: [] };
}

/** Build a route from a dense activity polyline as one locked path leg. */
export function fromPath(points: LatLng[]): RouteModel {
  if (points.length === 0) return emptyRoute();
  if (points.length === 1) {
    return { nodes: [{ id: makeId(), latlng: points[0], locked: true }], legs: [] };
  }
  return {
    nodes: [
      { id: makeId(), latlng: points[0], locked: true },
      { id: makeId(), latlng: points[points.length - 1], locked: true },
    ],
    legs: [{ kind: "path", points }],
  };
}

/** Append a free node at the end with a straight leg connecting to the previous node. */
export function appendNode(model: RouteModel, latlng: LatLng): RouteModel {
  const node: RouteNode = { id: makeId(), latlng, locked: false };
  if (model.nodes.length === 0) {
    return { nodes: [node], legs: [] };
  }
  return {
    nodes: [...model.nodes, node],
    legs: [...model.legs, { kind: "straight" }],
  };
}

function indexOfNode(model: RouteModel, nodeId: string): number {
  return model.nodes.findIndex((n) => n.id === nodeId);
}

/**
 * Insert a free node immediately before the given node, splitting the leg that precedes it.
 * The preceding leg must be straight (used for detour drawing and adding midpoints).
 */
export function insertNodeBeforeId(model: RouteModel, beforeNodeId: string, latlng: LatLng): RouteModel {
  const idx = indexOfNode(model, beforeNodeId);
  if (idx <= 0) return model; // can't insert before the first node
  const legIdx = idx - 1;
  if (model.legs[legIdx]?.kind !== "straight") return model;

  const node: RouteNode = { id: makeId(), latlng, locked: false };
  const nodes = [...model.nodes.slice(0, idx), node, ...model.nodes.slice(idx)];
  const legs = [
    ...model.legs.slice(0, legIdx),
    { kind: "straight" as const },
    { kind: "straight" as const },
    ...model.legs.slice(legIdx + 1),
  ];
  return { nodes, legs };
}

/** Move a free node. Locked nodes (anchored to a path) cannot be moved. */
export function moveNodeId(model: RouteModel, nodeId: string, latlng: LatLng): RouteModel {
  const idx = indexOfNode(model, nodeId);
  if (idx < 0 || model.nodes[idx].locked) return model;
  const nodes = model.nodes.map((n, i) => (i === idx ? { ...n, latlng } : n));
  return { nodes, legs: model.legs };
}

/** Delete a free node, merging its two adjacent straight legs into one. */
export function deleteNodeId(model: RouteModel, nodeId: string): RouteModel {
  const idx = indexOfNode(model, nodeId);
  if (idx < 0 || model.nodes[idx].locked) return model;

  const nodes = [...model.nodes.slice(0, idx), ...model.nodes.slice(idx + 1)];
  let legs: Leg[];
  if (idx === 0) {
    legs = model.legs.slice(1);
  } else if (idx === model.nodes.length - 1) {
    legs = model.legs.slice(0, -1);
  } else {
    // remove the two legs around the node, replace with a single straight leg
    legs = [...model.legs.slice(0, idx - 1), { kind: "straight" }, ...model.legs.slice(idx + 1)];
  }
  return { nodes, legs };
}

/**
 * Break out of a path leg at one of its vertices. Splits the path into two path legs and inserts
 * a zero-length straight "detour container" between them. Returns the id of the node the detour
 * should be drawn into (insert detour nodes before it via insertNodeBeforeId).
 */
export function breakOut(
  model: RouteModel,
  legIndex: number,
  splitVertexIndex: number,
): { model: RouteModel; detourAnchorId: string } | null {
  const leg = model.legs[legIndex];
  if (!leg || leg.kind !== "path") return null;
  const pts = leg.points;
  if (splitVertexIndex <= 0 || splitVertexIndex >= pts.length - 1) return null;

  const splitLatLng = pts[splitVertexIndex];
  const pointsA = pts.slice(0, splitVertexIndex + 1);
  const pointsB = pts.slice(splitVertexIndex);

  const pa: RouteNode = { id: makeId(), latlng: splitLatLng, locked: true };
  const pb: RouteNode = { id: makeId(), latlng: splitLatLng, locked: true };

  const nodes = [
    ...model.nodes.slice(0, legIndex + 1),
    pa,
    pb,
    ...model.nodes.slice(legIndex + 1),
  ];
  const legs = [
    ...model.legs.slice(0, legIndex),
    { kind: "path" as const, points: pointsA },
    { kind: "straight" as const },
    { kind: "path" as const, points: pointsB },
    ...model.legs.slice(legIndex + 1),
  ];
  return { model: { nodes, legs }, detourAnchorId: pb.id };
}

function reverseLeg(leg: Leg): Leg {
  return leg.kind === "path" ? { kind: "path", points: [...leg.points].reverse() } : { kind: "straight" };
}

/**
 * Append, after the current end, a mirrored copy of nodes[fromIdx..0] (and their legs reversed),
 * so the route retraces its way back. Appended nodes are locked (auto-generated return path).
 */
function appendReversedThrough(model: RouteModel, fromIdx: number): RouteModel {
  const nodes = [...model.nodes];
  const legs = [...model.legs];
  for (let i = fromIdx; i >= 0; i--) {
    nodes.push({ id: makeId(), latlng: model.nodes[i].latlng, locked: true });
    legs.push(reverseLeg(model.legs[i]));
  }
  return { nodes, legs };
}

/** Seal a loop: connect the current end back to an earlier node with a straight leg. */
export function sealLoop(model: RouteModel, junctionIndex: number): RouteModel {
  if (model.nodes.length < 2 || junctionIndex < 0 || junctionIndex >= model.nodes.length - 1) {
    return model;
  }
  const j = model.nodes[junctionIndex];
  return {
    nodes: [...model.nodes, { id: makeId(), latlng: j.latlng, locked: true }],
    legs: [...model.legs, { kind: "straight" }],
  };
}

/** Out-and-back: mirror the entire drawn path back to the start so you end where you began. */
export function connectOutAndBack(model: RouteModel): RouteModel {
  if (model.nodes.length < 2) return model;
  return appendReversedThrough(model, model.nodes.length - 2);
}

/**
 * Balloon (lollipop): seal the loop at the junction, then retrace the stem (junction -> start)
 * so the route runs out along the stem, around the loop, and back down the same stem.
 */
export function connectBalloon(model: RouteModel, junctionIndex: number): RouteModel {
  const sealed = sealLoop(model, junctionIndex);
  if (sealed === model) return model;
  return appendReversedThrough(sealed, junctionIndex - 1);
}

/** Expand the model into a single dense polyline for rendering and saving. */
export function expandPath(model: RouteModel): LatLng[] {
  if (model.nodes.length === 0) return [];
  const out: LatLng[] = [model.nodes[0].latlng];
  for (let i = 0; i < model.legs.length; i++) {
    const leg = model.legs[i];
    if (leg.kind === "straight") {
      out.push(model.nodes[i + 1].latlng);
    } else {
      for (let j = 1; j < leg.points.length; j++) out.push(leg.points[j]);
    }
  }
  return out;
}

export function totalDistanceMeters(model: RouteModel): number {
  let total = 0;
  for (let i = 0; i < model.legs.length; i++) {
    const leg = model.legs[i];
    if (leg.kind === "straight") {
      total += haversineMeters(model.nodes[i].latlng, model.nodes[i + 1].latlng);
    } else {
      total += routeDistanceMeters(leg.points);
    }
  }
  return total;
}

/** Index of the nearest vertex on a dense polyline to a clicked point. */
export function nearestVertexIndex(points: LatLng[], target: LatLng): number {
  let best = -1;
  let bestD = Infinity;
  for (let i = 0; i < points.length; i++) {
    const d = haversineMeters(points[i], target);
    if (d < bestD) {
      bestD = d;
      best = i;
    }
  }
  return best;
}

/** Find which leg (and, for path legs, vertex) is closest to a clicked point. */
export function nearestLeg(
  model: RouteModel,
  target: LatLng,
): { legIndex: number; vertexIndex: number; distanceM: number } | null {
  let best: { legIndex: number; vertexIndex: number; distanceM: number } | null = null;
  for (let i = 0; i < model.legs.length; i++) {
    const leg = model.legs[i];
    const pts = leg.kind === "path" ? leg.points : [model.nodes[i].latlng, model.nodes[i + 1].latlng];
    const vi = nearestVertexIndex(pts, target);
    const d = haversineMeters(pts[vi], target);
    if (!best || d < best.distanceM) {
      best = { legIndex: i, vertexIndex: vi, distanceM: d };
    }
  }
  return best;
}
