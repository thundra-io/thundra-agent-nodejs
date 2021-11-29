import ModuleUtils from '../../../utils/ModuleUtils';

import Reporter from '../../../Reporter';
import ConfigProvider from '../../../config/ConfigProvider';
import ConfigNames from '../../../config/ConfigNames';
import ExecutionContextManager from '../../../context/ExecutionContextManager';
import ExecutionContext from '../../../context/ExecutionContext';

import ThundraLogger from '../../../ThundraLogger';
import { ClassNames, DomainNames } from '../../../Constants';
import LambdaUtils from '../../../utils/LambdaUtils';

import * as SubscriptionExecutor from './SubscriptionExecutor';
import WrapperUtils from '../../WebWrapperUtils';

const ApplicationClassName = ClassNames.GOOGLE_PUBSUB_NODE_HANDLER;
const ApplicationDomainName = DomainNames.MESSAGING;

let _REPORTER: Reporter;
let _PLUGINS: any[];
let initialized = false;

const initWrapperContext = () => {
    if (initialized) {
        return;
    }

    ThundraLogger.debug('<GoogleSubscriptionWrapper> Initializing ...');
    initialized = true;
    const {
        reporter,
        plugins,
    } = WrapperUtils.initWrapper(SubscriptionExecutor);

    _REPORTER = reporter;
    _PLUGINS = plugins;

    WrapperUtils.initAsyncContextManager();
};

function subscriberOnWrapper(wrappedFunction: any) {
    return function internalPubSubSubscriberWrapper(eventName: any, callback: any) {
        if (eventName !== 'message') {
            return wrappedFunction.apply(this, [eventName, callback]);
        }

        const orginalCallback = callback;
        const wrappedCallback = (message: any) => ExecutionContextManager.runWithContext(
            () => {
                return WrapperUtils.createExecContext(ApplicationClassName, ApplicationDomainName);
            },
            async function () {
                if (!message) {
                    return;
                }

                const context: ExecutionContext = this;
                let beforeRequestCalled: boolean = false;
                try {
                    ThundraLogger.debug('<GoogleSubscriptionWrapper> Before handling request');
                    await WrapperUtils.beforeRequest(message, {}, _PLUGINS);
                    beforeRequestCalled = true;

                    await orginalCallback(message);
                } catch (err) {
                    ThundraLogger.debug('<GoogleSubscriptionWrapper> An error occured while handling message', err);
                    context.setError(err);
                    if (!beforeRequestCalled) {
                        await orginalCallback(message);
                    }
                } finally {
                    ThundraLogger.debug('<GoogleSubscriptionWrapper> After handling request');
                    if (beforeRequestCalled) {
                        // Call "after-request" if "before-request" has been handled successfully
                        await WrapperUtils.afterRequest(message, {}, _PLUGINS, __PRIVATE__.getReporter());
                   }
                }
            });

        return wrappedFunction.apply(this, [eventName, wrappedCallback]);
    };
}

export const init = () => {

    const isGoogleSubscriptionTracingDisabled =
        ConfigProvider.get<boolean>(ConfigNames.THUNDRA_TRACE_INTEGRATIONS_GOOGLE_PUBSUB_DISABLE);

    if (isGoogleSubscriptionTracingDisabled) {

        ThundraLogger.debug('<GoogleSubscriptionWrapper> Google subscription wrapper disabled ...');

        return false;
    }

    const lambdaRuntime = LambdaUtils.isLambdaRuntime();
    if (!lambdaRuntime) {
        ModuleUtils.instrument(
            ['@google-cloud/pubsub/build/src/subscription'], undefined,
            (lib: any, cfg: any) => {

                initWrapperContext();

                ModuleUtils.patchModule(
                    '@google-cloud/pubsub/build/src/subscription',
                    'on',
                    subscriberOnWrapper,
                    (subscription: any) => subscription.Subscription.prototype,
                    lib);
                },
                (lib: any, cfg: any) => { /* empty */ },
                {},
            );

        return true;
    } else {
        ThundraLogger.debug('<GoogleSubscriptionWrapper> Skipping initializing due to running in lambda runtime ...');
        return false;
    }

};

/* test-code */
export const __PRIVATE__ = {
    getReporter: () => {
        return _REPORTER;
    },
};
/* end-test-code */
