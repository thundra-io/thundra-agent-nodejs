/**
 * Manages initialization process
 */
import {INITIALIZERS} from './Initializers';
import ThundraLogger from '../ThundraLogger';

/**
 * Manages initialization of initializers
 */
class InitManager {

    private static initialized: boolean = false;

    private static initMethodName: string = 'init';

    private static instrumentMethodName: string = 'instrument';

    private constructor() {
    }

    /**
     * Triggers initialization process
     */
    static init(): void {
        InitManager.process(InitManager.initMethodName);
    }

    /**
     * Triggers instrumentation process
     */
    static instrument(): void {
        InitManager.process(InitManager.instrumentMethodName);
    }

    private static process(methodName: string): void {
        ThundraLogger.debug(`<InitManager> Initializing initializers ...`);
        if (!InitManager.initialized) {
            INITIALIZERS.forEach((initializer: any) => {
                ThundraLogger.debug(`<InitManager> Initializing ${initializer.name} ...`);
                if (!initializer.initialized) {
                    const init = initializer.impl[methodName];
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
                            because no "${methodName}" method is either defined or exported`);
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
