import { base, randomScalar } from '@futuretense/curves/ed25519';
import { numberToBytesLE } from '@noble/curves/utils';

import { updatePoints, initializePoints, batchInvert } from './points.js';
import { modP } from './field.js';
import type { Pattern, Options } from './types.js';

const negative = 1n << 255n;
const one = 1n;

function* grindPrefix({mask, match}: Pattern, batchSize: number): Generator<[Uint8Array, bigint]> {

    let sk = randomScalar();
    let pk = base.multiply(sk);

    const { points, step } = initializePoints(pk, batchSize);

    const inverseZ = new Array<bigint>(batchSize);
    for (;;) {
        batchInvert(points, inverseZ);

        const hits: [bigint, number][] = [];
        for (let i = 0; i < batchSize; i++) {
            const { y } = points[i];
            const pubKeyInt = modP(y * inverseZ[i]);

            if ((pubKeyInt & mask) === match) {
                hits.push([pubKeyInt, i]);
            }
        }

        for (const [pubKey, i] of hits) {
            yield [numberToBytesLE(pubKey, 32), sk + BigInt(i)];
        }

        updatePoints(points, step);
        sk += BigInt(batchSize);
    }
}

function* grindSuffix({mask, match}: Pattern, batchSize: number): Generator<[Uint8Array, bigint]> {

    let sk = randomScalar();
    let pk = base.multiply(sk);
    const { points, step } = initializePoints(pk, batchSize);

    const inverseZ = new Array<bigint>(batchSize);

    for (;;) {
        batchInvert(points, inverseZ);

        const hits: [bigint, number][] = [];
        for (let i = 0; i < batchSize; i++) {
            const p = points[i];
            const invZ = inverseZ[i];
            const x = modP(p.x * invZ);
            const y = modP(p.y * invZ);
            const pubKeyInt = (x & one) ? y | negative : y;

            if ((pubKeyInt & mask) === match) {
                hits.push([pubKeyInt, i]);
            }
        }

        for (const [pubKey, i] of hits) {
            yield [numberToBytesLE(pubKey, 32), sk + BigInt(i)];
        }

        updatePoints(points, step);
        sk += BigInt(batchSize);
    }
}

export function* grind({mask, match}: Pattern, batchSize: number): Generator<[Uint8Array, bigint]> {
    if (mask & negative) {
        yield* grindSuffix({mask, match}, batchSize);
    } else {
        yield* grindPrefix({mask, match}, batchSize);
    }
}

export function benchmark(options: Options){
    let pk = base;
    let sk = 1n, sk0 = sk;

    const batchSize = options.batchSize || 1280;
    const { points, step } = initializePoints(pk, batchSize);

    const inverseZ = new Array<bigint>(batchSize);

    let time0 = performance.now();

    for (let counter = 0; counter < 1000; counter++) {
        batchInvert(points, inverseZ);
        for (let i = 0; i < batchSize; i++) {
            const { y } = points[i];
            const pubKeyInt = modP(y * inverseZ[i]);
        }

        updatePoints(points, step);
        sk += BigInt(batchSize);
    }

    const time = performance.now();
    const deltat = time - time0;
    console.log((1000 * Number(sk - sk0)) / deltat);
}
