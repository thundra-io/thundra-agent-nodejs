import ConfigProvider from '../../dist/config/ConfigProvider';
import ConfigNames from '../../dist/config/ConfigNames';

import TestUtils from '../utils';

import {ApplicationManager} from '../../dist/application/ApplicationManager';
import {LambdaApplicationInfoProvider} from '../../dist/wrappers/lambda/LambdaApplicationInfoProvider';
import Utils from '../../dist/plugins/utils/Utils';

ApplicationManager.setApplicationInfoProvider(new LambdaApplicationInfoProvider());

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

        const applicationInfo = ApplicationManager.getApplicationInfo();
        applicationInfo.applicationTags = Utils.getApplicationTags();

        expect(applicationInfo.applicationTags['tag1']).toBe(5);
        expect(applicationInfo.applicationTags['tag2']).toBe(true);
        expect(applicationInfo.applicationTags['tag3']).toBe(false);
        expect(applicationInfo.applicationTags['tag4']).toBe('test value');
        expect(applicationInfo.applicationTags['tag5']).toBe(3.5);
    });
});
