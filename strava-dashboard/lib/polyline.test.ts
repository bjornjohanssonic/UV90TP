import { describe, it, expect } from "vitest";
import {
  decodePolyline,
  encodePolyline,
  haversineMeters,
  routeDistanceMeters,
  type LatLng,
} from "./polyline";

describe("decodePolyline", () => {
  it("decodes the canonical Google example", () => {
    // From Google's Encoded Polyline Algorithm Format docs.
    const points = decodePolyline("_p~iF~ps|U_ulLnnqC_mqNvxq`@");
    expect(points).toHaveLength(3);
    expect(points[0][0]).toBeCloseTo(38.5, 5);
    expect(points[0][1]).toBeCloseTo(-120.2, 5);
    expect(points[1][0]).toBeCloseTo(40.7, 5);
    expect(points[1][1]).toBeCloseTo(-120.95, 5);
    expect(points[2][0]).toBeCloseTo(43.252, 5);
    expect(points[2][1]).toBeCloseTo(-126.453, 5);
  });
});

describe("encodePolyline", () => {
  it("produces the canonical Google example", () => {
    const points: LatLng[] = [
      [38.5, -120.2],
      [40.7, -120.95],
      [43.252, -126.453],
    ];
    expect(encodePolyline(points)).toBe("_p~iF~ps|U_ulLnnqC_mqNvxq`@");
  });

  it("round-trips with decode at 1e5 precision", () => {
    const points: LatLng[] = [
      [59.3293, 18.0686],
      [59.334, 18.0701],
      [59.3301, 18.0599],
    ];
    const decoded = decodePolyline(encodePolyline(points));
    expect(decoded).toHaveLength(points.length);
    decoded.forEach((p, i) => {
      expect(p[0]).toBeCloseTo(points[i][0], 5);
      expect(p[1]).toBeCloseTo(points[i][1], 5);
    });
  });

  it("encodes empty input as empty string", () => {
    expect(encodePolyline([])).toBe("");
  });
});

describe("haversineMeters", () => {
  it("returns 0 for identical points", () => {
    expect(haversineMeters([59.3293, 18.0686], [59.3293, 18.0686])).toBe(0);
  });

  it("matches a known short distance", () => {
    // ~1 degree of latitude ≈ 111.19 km near the equator.
    const d = haversineMeters([0, 0], [1, 0]);
    expect(d).toBeGreaterThan(111000);
    expect(d).toBeLessThan(111400);
  });
});

describe("routeDistanceMeters", () => {
  it("is 0 for fewer than two points", () => {
    expect(routeDistanceMeters([])).toBe(0);
    expect(routeDistanceMeters([[59.3293, 18.0686]])).toBe(0);
  });

  it("sums consecutive segments", () => {
    const points: LatLng[] = [
      [0, 0],
      [0, 1],
      [0, 2],
    ];
    const total = routeDistanceMeters(points);
    const segA = haversineMeters(points[0], points[1]);
    const segB = haversineMeters(points[1], points[2]);
    expect(total).toBeCloseTo(segA + segB, 6);
  });
});
