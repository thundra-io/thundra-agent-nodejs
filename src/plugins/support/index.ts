/**
 * Module entry point for publicly supported APIs
 */

import InvocationSupport from './InvocationSupport';
import InvocationTraceSupport from './InvocationTraceSupport';

export default {

    /**
     * Sets the tag
     * @param {string} name the tag name
     * @param value the tag value
     */
    setTag(name: string, value: any): void {
        InvocationSupport.setTag(name, value);
        return null;
    },

    /**
     * Sets the tags
     * @param tags the tags to be set
     */
    setTags(tags: {[key: string]: any }): void {
        InvocationSupport.setTags(tags);
    },

    /**
     * Gets the tag
     * @param {string} name the tag name
     * @return the tag value
     */
    getTag(name: string): any {
        return InvocationSupport.getTag(name);
    },

    /**
     * Gets the tags
     * @return the tags
     */
    getTags(): any {
        return InvocationSupport.getTags();
    },

    /**
     * Removes the tag
     * @param {string} name the tag name
     */
    removeTag(key: string): void {
        InvocationSupport.removeTag(key);
    },

    /**
     * Removes the tags
     */
    removeTags(): void {
        InvocationSupport.removeTags();
    },

    /**
     * Checks whether invocation has error
     * @return {boolean} {@code true} if invocation has error, {@code false} otherwise
     */
    hasError(): boolean {
        return InvocationSupport.hasError();
    },

    /**
     * Sets the {@link Error} to the invocation
     * @param {Error} error the {@link Error} to be set
     */
    setError(error: Error): void {
        InvocationSupport.setError(error);
    },

    /**
     * Gets the {@link Error} to the invocation
     * @return {Error} the {@link Error} of the invocation
     */
    getError(): Error {
        return InvocationSupport.getError();
    },

    /**
     * Clears the invocation error
     */
    clearError(): void {
        InvocationSupport.clearError();
    },

    /**
     * Adds the incoming trace link for the invocation
     * @param {string} traceLink the incoming trace link to be added
     */
    addIncomingTraceLink(traceLink: string): void {
        InvocationTraceSupport.addIncomingTraceLink(traceLink);
    },

    /**
     * Adds the incoming trace links for the invocation
     * @param {string[]} traceLinks the incoming trace links to be added
     */
    addIncomingTraceLinks(traceLinks: string[]): void {
        InvocationTraceSupport.addIncomingTraceLinks(traceLinks);
    },

    /**
     * Adds the outgoing trace link for the invocation
     * @param {string} traceLink the outgoing trace link to be added
     */
    addOutgoingTraceLink(traceLink: string): void {
        InvocationTraceSupport.addOutgoingTraceLink(traceLink);
    },

    /**
     * Adds the outgoing trace links for the invocation
     * @param {string[]} traceLinks the outgoing trace links to be added
     */
    addOutgoingTraceLinks(traceLinks: string[]): void {
        InvocationTraceSupport.addOutgoingTraceLinks(traceLinks);
    },

};
