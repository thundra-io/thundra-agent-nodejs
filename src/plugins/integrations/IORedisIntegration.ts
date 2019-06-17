import Integration from './Integration';
import { runInThisContext } from 'vm';

const Hook = require('require-in-the-middle');
class IORedisIntegration implements Integration {
    version: string;
    lib: any;
    config: any;
    hook: any;
    basedir: string;

    constructor(config: any) {
        this.hook = Hook('ioredis', { internals: true }, (exp: any, name: string, basedir: string) => {
            this.lib = exp;
            this.config = config;
            this.basedir = basedir;

            this.wrap.call(this, exp, config);
            return exp;
        });
    }

    wrap(lib: any, config: any) {
        console.log('IOREDIS WRAP METHOD');
    }

    unwrap() {
        console.log('IOREDIS UNWRAP METHOD');
    }
}
