import ThundraLogger from '../../ThundraLogger';
import ConfigNames from '../../config/ConfigNames';
import ConfigProvider from '../../config/ConfigProvider';

class ApplicationSupport {
    static applicationTags: any = {};

    static parseApplicationTags(): void {
        ApplicationSupport.applicationTags = {};
        for (const key of ConfigProvider.names()) {
            if (key.startsWith(ConfigNames.THUNDRA_APPLICATION_TAG_PREFIX)) {
                try {
                    const propsKey = key.substring(ConfigNames.THUNDRA_APPLICATION_TAG_PREFIX.length);
                    const propsValue = ConfigProvider.get<any>(key);
                    if (isNaN(parseFloat(propsValue))) {
                        if (propsValue === 'true' || propsValue === 'false') {
                            ApplicationSupport.applicationTags[propsKey] = propsValue === 'true' ? true : false;
                        } else {
                            ApplicationSupport.applicationTags[propsKey] = propsValue;
                        }
                    } else {
                        ApplicationSupport.applicationTags[propsKey] = parseFloat(propsValue);
                    }
                } catch (ex) {
                    ThundraLogger.error(`Cannot parse application tag ${key}`);
                }
            }
        }
    }
}

export default ApplicationSupport;
