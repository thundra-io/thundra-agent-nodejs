import ThundraLogger from '../../ThundraLogger';
import Utils from '../utils/Utils';
import * as contextManager from '../../context/contextManager';

class InvocationSupport {
    static functionName: string = '';

    static setAgentTag(key: string, value: any): void {
        const { tags } = contextManager.get();
        try {
            tags[key] = value;
        } catch (e) {
            ThundraLogger.error(e);
        }
    }

    static getAgentTag(key: string): any {
        const { tags } = contextManager.get();

        return tags[key];
    }

    static getAgentTags(): any {
        const { tags } = contextManager.get();

        return tags;
    }

    static setAgentTags(keyValuePairs: {[key: string]: any }): void {
        const { tags } = contextManager.get();

        try {
            Object.keys(keyValuePairs).forEach((key) => {
                tags[key] = keyValuePairs[key];
            });
        } catch (e) {
            ThundraLogger.error(e);
        }
    }

    static removeAgentTags(): void {
        // pass
    }

    static setTag(key: string, value: any): void {
        const { userTags } = contextManager.get();

        try {
            userTags[key] = value;
        } catch (e) {
            ThundraLogger.error(e);
        }
    }

    static getTag(key: string): any {
        const { userTags } = contextManager.get();

        return userTags[key];
    }

    static getTags() {
        const { userTags } = contextManager.get();

        return userTags;
    }

    static removeTag(key: string): void {
        const { userTags } = contextManager.get();

        try {
            if (userTags[key]) {
                delete userTags[key];
            }
        } catch (e) {
            ThundraLogger.error(e);
        }
    }

    static setTags(keyValuePairs: {[key: string]: any }): void {
        const { userTags } = contextManager.get();

        try {
            Object.keys(keyValuePairs).forEach((key) => {
                userTags[key] = keyValuePairs[key];
            });
        } catch (e) {
            ThundraLogger.error(e);
        }
    }

    static removeTags(): void {
        // pass
    }

    static setFunctionName(functionName: string): void {
        InvocationSupport.functionName = functionName;
    }

    static getFunctionName(): string {
        return InvocationSupport.functionName;
    }

    static isErrorenous(): boolean {
        const { error } = contextManager.get();

        return error ? true : false;
    }

    static setError(exception: any): void {
        if (exception instanceof Error) {
            const execContext = contextManager.get();
            execContext.error = exception;
        }
    }

    static hasError(): boolean {
        return InvocationSupport.isErrorenous();
    }

    static clearError(): void {
        const execContext = contextManager.get();

        execContext.error = null;
    }

}

export default InvocationSupport;
