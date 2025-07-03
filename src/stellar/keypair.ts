import {
    StrKey,
    xdr
} from '@stellar/stellar-base';

import type { Scalar } from '@futuretense/curves';
import {
    fp,
    base,
    randomScalar,
    scalarFromHash,
    serializeScalar
} from '@futuretense/curves/ed25519';

import {
    concatBytes,
    bytesToNumberBE,
    hexToBytes,
} from '@noble/curves/utils';

export class Keypair {

    sk: Scalar;
    pk: Uint8Array;
    type: 'ed25519';

    signatureHint() {
        const hint = this.pk.slice(-4);
        return Buffer.from(hint);
    }

    constructor(sk: Scalar) {
        this.sk = sk;
        this.pk = base.multiply(sk).serialize();
    }

    publicKey() {
        return StrKey.encodeEd25519PublicKey(Buffer.from(this.pk));

    }

    canSign() {
        return true;
    }

    sign(msg: Buffer): Buffer {
        const r = randomScalar();
        const R = base.multiply(r).serialize();
        const h = scalarFromHash(R, this.pk, Uint8Array.from(msg));
        const s = fp.add(fp.mul(h, this.sk), r);
        const signature = concatBytes(R, serializeScalar(s));
        return Buffer.from(signature);
    }

    signDecorated(data: Buffer) {
        return new xdr.DecoratedSignature({
            hint: this.signatureHint(),
            signature: this.sign(data)
        });
    }

    signPayloadDecorated(data: Buffer) {
        const signature = this.sign(data);
        const keyHint = this.signatureHint();

        let hint = Buffer.from(data.subarray(-4));
        if (hint.length < 4) {
            // append zeroes as needed
            hint = Buffer.concat([hint, Buffer.alloc(4 - data.length, 0)]);
        }

        return new xdr.DecoratedSignature({
            hint: Buffer.from(hint.map((byte, i) => byte ^ keyHint[i])),
            signature
        });
    }

    static fromPrivateKey(privKey: string) {
        return new Keypair(bytesToNumberBE(hexToBytes(privKey)));
    }

    static random() {
        return new Keypair(randomScalar());
    }
}
