import Integration from './Integration';
import ModuleUtils from '../utils/ModuleUtils';

const shimmer = require('shimmer');
const has = require('lodash.has');
const get = require('lodash.get');

const MODULE_NAMES = [
    '@aws-sdk/smithy-client/dist/cjs/client.js',
    '@aws-sdk/client-dynamodb/node_modules/@aws-sdk/smithy-client/dist/cjs/client.js'
];
const MODULE_VERSION = '3.x';

/**
 * {@link Integration} implementation for AWS integration
 * through {@code aws-sdk v3} library
 */
export class AWSv3Integration implements Integration {

    config: any;
    private wrappedFuncs: any;
    private instrumentContext: any;

    constructor(config: any) {
        this.wrappedFuncs = {};
        this.config = config || {};
        this.instrumentContext = ModuleUtils.instrument(
            MODULE_NAMES, MODULE_VERSION,
            (lib: any, cfg: any) => {
                this.wrap.call(this, lib, cfg);
            },
            (lib: any, cfg: any) => {
                this.doUnwrap.call(this, lib);
            },
            this.config);
    }

    /**
     * @inheritDoc
     */
    wrap(lib: any, config: any) {

        const integration = this;
        function wrapper(wrappedFunction: any, wrappedFunctionName: string) {
            integration.wrappedFuncs[wrappedFunctionName] = wrappedFunction;
            return function AWSSDKWrapper(command: any, optionsOrCb: any, cb: any) {
                // Build request for passing to AWSServiceIntegration

                const currentInstance = this;
                const request: any = {
                    operation: command.constructor.name,
                    params: command.input,
                    service: {
                        serviceIdentifier: currentInstance.config.serviceId,
                        config: {
                        }
                    }
                };

                this.middlewareStack.add(
                    (next: any, context: any) => async (args: any) => {

                        console.log(currentInstance);

                        request.service.config.region = await currentInstance.config.region();
                        request.service.config.endpoint = await currentInstance.config.endpoint();

                        console.log(command);
                        console.log(request);
                        console.log(context);
                        const result = await next(args);

                        request.response = result.response;

                        console.log('ocococoacowaocaowc owaocwaocoawocaocowaocawocaowcowacowo')
                        return result;
                    },{
                        step: 'deserialize',
                        priority: 'low',
                        name: 'thundra_deserialize_middileware',
                        tags: ['__thundra__']
                    }
                )

                const result = wrappedFunction.apply(this, [command, optionsOrCb, cb]);
                // Check whether result is promise
                if (typeof result.then === 'function') {
                    result.then((value: any) => {
                        console.log(value)
                    }).catch((err: Error) => {
                        console.log(err)
                    });
                }
                return result;
            };
        }

        if (has(lib, 'Client.prototype.send')) {
            shimmer.wrap(lib.Client.prototype, 'send', (wrapped: Function) => wrapper(wrapped, 'send'));
        }
    }

    /**
     * Unwraps given library
     * @param lib the library to be unwrapped
     */
    doUnwrap(lib: any) {
        if (has(lib, 'Client.prototype.send')) {
            shimmer.unwrap(lib.Client.prototype, 'send');
        }
    }

    /**
     * @inheritDoc
     */
    unwrap() {
        if (this.instrumentContext.uninstrument) {
            this.instrumentContext.uninstrument();
        }
    }

    private getOriginalFunction(wrappedFunctionName: string) {
        return get(this, `wrappedFuncs.${wrappedFunctionName}`);
    }
}
