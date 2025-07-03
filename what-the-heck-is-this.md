# An exercise in number-go-up.

Yet another vanity address generator?

The canonical, naïve vanity address generator is just a loop that generates a random seed, gets the ed25519 public key it corresponds to, and checks if there's a match.

Referencing the benchmark results posted in the '@noble/curves' npm package (benchmarked on an Apple M4),

    # ed25519
    init 14ms
    getPublicKey x 14,216 ops/sec @ 70μs/op
    sign x 6,849 ops/sec @ 145μs/op
    verify x 1,400 ops/sec @ 713μs/op

    # ristretto255
    add x 931,966 ops/sec @ 1μs/op
    multiply x 15,444 ops/sec @ 64μs/op
    encode x 21,367 ops/sec @ 46μs/op
    decode x 21,715 ops/sec @ 46μs/op

getPublicKey() gets you 14k addresses per second.

We can do much better.

## 1. Use Schnorr private keys instead of ed25519 seeds

If we take a look under the hood of what goes into generating a public key from a seed, it's basically something like this:

```
    const seed = randomBytes(32);
    const hash = sha512(seed).slice(0, 32);
    const privateKey = bytesToNumberLE(hash);
    privateKey &= 2n**254n-8n;
    privateKey |= 2n**254n;
    const publicKey = base.multiply(privateKey).serialize();
```

whereas going from a private key to a public key is just this

```
    const privateKey = randomScalar();
    const publicKey = base.multiply(privateKey).serialize();
```

It's not much of a speed-up yet, but a lot simpler.

Next stop it to remove the randomization per address, by incrementing the privateKey

```
    let privateKey = randomScalar();
    for (;;) {
        const publicKey = base.multiply(privateKey).serialize();
        privateKey++;
    }
```

and replacing the multiplication with point additions

```
    let privateKey = randomScalar();
    let publicPoint = base.multiply(privateKey);
    for (;;) {
        const publicKey = publicPoint.serialize();
        publicPoint = publicPoint.add(base);
        privateKey++;
    }
```

## 2. Batching, and batch inversion

We just replaced a multiplication (64μs) with addition (1μs). What we have left now is a serialization (46μs).

If we take a look at what happens, our elliptical curve points (x',y') are represented internally as extended projected points (x, y, z, t). We can ignore t, but to get x' and y' we need to divide x and y by z.

These coordinates are all prime field elements, so dividing by z is the same as multiplying by the inverse of z, and inverting z is the same as taking z to the (p - 2)'th power, where p is the size of the field. Slow doesn't even begin to describe it.

Instead of doing this once per point, what we can do is a batch inversion, where we multiply all the different z's in a batch, invert that one element, and then do some (relatively) simple math to apply that to all our input z's and invert them.

## 3. Address matching in raw data instead of in Base32

Now that we have projected x's and y's for the curve points, serialization is done by taking the y-coordinate, and the "sign" of the x-coordinate, "compressing" them into one 256-bit number, and converting it into a sequence of bytes.

For getting an StrKey out of this, we prefix these bytes with a type-specificer (0x40 for regular G-accounts), calculate a 16-bit checksum that we tack onto the end, and convert all of that into Base32.

What *we* are going to do is to take the pattern we're looking for, and go the opposite direction

E.g., looking for a prefix of 'GALAXYVOID', we figure out what pattern this is in raw bytes.

```
Base32: GALAXYVOID..............................................
match: 160be2ae40c00000000000000000000000000000000000000000000000000000
mask:  ffffffffffc00000000000000000000000000000000000000000000000000000
```

We take our 256-bit compressed bigint, AND it with 'mask', and compare to 'match'.

## 4. Faster additions + modulo

At this stage we've basically reduced our processing to a bunch of point additions, at around 1μs each.
There's really not a lot of overhead left, or things we can rearrange.

Except...

Our point additions are eleven field multiplications, and ten modulo reductions.
Our batch inversion is three field multiplications and three modulos resuctions per points.
Our projection is two of each.

So, looking at the point additions, there's the trivial stuff we can do, like remove the multiplication with 'a', as it's just -1 for the curve we're using, and precompute the multiplication of d and T2, as that's constant for any particular batch size.

Because of the way scalar multiplications usually are implemented, the point 'step' always has its z set to a value of 1, which simplifies the point addition further.

ModP is just implemented as 'x % p', with conditional patching up of the result if it turns out to be negative (by adding p). This involves a slow integer division of a ~512-bit number by a 255-bit number.

The first thing we do is rewrite our 'x' as

`x = a * 2^256 + b`

Modulo P, this is equivalent to x = 38*a + b, which (at its max) is a 261-bit number.

We repeat until 'a' is zero, which takes at most one more time, and then we simply subtract p for as long as b is still greater-than or equal-to p (also at most two times).

Finally we analyse the range of our inputs to modP, and remove modulo reductions where they aren't absolutely required.

With all of that done, we've gone from a something that ran just below 10,000 addresses generated per second on an Apple M1, to a beast of 720,000 addresses per second. In plain javascript.

Cheers!
