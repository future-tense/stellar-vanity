import { base, randomScalar } from '@futuretense/curves/ed25519';
import { ed25519 } from '@noble/curves/ed25519';
import { mod } from '@noble/curves/abstract/modular';

import { updatePoints, initializePoints } from './points.js';
import type { MutablePoint } from './types.js';

const p = 2n**255n - 19n;
const modP = (x: bigint) => mod(x, p);

const { a, d } = ed25519.CURVE;

function add(p1: MutablePoint, p2: MutablePoint) {
    const { x: X1, y: Y1, z: Z1, t: T1 } = p1
    const { x: X2, y: Y2, z: Z2, t: T2 } = p2;
    const A = modP(X1 * X2); // A = X1*X2
    const B = modP(Y1 * Y2); // B = Y1*Y2
    const C = modP(T1 * d * T2); // C = T1*d*T2
    const D = modP(Z1 * Z2); // D = Z1*Z2
    const E = modP((X1 + Y1) * (X2 + Y2) - A - B); // E = (X1+Y1)*(X2+Y2)-A-B
    const F = D - C; // F = D-C
    const G = D + C; // G = D+C
    const H = modP(B - a * A); // H = B-a*A
    p1.x = modP(E * F); // X3 = E*F
    p1.y = modP(G * H); // Y3 = G*H
    p1.z = modP(F * G); // Z3 = F*G
    p1.t = modP(E * H); // T3 = E*H
}

const batchSize = 1024;
let sk = randomScalar();
let pk = base.multiply(sk);
const { points, step } = initializePoints(pk, batchSize);
const points2 = points.map(({x, y, z, t}) => ({x, y, z, t}));

for (;;) {
    updatePoints(points, step);
    for (const point of points2) {
        add(point, step);
    }

    for (let i = 0; i < batchSize; i++) {

        if (
            !(
                (points[i].x === points2[i].x) &&
                (points[i].y === points2[i].y) &&
                (points[i].z === points2[i].z) &&
                (points[i].t === points2[i].t)

            )
        ) {
            console.log('mismatch');
        }
    }
}
