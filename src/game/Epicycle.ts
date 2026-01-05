import { Vector } from "matter-js";

type Stick = {
  amp: number; // length of stick (bigger -> smaller)
  omega: number; // angular speed (rad/s)
  phase: number; // phase offset (rad)
};

export class Epicycle {
  private t = 0; // seconds
  private sticks: Stick[];
  public x: number;
  public y: number;

  constructor(opts?: {
    baseAmp?: number; // overall magnitude
    baseOmega?: number; // overall speed
    seed?: number; // for phases
  }) {
    const baseAmp = opts?.baseAmp ?? 1.0;
    const baseOmega = opts?.baseOmega ?? 1.0;

    // deterministic-ish phases without a full RNG:
    const seed = opts?.seed ?? 12345;
    const phase1 = (seed * 0.001) % (2 * Math.PI);
    const phase2 = (seed * 0.0023) % (2 * Math.PI);
    const phase3 = (seed * 0.0041) % (2 * Math.PI);

    // Amplitudes: biggest -> smallest
    const A1 = baseAmp * 1.0;
    const A2 = baseAmp * 0.77;
    const A3 = baseAmp * 0.53;

    // Angular speeds: incommensurate (scaled irrationals)
    // You can tweak multipliers to taste.
    const w1 = baseOmega * 1.0;
    const w2 = baseOmega * Math.SQRT2;
    const w3 = baseOmega * Math.PI;

    this.sticks = [
      { amp: A1, omega: w1, phase: phase1 },
      { amp: A2, omega: w2, phase: phase2 },
      { amp: A3, omega: w3, phase: phase3 },
    ];
  }

  /** Advance time and return the wind vector at new time. */
  step(deltaMs: number): Vector {
    this.t += deltaMs / 1000;

    let p: Vector = { x: 0, y: 0 };
    for (const s of this.sticks) {
      const a = s.omega * this.t + s.phase;
      p = Vector.add(p, { x: s.amp * Math.cos(a), y: s.amp * Math.sin(a) });
    }
    this.x = p.x;
    this.y = p.y;
    return p;
  }

  /** If you want the “stick joints” for debugging/visualization */
  joints(): Vector[] {
    let p: Vector = { x: 0, y: 0 };
    const pts: Vector[] = [{ x: 0, y: 0 }];

    for (const s of this.sticks) {
      const a = s.omega * this.t + s.phase;
      p = Vector.add(p, { x: s.amp * Math.cos(a), y: s.amp * Math.sin(a) });
      pts.push({ ...p });
    }
    return pts;
  }
}
