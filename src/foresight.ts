import ConfigProvider from './config/ConfigProvider';
import InitManager from './init/InitManager';
import * as Foresight from './wrappers/foresight';

let initialized = false;

export function init(options?: any) {
    if (!initialized) {
        ConfigProvider.init(options);
        InitManager.init();
        Foresight.init();

        initialized = true;
    }
}

export const globalSetup = Foresight.globalSetup;
export const globalTeardown = Foresight.globalTeardown;
