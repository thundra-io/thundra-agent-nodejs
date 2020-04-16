import { envVariableKeys } from '../../Constants';

import ThundraLogger from '../../ThundraLogger';

class ApplicationSupport {
    static applicationTags: any = {};

    static parseApplicationTags(): void {
        ApplicationSupport.applicationTags = {};
        for (const key of Object.keys(process.env)) {
            if (key.toLowerCase().startsWith(envVariableKeys.THUNDRA_APPLICATION_TAG_PROP_NAME_PREFIX)) {
                try {
                    const propsKey = key.substring(envVariableKeys.THUNDRA_APPLICATION_TAG_PROP_NAME_PREFIX.length)
                        .replace(/_/g, '.');
                    const propsValue = process.env[key];
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
                    ThundraLogger.getInstance().error(`Cannot parse application tag ${key}`);
                }
            }
        }
    }
}

export default ApplicationSupport;
