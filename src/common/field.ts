import { ed25519 } from '@noble/curves/ed25519';

const fp = ed25519.CURVE.Fp;
const p = 2n**255n - 19n;

export const invP = (x: bigint) => fp.inv(x);

const zero = 0n;
const _256n = 256n;
const _38n = 38n;

const mask = 2n**256n - 1n;
export function modP(x: bigint) {
    let a: bigint;
    for (;;) {
        a = x >> _256n;
        if (a === zero) {
            break;
        }

        x = (_38n * a) + (x & mask);
        a = x >> _256n;
        if (a === zero) {
            break;
        }

        x = (_38n * a) + (x & mask);
        break;
    }

    if (x > p) x -= p;
    if (x > p) x -= p;
    return x;
}
