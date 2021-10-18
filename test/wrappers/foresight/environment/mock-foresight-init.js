process.env['THUNDRA_APIKEY'] = 'foo';
process.env['THUNDRA_AGENT_TEST_PROJECT_ID'] = 'MOCK_TEST_PROJECT_ID';
process.env['THUNDRA_AGENT_TEST_RUN_ID'] = 'MOCK_TEST_RUN_ID';

import ConfigProvider from '../../../../dist/config/ConfigProvider';
import * as ForesightWrapper from '../../../../dist/wrappers/foresight';
import * as ThundraJestEnvironment from '../../../../dist/wrappers/foresight/lib/jest/ThundraJestEnvironment';
import * as TestRunnerSupport from '../../../../dist/wrappers/foresight/TestRunnerSupport';

ThundraJestEnvironment.__PRIVATE__.getSetupFilePath = () => './SetupFile.js';

ConfigProvider.init();
ForesightWrapper.init();

TestRunnerSupport.setWrapperContext = (context) => {

    const mockWrapperContext = {
        ...context,
        reporter: {
            addReport: () => {},
            sendReports: () => {},
            httpsRequest: () => {},
        },
    }

    TestRunnerSupport.wrapperContext = mockWrapperContext
}