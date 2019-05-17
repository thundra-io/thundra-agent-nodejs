import Integration from './Integration';
import ThundraTracer from '../../opentracing/Tracer';
import {
    DBTags, SpanTags, SpanTypes, DomainNames, DBTypes, ESTags,
    LAMBDA_APPLICATION_DOMAIN_NAME, LAMBDA_APPLICATION_CLASS_NAME,
} from '../../Constants';
import ModuleVersionValidator from './ModuleVersionValidator';
import ThundraLogger from '../../ThundraLogger';
import ThundraSpan from '../../opentracing/Span';
import InvocationSupport from '../support/InvocationSupport';

const shimmer = require('shimmer');
const Hook = require('require-in-the-middle');

class MongoDBIntegration implements Integration {
    config: any;
    lib: any;
    version: string;
    hook: any;
    basedir: string;

    constructor(config: any) {
        this.version = '>=2';
        this.hook = Hook('mongodb-core', { internals: true }, (exp: any, name: string, basedir: string) => {
            if (name === 'mongodb-core') {
                const moduleValidator = new ModuleVersionValidator();
                const isValidVersion = moduleValidator.validateModuleVersion(basedir, this.version);
                if (!isValidVersion) {
                    ThundraLogger.getInstance().error('Invalid module version for mongodb integration. ' +
                                                    `Supported version is ${this.version}`);
                } else {
                    this.lib = exp;
                    this.config = config;
                    this.basedir = basedir;

                    this.wrap.call(this, exp, config);
                }
            }
            return exp;
        });
    }

    wrap(lib: any, config: any) {
        function wrapper(originalInsertMethod: any) {
            return function insertWrapper(ns: any, ops: any, options: any, callback: any) {
                console.log('inside the insertWrapper');
                return originalInsertMethod.call(this, ns, ops, options, callback);
            };
        }

        shimmer.wrap(lib.Server.prototype, 'insert', wrapper);
    }

    unwrap() {
        shimmer.unwrap(this.lib.Server.prototype, 'insert');
        this.hook.unhook();
    }
}

export default MongoDBIntegration;
