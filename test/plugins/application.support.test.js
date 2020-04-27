import ConfigProvider from '../../dist/config/ConfigProvider';
import ConfigNames from '../../dist/config/ConfigNames';
import ApplicationSupport from '../../dist/plugins/support/ApplicationSupport';

import TestUtils from '../utils';

beforeEach(() => {
    TestUtils.clearEnvironmentVariables();
    ConfigProvider.clear();
});

afterEach(() => {
    TestUtils.clearEnvironmentVariables();
    ConfigProvider.clear();
});

describe('application support', () => {
    it('should parse application tags from configs', () => {
        ConfigProvider.set(ConfigNames.THUNDRA_APPLICATION_TAG_PREFIX + 'tag1', '5');
        ConfigProvider.set(ConfigNames.THUNDRA_APPLICATION_TAG_PREFIX + 'tag2', 'true');
        ConfigProvider.set(ConfigNames.THUNDRA_APPLICATION_TAG_PREFIX + 'tag3', 'false');
        ConfigProvider.set(ConfigNames.THUNDRA_APPLICATION_TAG_PREFIX + 'tag4', 'test value');
        ConfigProvider.set(ConfigNames.THUNDRA_APPLICATION_TAG_PREFIX + 'tag5', '3.5');

        ApplicationSupport.parseApplicationTags();

        expect(ApplicationSupport.applicationTags['tag1']).toBe(5);
        expect(ApplicationSupport.applicationTags['tag2']).toBe(true);
        expect(ApplicationSupport.applicationTags['tag3']).toBe(false);
        expect(ApplicationSupport.applicationTags['tag4']).toBe('test value');
        expect(ApplicationSupport.applicationTags['tag5']).toBe(3.5);
    });
});