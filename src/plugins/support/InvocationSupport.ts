import ThundraLogger from '../../ThundraLogger';

class InvocationSupport {
    static tags: any = {};

    static setTag(key: string, value: any): void {
        try {
            InvocationSupport.tags[key] = value;
        } catch (e) {
            ThundraLogger.getInstance().error(e);
        }
    }

    static getTag(key: string): any {
        return InvocationSupport.tags[key];
    }

    static setTags(keyValuePairs: {[key: string]: any }): void {
        try {
            Object.keys(keyValuePairs).forEach((key) => {
                InvocationSupport.tags[key] = keyValuePairs[key];
            });
        } catch (e) {
            ThundraLogger.getInstance().error(e);
        }
    }

    static removeTags(): void {
        InvocationSupport.tags = {};
    }
}

export default InvocationSupport;
