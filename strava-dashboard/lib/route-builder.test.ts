import { describe, it, expect } from "vitest";
import { haversineMeters, routeDistanceMeters, type LatLng } from "./polyline";
import {
  emptyRoute,
  fromPath,
  appendNode,
  insertNodeBeforeId,
  moveNodeId,
  deleteNodeId,
  breakOut,
  expandPath,
  totalDistanceMeters,
  sealLoop,
  connectOutAndBack,
  connectBalloon,
} from "./route-builder";

const A: LatLng = [59.33, 18.06];
const B: LatLng = [59.34, 18.07];
const C: LatLng = [59.35, 18.06];

describe("draw model", () => {
  it("appends free nodes with straight legs", () => {
    let m = emptyRoute();
    m = appendNode(m, A);
    m = appendNode(m, B);
    m = appendNode(m, C);
    expect(m.nodes).toHaveLength(3);
    expect(m.legs).toHaveLength(2);
    expect(m.legs.every((l) => l.kind === "straight")).toBe(true);
    expect(expandPath(m)).toEqual([A, B, C]);
    expect(totalDistanceMeters(m)).toBeCloseTo(haversineMeters(A, B) + haversineMeters(B, C), 6);
  });

  it("moves a free node and recomputes distance", () => {
    let m = appendNode(appendNode(emptyRoute(), A), B);
    const movedTo: LatLng = [59.345, 18.075];
    m = moveNodeId(m, m.nodes[1].id, movedTo);
    expect(m.nodes[1].latlng).toEqual(movedTo);
    expect(totalDistanceMeters(m)).toBeCloseTo(haversineMeters(A, movedTo), 6);
  });

  it("deletes a middle node, merging legs", () => {
    let m = appendNode(appendNode(appendNode(emptyRoute(), A), B), C);
    m = deleteNodeId(m, m.nodes[1].id);
    expect(m.nodes).toHaveLength(2);
    expect(m.legs).toHaveLength(1);
    expect(expandPath(m)).toEqual([A, C]);
  });
});

describe("fromPath", () => {
  it("preserves the dense geometry and true distance", () => {
    const dense: LatLng[] = [A, [59.335, 18.065], B, [59.345, 18.065], C];
    const m = fromPath(dense);
    expect(m.nodes).toHaveLength(2);
    expect(m.legs).toHaveLength(1);
    expect(m.nodes.every((n) => n.locked)).toBe(true);
    expect(expandPath(m)).toEqual(dense);
    expect(totalDistanceMeters(m)).toBeCloseTo(routeDistanceMeters(dense), 6);
  });
});

describe("breakOut", () => {
  it("splits a path leg and lets a detour be drawn in, preserving the rest", () => {
    const dense: LatLng[] = [
      [59.330, 18.060],
      [59.332, 18.060],
      [59.334, 18.060], // split here (index 2)
      [59.336, 18.060],
      [59.338, 18.060],
    ];
    const base = fromPath(dense);
    const baseDist = totalDistanceMeters(base);

    const res = breakOut(base, 0, 2);
    expect(res).not.toBeNull();
    let m = res!.model;
    // path(A..split) + straight(zero) + path(split..B)
    expect(m.legs.map((l) => l.kind)).toEqual(["path", "straight", "path"]);
    // zero-length detour container means distance is unchanged right after the split
    expect(totalDistanceMeters(m)).toBeCloseTo(baseDist, 6);

    // Draw a detour: two free nodes that loop east and back
    const d1: LatLng = [59.334, 18.070];
    const d2: LatLng = [59.334, 18.065];
    m = insertNodeBeforeId(m, res!.detourAnchorId, d1);
    m = insertNodeBeforeId(m, res!.detourAnchorId, d2);

    // Detour adds distance; total must exceed the original base route
    expect(totalDistanceMeters(m)).toBeGreaterThan(baseDist);

    // The rest of the original route is still present at the end
    const expanded = expandPath(m);
    expect(expanded[expanded.length - 1]).toEqual([59.338, 18.060]);
    expect(expanded).toContainEqual(d1);
    expect(expanded).toContainEqual(d2);
  });

  it("rejects splitting at an endpoint", () => {
    const base = fromPath([A, B, C]);
    expect(breakOut(base, 0, 0)).toBeNull();
    expect(breakOut(base, 0, 2)).toBeNull();
  });
});

describe("connectOutAndBack", () => {
  it("retraces the whole path back to start", () => {
    let m = appendNode(appendNode(appendNode(emptyRoute(), A), B), C);
    const oneWay = totalDistanceMeters(m);
    m = connectOutAndBack(m);
    expect(expandPath(m)).toEqual([A, B, C, B, A]);
    expect(m.nodes[m.nodes.length - 1].latlng).toEqual(A); // ends at start
    expect(totalDistanceMeters(m)).toBeCloseTo(oneWay * 2, 6);
  });

  it("does nothing for fewer than two nodes", () => {
    const m = appendNode(emptyRoute(), A);
    expect(connectOutAndBack(m)).toBe(m);
  });
});

describe("sealLoop", () => {
  it("closes the end back to the start node (rundtur)", () => {
    let m = appendNode(appendNode(appendNode(emptyRoute(), A), B), C);
    m = sealLoop(m, 0);
    expect(expandPath(m)).toEqual([A, B, C, A]);
  });

  it("rejects sealing onto the end node itself", () => {
    const m = appendNode(appendNode(emptyRoute(), A), B);
    expect(sealLoop(m, 1)).toBe(m);
  });
});

describe("connectBalloon", () => {
  it("builds out -> loop -> back-down-the-stem", () => {
    // A=start, B=junction (index 1), C,D = loop drawn out from B
    let m = appendNode(emptyRoute(), A);
    m = appendNode(m, B); // junction
    m = appendNode(m, C);
    m = appendNode(m, [59.36, 18.07]); // D
    const loopAndStemOut = totalDistanceMeters(m);

    m = connectBalloon(m, 1);
    const path = expandPath(m);
    // out along stem (A->B), around loop (B->C->D->B), back down stem (B->A)
    expect(path[0]).toEqual(A);
    expect(path[path.length - 1]).toEqual(A); // ends at start
    expect(path).toContainEqual(B);
    // distance grows by sealing the loop (D->B) plus retracing the stem (B->A)
    expect(totalDistanceMeters(m)).toBeGreaterThan(loopAndStemOut);
  });

  it("with junction at start is just a sealed loop", () => {
    let m = appendNode(appendNode(appendNode(emptyRoute(), A), B), C);
    m = connectBalloon(m, 0);
    expect(expandPath(m)).toEqual([A, B, C, A]);
  });
});
