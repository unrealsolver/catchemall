import { Vector } from "matter";

// Possible polygon improvements:
//     Jitter constraints
//     Convexity constraints
//     Area normalization (equal mass?)
//     Procedural symmetry
//     Toys categories (spiky/fluffy/long/short/chunky etc)
export function createIrregularPolygon(
  sides: number,
  baseRadius: number, // note: both base and jitter affecting SIZE
  jitter: number
): Vector[] {
  const vertices = [];
  const step = (Math.PI * 2) / sides;

  for (let i = 0; i < sides; i++) {
    const angle = i * step;
    const radius = baseRadius + (Math.random() - 0.5) * jitter;

    vertices.push({
      x: Math.cos(angle) * radius,
      y: Math.sin(angle) * radius,
    });
  }

  return vertices;
}
