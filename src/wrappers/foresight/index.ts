import ConfigNames from '../../config/ConfigNames';
import ConfigProvider from '../../config/ConfigProvider';
import ThundraLogger from '../../ThundraLogger';
import ModuleVersionValidator from '../../utils/ModuleVersionValidator';
import libs from './lib';

const path = require('path');
const Hook = require('require-in-the-middle');

/**
 * Handler method for global setup process
 * @param clientGlobalSetupPath clientGlobalSetupPath
 */
export function globalSetup(clientGlobalSetupPath: string) {

    /**
     * will be used for start test event.
     * After new test event logic implemented
     * ... do something and return clientGlobalSetupPath
     */

    return clientGlobalSetupPath;
}

/**
 * Handler method for global teardown process
 * @param clientGlobalSetupPath clientGlobalSetupPath
 */
export function globalTeardown(clientGlobalSetupPath: string) {

    /**
     * will be used for fisinh test event.
     * After new test event logic implemented
     * ... do something and return clientGlobalSetupPath
     */

    return clientGlobalSetupPath;
}

/**
 * Foresight wrapper init function
 */
export function init() {

    const testWrapperDisabled = ConfigProvider.get<string>(ConfigNames.THUNDRA_AGENT_TEST_DISABLE);
    if (testWrapperDisabled) {

        ThundraLogger.debug(`<ForesightInit> Foresight disabled.`);
        return;
    }

    ThundraLogger.debug(`<ForesightInit> Initializing ...`);

    libs.forEach((value: any, key: any) => {

        [].concat(value)
        .forEach((instrumentation) => {

            const moduleName = instrumentation.name;
            const version = instrumentation.version;
            let notSupportedVersion = '';

            try {

                const hook = (lib: any, name: string, basedir: string) => {

                    if (name === moduleName) {

                        const isValidVersion = ModuleVersionValidator.validateModuleVersion(basedir, version);
                        if (isValidVersion) {

                            return instrumentation.patch.call(this, lib);
                        }

                        notSupportedVersion = require(path.join(basedir, 'package.json')).version;

                        ThundraLogger.error(
                            `<ForesightInit> Version ${notSupportedVersion} is invalid for module ${moduleName}.
                            Supported version is ${version}`);
                    }

                    return lib;
                };

                Hook(moduleName, { }, hook);
            } catch (e) {

                ThundraLogger.error(
                    `<ForesightInit> Foresight did not initialized module ${moduleName} for version ${notSupportedVersion}.`);
            }
        });
    });

    return true;
}
