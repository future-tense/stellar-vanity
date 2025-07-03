import crc from 'crc';
import { StrKey } from '@stellar/stellar-base';
import {
    bytesToHex,
    bytesToNumberLE,
    numberToBytesBE
} from '@noble/curves/utils';
import { base32 } from '@scure/base';

import { grind as _grind } from '../common/grind.js';
import type { Pattern, Options } from '../common/types.js';

type StellarPattern = Pattern & {
    checksum?: number;
    checkmask?: number
};

const zero = 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
const one  = '77777777777777777777777777777777777777777777777777777777';

function _both(prefix: string, suffix: string): StellarPattern {
    const match = base32.decode(prefix + zero.slice(prefix.length + suffix.length) + suffix);
    const mask = base32.decode(one.slice(56 - prefix.length) + zero.slice(prefix.length + suffix.length) + one.slice(56 - suffix.length));

    return {
        mask: bytesToNumberLE(mask.slice(1, -2)),
        match: bytesToNumberLE(match.slice(1, -2)),
        checksum: Number(bytesToNumberLE(match.slice(-2))),
        checkmask: Number(bytesToNumberLE(mask.slice(-2))),
    }
}

function _prefix(needle: string): StellarPattern {
    const match = base32.decode(needle + zero.slice(needle.length));
    const mask = base32.decode(one.slice(56 - needle.length) + zero.slice(needle.length));

    return {
        mask: bytesToNumberLE(mask.slice(1, -2)),
        match: bytesToNumberLE(match.slice(1, -2))
    }
}

function _suffix(needle: string): StellarPattern {
    const match = base32.decode(zero.slice(needle.length) + needle);
    const mask  = base32.decode(zero.slice(needle.length) + one.slice(56 - needle.length));

    return {
        mask: bytesToNumberLE(mask.slice(1, -2)),
        match: bytesToNumberLE(match.slice(1, -2)),
        checksum: Number(bytesToNumberLE(match.slice(-2))),
        checkmask: Number(bytesToNumberLE(mask.slice(-2))),
    }
}

const crcPrefix = crc.crc16xmodem(Uint8Array.from([48]));

export function* generate(options: Options): Generator<[string, string]> {

    let pattern;
    const { prefix, suffix, batchSize } = options;
    if (prefix && suffix) {
        pattern = _both(prefix, suffix);
    } else if (prefix) {
        pattern = _prefix(prefix);
    } else if (suffix) {
        pattern = _suffix(suffix)
    } else {
        return;
    }

    const checksum = pattern.checksum;
    if (checksum) {
        const mask = pattern.checkmask!;
        for (const [pubKey, privKey] of _grind(pattern, batchSize || 1280)) {
            if (checksum === (crc.crc16xmodem(pubKey, crcPrefix) & mask)) {
                yield [
                    StrKey.encodeEd25519PublicKey(Buffer.from(pubKey)),
                    bytesToHex(numberToBytesBE(privKey, 32))
                ];
            }
        }
    }

    else {
        for (const [pubKey, privKey] of _grind(pattern, batchSize || 1280)) {
            yield [
                StrKey.encodeEd25519PublicKey(Buffer.from(pubKey)),
                bytesToHex(numberToBytesBE(privKey, 32))
            ];
        }
    }
}
