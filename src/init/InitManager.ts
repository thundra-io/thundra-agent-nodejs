/**
 * Manages initialization process
 */
import { INITIALIZERS } from './Initializers';
import ThundraLogger from '../ThundraLogger';
import ModuleUtils from '../utils/ModuleUtils';
import ConfigProvider from '../config/ConfigProvider';
import ConfigNames from '../config/ConfigNames';
import LambdaUtils from '../utils/LambdaUtils';

/**
 * Manages initialization of initializers
 */
class InitManager {

    private static initialized: boolean = false;

    private constructor() {
    }

    /**
     * Triggers initialization process
     */
    static init(): void {
        ThundraLogger.debug(`<InitManager> Initializing initializers ...`);
        if (!InitManager.initialized) {
            let instrumentOnLoad =
                ConfigProvider.get(ConfigNames.THUNDRA_TRACE_INSTRUMENT_ONLOAD, null);
            if (instrumentOnLoad === null) {
                // If instrument on-load configuration is not specified
                const lambdaRuntime: boolean = LambdaUtils.isLambdaRuntime();
                if (lambdaRuntime) {
                    // In AWS-Lambda environment, we can disable instrument on-load by default (unless it is specified)
                    // to get rid of performance overhead of hooking via `require-in-the-middle`.
                    instrumentOnLoad = false;
                }
            }
            ModuleUtils.setInstrumentOnLoad(instrumentOnLoad);

            INITIALIZERS.forEach((initializer: any) => {
                ThundraLogger.debug(`<InitManager> Initializing ${initializer.name} ...`);
                if (!initializer.initialized) {
                    const init = initializer.impl.init;
                    if (init && typeof init === 'function') {
                        try {
                            const initializationResult = init.apply(this);
                            if (initializationResult) {
                                ThundraLogger.debug(`<InitManager> Initialized ${initializer.name}`);
                            }

                            initializer.initialized = initializationResult;
                        } catch (e) {
                            ThundraLogger.error(`<InitManager> Failed initialized of ${initializer.name}: e`);
                        }
                    } else {
                        ThundraLogger.error(
                            `<InitManager> Couldn't initialize ${initializer.name} \
                            because no init method is either defined or exported`);
                    }
                } else {
                    ThundraLogger.debug(
                        `<InitManager> Skipped initializing of ${initializer.name} as it is already initialized`);
                }
            });
            InitManager.initialized = true;
        } else {
            ThundraLogger.debug(`<InitManager> Skipped initialization as initializers have been already initialized`);
        }
    }
}

export default InitManager;
