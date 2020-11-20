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

    private constructor() {
    }

    /**
     * Triggers initialization process
     */
    static init(): void {
        ThundraLogger.debug(`<InitManager> Initializing initializers ...`);
        if (!InitManager.initialized) {
            INITIALIZERS.forEach((initializer: any) => {
                ThundraLogger.debug(`<InitManager> Initializing ${initializer.name} ...`);
                if (!initializer.initialized) {
                    const init = initializer.impl.init;
                    if (init && typeof init === 'function') {
                        try {
                            init.apply(this);
                            initializer.initialized = true;
                            ThundraLogger.debug(`<InitManager> Initialized ${initializer.name}`);
                        } catch (e) {
                            ThundraLogger.error(`<InitManager> Failed initialized of ${initializer.name}: e`);
                        }
                    } else {
                        ThundraLogger.error(
                            `<InitManager> Couldn't initialize ${initializer.name} \
                            because no "init" method is either defined or exported`);
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
