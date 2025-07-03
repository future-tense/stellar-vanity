# A vanity address generator, with a twist

```
npm install
npm run build
```

## Generating vanity addresses

```
> generate --prefix <prefix> --suffix <suffix> --many --batch-size <number>
```

## Delegating signing

After you've generated a vanity address, to actually claim it, you have to create it onchain (send XLM to it), and then  either add a regular ed25519 public key as a signer, or sign it using the Keypair provided in the npm package.

```
> generate --prefix GALAXY
GALAXYRNTYQ65EOLHJ242A47KAVYAJEPUO6L46XPT3XA3D5HY3CUFV44 0x004b9f65645d968f77ebc01524933ed0712c568ac1da07037eca9dfb77b977f3

> delegate --key 0x004b9f65645d968f77ebc01524933ed0712c568ac1da07037eca9dfb77b977f3 --signer <G-Account>
Successfully delegated signing to G...
```

## Benchmark
```
generate --benchmark
generate --benchmark --batch-size 1024
```
