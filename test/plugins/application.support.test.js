
import ApplicationSupport from '../../dist/plugins/support/ApplicationSupport';

describe('addApplicationTags', () => {
    const THUNDRA_APPLICATION_TAG_PROP_NAME_PREFIX = 'thundra_agent_lambda_application_tag_';
    process.env[THUNDRA_APPLICATION_TAG_PROP_NAME_PREFIX + 'tag1'] = '5';
    process.env[THUNDRA_APPLICATION_TAG_PROP_NAME_PREFIX + 'tag2'] = 'true';
    process.env[THUNDRA_APPLICATION_TAG_PROP_NAME_PREFIX + 'tag3'] = 'false';
    process.env[THUNDRA_APPLICATION_TAG_PROP_NAME_PREFIX + 'tag4'] = 'test value';
    process.env[THUNDRA_APPLICATION_TAG_PROP_NAME_PREFIX + 'tag5'] = '3.5';

    ApplicationSupport.parseApplicationTags();

    it('should parse application tags from environment variables', () => {
        expect(ApplicationSupport.applicationTags['tag1']).toBe(5);
        expect(ApplicationSupport.applicationTags['tag2']).toBe(true);
        expect(ApplicationSupport.applicationTags['tag3']).toBe(false);
        expect(ApplicationSupport.applicationTags['tag4']).toBe('test value');
        expect(ApplicationSupport.applicationTags['tag5']).toBe(3.5);
    });

    process.env[THUNDRA_APPLICATION_TAG_PROP_NAME_PREFIX + 'tag1'] = null;
    process.env[THUNDRA_APPLICATION_TAG_PROP_NAME_PREFIX + 'tag2'] = null;
    process.env[THUNDRA_APPLICATION_TAG_PROP_NAME_PREFIX + 'tag3'] = null;
    process.env[THUNDRA_APPLICATION_TAG_PROP_NAME_PREFIX + 'tag4'] = null;
    process.env[THUNDRA_APPLICATION_TAG_PROP_NAME_PREFIX + 'tag5'] = null;
});