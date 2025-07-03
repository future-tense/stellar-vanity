import type { Point } from '@futuretense/curves';
import { base } from '@futuretense/curves/ed25519';
import { ed25519 } from '@noble/curves/ed25519';

import { modP, invP } from './field.js';
import type { MutablePoint } from './types.js';

type ExtPoint = typeof ed25519.Point.BASE;

const d = ed25519.CURVE.d;
const p = 2n**255n - 19n;

//
//  adapted from '@noble/curves'
//

export function updatePoints(points: MutablePoint[], step: MutablePoint) {

    const { x: X2, y: Y2 } = step;
    const T2 = modP(d * step.t);

    const size = points.length;
    for (let i = 0; i < size; i++) {
        const { x: X1, y: Y1, z: Z1, t: T1 } = points[i];
        const A = X1 * X2; // A = X1*X2
        const B = Y1 * Y2; // B = Y1*Y2
        const C = modP(T1 * T2); // C = T1*d*T2
        const E = modP((X1 + Y1) * (X2 + Y2) - A - B);          // E = X1*Y2 + X2*Y1
        const F = modP(Z1 + p - C); // F = D-C
        const G = Z1 + C; // G = D+C
        const H = modP(A + B); // H = B-a*A, a = -1
        points[i] = {
            x: modP(E * F), // X3 = E*F
            y: modP(G * H), // Y3 = G*H
            z: modP(F * G), // Z3 = F*G
            t: modP(E * H), // T3 = E*H
        }
    }
}

export function initializePoints(p: Point, n: number) {
    const res = Array<MutablePoint>(n);
    for (let i = 0; i < n; i++) {
        res[i] = {
            x: (p as unknown as ExtPoint).ex,
            y: (p as unknown as ExtPoint).ey,
            z: (p as unknown as ExtPoint).ez,
            t: (p as unknown as ExtPoint).et,
        }
        p = p.add(base);
    }

    const step = base.multiply(BigInt(n)) as unknown as ExtPoint;

    return {
        points: res,
        step: {
            x: step.ex,
            y: step.ey,
            z: step.ez,
            t: step.et,
        }
    };
}

//
//      Montgomery batch inversion
//

const one = 1n;
export function batchInvert(points: MutablePoint[], invertedZ: bigint[]) {

    const size = points.length;
    let acc = one;
    for (let i = 0; i < size; i++) {
        invertedZ[i] = acc;
        acc = modP(points[i].z * acc);
    }

    acc = invP(acc);

    for (let i = size - 1; i >= 0; i--) {
        invertedZ[i] = modP(acc * invertedZ[i]);
        acc = modP(points[i].z * acc);
    }
}
