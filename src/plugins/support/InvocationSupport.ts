import ThundraLogger from '../../ThundraLogger';
import ExecutionContextManager from '../../context/ExecutionContextManager';
import { ApplicationManager } from '../../application/ApplicationManager';

/**
 * Provides/supports API for invocation related operations
 */
class InvocationSupport {

    private constructor() {
    }

    /**
     * Sets the agent tag
     * @param {string} name the agent tag name
     * @param value the agent tag value
     */
    static setAgentTag(name: string, value: any): void {
        const { tags } = ExecutionContextManager.get();
        if (tags) {
            try {
                tags[name] = value;
            } catch (e) {
                ThundraLogger.error(`<InvocationSupport> Error occurred while setting agent tag ${name}=${value}:`, e);
            }
        }
    }

    /**
     * Sets the agent tags
     * @param tags the agent tags to be set
     */
    static setAgentTags(tagsToSet: {[name: string]: any }): void {
        const { tags } = ExecutionContextManager.get();
        if (tags) {
            try {
                Object.keys(tagsToSet).forEach((name) => {
                    tags[name] = tagsToSet[name];
                });
            } catch (e) {
                ThundraLogger.error(`<InvocationSupport> Error occurred while setting agent tags ${tagsToSet}:`, e);
            }
        }
    }

    /**
     * Gets the agent tag
     * @param {string} name the agent tag name
     * @return the tag value
     */
    static getAgentTag(name: string): any {
        const { tags } = ExecutionContextManager.get();
        if (tags) {
            return tags[name];
        } else {
            return null;
        }
    }

    /**
     * Gets the agent tags
     * @return the agent tags
     */
    static getAgentTags(): any {
        const { tags } = ExecutionContextManager.get();

        return tags;
    }

    /**
     * Removes the agent tag
     * @param {string} name the agent tag name
     */
    static removeAgentTag(name: string): void {
        const { tags } = ExecutionContextManager.get();
        if (tags) {
            try {
                if (tags[name]) {
                    delete tags[name];
                }
            } catch (e) {
                ThundraLogger.error(`<InvocationSupport> Error occurred while removing agent tag ${name}:`, e);
            }
        }
    }

    /**
     * Removes the agent tags
     */
    static removeAgentTags(): void {
        const execContext = ExecutionContextManager.get();
        if (execContext) {
            execContext.tags = {};
        }
    }

    /**
     * Sets the tag
     * @param {string} name the tag name
     * @param value the tag value
     */
    static setTag(name: string, value: any): void {
        const { userTags } = ExecutionContextManager.get();
        if (userTags) {
            try {
                userTags[name] = value;
            } catch (e) {
                ThundraLogger.error(`<InvocationSupport> Error occurred while setting tag ${name}=${value}:`, e);
            }
        }
    }

    /**
     * Sets the tags
     * @param tags the tags to be set
     */
    static setTags(tagsToSet: {[name: string]: any }): void {
        const { userTags } = ExecutionContextManager.get();
        if (userTags) {
            try {
                Object.keys(tagsToSet).forEach((name) => {
                    userTags[name] = tagsToSet[name];
                });
            } catch (e) {
                ThundraLogger.error(`<InvocationSupport> Error occurred while setting tags ${tagsToSet}:`, e);
            }
        }
    }

    /**
     * Gets the tag
     * @param {string} name the tag name
     * @return the tag value
     */
    static getTag(name: string): any {
        const { userTags } = ExecutionContextManager.get();
        if (userTags) {
            return userTags[name];
        } else {
            return null;
        }
    }

    /**
     * Gets the tags
     * @return the tags
     */
    static getTags() {
        const { userTags } = ExecutionContextManager.get();

        return userTags;
    }

    /**
     * Removes the tag
     * @param {string} name the tag name
     */
    static removeTag(name: string): void {
        const { userTags } = ExecutionContextManager.get();
        if (userTags) {
            try {
                if (userTags[name]) {
                    delete userTags[name];
                }
            } catch (e) {
                ThundraLogger.error(`<InvocationSupport> Error occurred while removing tag ${name}:`, e);
            }
        }
    }

    /**
     * Removes the tags
     */
    static removeTags(): void {
        const execContext = ExecutionContextManager.get();
        if (execContext) {
            execContext.userTags = {};
        }
    }

    /**
     * Checks whether invocation has error
     * @return {boolean} {@code true} if invocation has error, {@code false} otherwise
     */
    static hasError(): boolean {
        const { error, userError } = ExecutionContextManager.get();

        return (error || userError) ? true : false;
    }

    /**
     * Sets the {@link Error} to the invocation
     * @param {Error} error the {@link Error} to be set
     */
    static setError(error: any): void {
        if (error instanceof Error) {
            const execContext = ExecutionContextManager.get();
            if (execContext) {
                execContext.userError = error;
            }
        } else {
            ThundraLogger.debug(
                '<InvocationSupport> Skipped setting invocation error as it is not an instance of Error:', error);
        }
    }

    /**
     * Gets the {@link Error} to the invocation
     * @return {Error} the {@link Error} of the invocation
     */
    static getError(): Error {
        const execContext = ExecutionContextManager.get();
        if (execContext) {
            return execContext.userError;
        }
    }

    /**
     * Clears the invocation error
     */
    static clearError(): void {
        const execContext = ExecutionContextManager.get();
        if (execContext) {
            execContext.userError = null;
        }
    }

    /**
     * Gets the invocation URL on Thundra Console
     * @return {string} the invocation URL on Thundra Console
     */
    static getConsoleInvocationURL(): string {
        const applicationInfo = ApplicationManager.getApplicationInfo();
        const execContext = ExecutionContextManager.get();
        if (applicationInfo && applicationInfo.applicationId
            && execContext && execContext.transactionId) {
            return encodeURI(
                `https://apm.thundra.io/functions/${applicationInfo.applicationId}/${execContext.transactionId}/trace-chart`);
        }
        return null;
    }

}

export default InvocationSupport;
