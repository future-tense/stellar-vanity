import { program } from 'commander';

import {
    BASE_FEE,
    Horizon,
    Networks,
    Operation,
    TransactionBuilder,
} from '@stellar/stellar-sdk';

import { Keypair } from './stellar/keypair.js';

const options = program
    .option('--key <string')
    .option('--signer <string')
    .option('--testnet')
    .parse()
    .opts();

if (!options.key || !options.signer) {
    process.exit(0);
}

const keys = Keypair.fromPrivateKey(options.key.slice(2));
const source = keys.publicKey();

let network: string, url: string;
if (!options.testnet) {
    network = Networks.PUBLIC;
    url = 'https://horizon.stellar.org';
} else {
    network = Networks.TESTNET;
    url = 'https://horizon-testnet.stellar.org';
}

const server = new Horizon.Server(url);
const sourceAccount = await server.loadAccount(source);

const tx = new TransactionBuilder(sourceAccount, {
        fee: BASE_FEE,
        networkPassphrase: network
    })
    .addOperation(Operation.setOptions({
        source,
        masterWeight: 0,
        signer: {
            ed25519PublicKey: options.signer,
            weight: 1
        },
        lowThreshold: 1,
        medThreshold: 1,
        highThreshold: 1
    }))
    .setTimeout(0)
    .build();

//  @ts-ignore
tx.sign(keys);

const res = await server.submitTransaction(tx);
if (res.successful !== true) {
    console.log(`Successfully delegated signing to ${options.signer}`);
} else {
    console.log('Transaction failed');
}
