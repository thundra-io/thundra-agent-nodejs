import ThundraLogger from '../../ThundraLogger';

class InvocationSupport {
    static tags: any = {};
    static userTags: any = {};
    static functionName: string = '';
    static errorenous: boolean;

    static setAgentTag(key: string, value: any): void {
        try {
            InvocationSupport.tags[key] = value;
        } catch (e) {
            ThundraLogger.getInstance().error(e);
        }
    }

    static getAgentTag(key: string): any {
        return InvocationSupport.tags[key];
    }

    static setAgentTags(keyValuePairs: {[key: string]: any }): void {
        try {
            Object.keys(keyValuePairs).forEach((key) => {
                InvocationSupport.tags[key] = keyValuePairs[key];
            });
        } catch (e) {
            ThundraLogger.getInstance().error(e);
        }
    }

    static removeAgentTags(): void {
        InvocationSupport.tags = {};
    }

    static setTag(key: string, value: any): void {
        try {
            InvocationSupport.userTags[key] = value;
        } catch (e) {
            ThundraLogger.getInstance().error(e);
        }
    }

    static getTag(key: string): any {
        return InvocationSupport.userTags[key];
    }

    static setTags(keyValuePairs: {[key: string]: any }): void {
        try {
            Object.keys(keyValuePairs).forEach((key) => {
                InvocationSupport.userTags[key] = keyValuePairs[key];
            });
        } catch (e) {
            ThundraLogger.getInstance().error(e);
        }
    }

    static removeTags(): void {
        InvocationSupport.userTags = {};
    }

    static setFunctionName(functionName: string): void {
        InvocationSupport.functionName = functionName;
    }

    static getFunctionName(): string {
        return InvocationSupport.functionName;
    }

    static setErrorenous(errorenous: boolean): void {
        InvocationSupport.errorenous = errorenous;
    }

    static isErrorenous(): boolean {
        return InvocationSupport.errorenous;
    }
}

export default InvocationSupport;
