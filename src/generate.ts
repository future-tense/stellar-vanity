import { program } from 'commander';
import { benchmark} from './common/grind.js';
import { generate } from './stellar/index.js';

const options = program
    .option('--prefix <string')
    .option('--suffix <string')
    .option('--batch-size <value>')
    .option('--benchmark')
    .option('--many')
    .parse()
    .opts();

if (options.prefix) {
    if (/^G[A-D][A-Z2-7]*$/.test(options.prefix) === false) {
        console.log('Invalid prefix. Has to be BASE32, and has to start with GA, GB, GC, or GD.'); 
        process.exit();
    }
}

if (options.suffix) {
    if (/^[A-Z2-7]*$/.test(options.suffix) === false) {
        console.log('Invalid suffix. Has to be BASE32.'); 
        process.exit();
    }
}

if (options.batchSize) {
    if (isNaN(options.batchSize)) {
        console.log('Batch-size has to be a number.');
        process.exit();
    }
}

if (options.benchmark) {
    benchmark(options);
}

else {
    if (options.many) {
        for (const [pubkey, privkey] of generate(options)) {
            console.log(pubkey, `0x${privkey}`);
        };
    } else {
        const [pubkey, privkey] = generate(options).next().value;
        console.log(pubkey, `0x${privkey}`);
    }
}
