import Utils from '../utils';
import ConfigProvider from '../../dist/config/ConfigProvider';
import ConfigNames from '../../dist/config/ConfigNames';
import ApplicationSupport from '../../dist/plugins/support/ApplicationSupport';

describe('addApplicationTags', () => {

    beforeEach(() => {
        Utils.clearEnvironmentVariables();
        ConfigProvider.clear();
    });

    afterEach(() => {
        Utils.clearEnvironmentVariables();
        ConfigProvider.clear();
    });

    it('should parse application tags from environment variables', () => {
        const THUNDRA_APPLICATION_TAG_PROP_NAME_PREFIX =
            ConfigProvider.configNameToEnvVar(ConfigNames.THUNDRA_APPLICATION_TAG_PREFIX);
        process.env[THUNDRA_APPLICATION_TAG_PROP_NAME_PREFIX + 'tag1'] = '5';
        process.env[THUNDRA_APPLICATION_TAG_PROP_NAME_PREFIX + 'tag2'] = 'true';
        process.env[THUNDRA_APPLICATION_TAG_PROP_NAME_PREFIX + 'tag3'] = 'false';
        process.env[THUNDRA_APPLICATION_TAG_PROP_NAME_PREFIX + 'tag4'] = 'test value';
        process.env[THUNDRA_APPLICATION_TAG_PROP_NAME_PREFIX + 'tag5'] = '3.5';

        ConfigProvider.init();

        ApplicationSupport.parseApplicationTags();

        expect(ApplicationSupport.applicationTags['tag1']).toBe(5);
        expect(ApplicationSupport.applicationTags['tag2']).toBe(true);
        expect(ApplicationSupport.applicationTags['tag3']).toBe(false);
        expect(ApplicationSupport.applicationTags['tag4']).toBe('test value');
        expect(ApplicationSupport.applicationTags['tag5']).toBe(3.5);
    });

});