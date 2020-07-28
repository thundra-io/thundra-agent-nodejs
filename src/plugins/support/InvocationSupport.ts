import ThundraLogger from '../../ThundraLogger';
import ExecutionContextManager from '../../context/ExecutionContextManager';

class InvocationSupport {
    static setAgentTag(key: string, value: any): void {
        const { tags } = ExecutionContextManager.get();
        try {
            tags[key] = value;
        } catch (e) {
            ThundraLogger.error(e);
        }
    }

    static getAgentTag(key: string): any {
        const { tags } = ExecutionContextManager.get();

        return tags[key];
    }

    static getAgentTags(): any {
        const { tags } = ExecutionContextManager.get();

        return tags;
    }

    static setAgentTags(keyValuePairs: {[key: string]: any }): void {
        const { tags } = ExecutionContextManager.get();

        try {
            Object.keys(keyValuePairs).forEach((key) => {
                tags[key] = keyValuePairs[key];
            });
        } catch (e) {
            ThundraLogger.error(e);
        }
    }

    static removeAgentTags(): void {
        const execContext = ExecutionContextManager.get();
        execContext.tags = {};
    }

    static setTag(key: string, value: any): void {
        const { userTags } = ExecutionContextManager.get();

        try {
            userTags[key] = value;
        } catch (e) {
            ThundraLogger.error(e);
        }
    }

    static getTag(key: string): any {
        const { userTags } = ExecutionContextManager.get();

        return userTags[key];
    }

    static getTags() {
        const { userTags } = ExecutionContextManager.get();

        return userTags;
    }

    static removeTag(key: string): void {
        const { userTags } = ExecutionContextManager.get();

        try {
            if (userTags[key]) {
                delete userTags[key];
            }
        } catch (e) {
            ThundraLogger.error(e);
        }
    }

    static setTags(keyValuePairs: {[key: string]: any }): void {
        const { userTags } = ExecutionContextManager.get();

        try {
            Object.keys(keyValuePairs).forEach((key) => {
                userTags[key] = keyValuePairs[key];
            });
        } catch (e) {
            ThundraLogger.error(e);
        }
    }

    static removeTags(): void {
        const execContext = ExecutionContextManager.get();
        execContext.userTags = {};
    }

    static hasError(): boolean {
        const { error, userError } = ExecutionContextManager.get();

        return (error || userError) ? true : false;
    }

    static setError(error: any): void {
        if (error instanceof Error) {
            const execContext = ExecutionContextManager.get();
            execContext.userError = error;
        }
    }

    static getError(): Error {
        const execContext = ExecutionContextManager.get();
        return execContext.userError;
    }

    static clearError(): void {
        const execContext = ExecutionContextManager.get();
        execContext.userError = null;
    }

}

export default InvocationSupport;
