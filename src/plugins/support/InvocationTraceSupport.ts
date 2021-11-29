import ThundraLogger from '../../ThundraLogger';
import Resource from '../data/invocation/Resource';
import ThundraSpan from '../../opentracing/Span';
import { SpanTags } from '../../Constants';
import ExecutionContextManager from '../../context/ExecutionContextManager';
const flatten = require('lodash.flatten');

/**
 * Provides/supports API for invocation tracing related operations
 */
class InvocationTraceSupport {

    private static readonly MAX_INCOMING_TRACE_LINK: number = 50;
    private static readonly MAX_OUTGOING_TRACE_LINK: number = 50;

    private constructor() {
    }

    /**
     * Gets {@link Resource}s in the current invocation
     * @param {string} rootSpanId id of the root span
     * @return {Resource[]} the {@link Resource}s in the current invocation
     */
    static getResources(rootSpanId: string = ''): Resource[] {
        try {
            const { tracer } = ExecutionContextManager.get();

            if (!tracer) {
                return undefined;
            }

            const resourcesMap: Map<string, Resource> = new Map<string, Resource>();
            const spans = tracer.getSpanList().
                            filter((span: ThundraSpan) => span.getTag(SpanTags.TOPOLOGY_VERTEX)).
                            filter((span: ThundraSpan) => span.spanContext.spanId !== rootSpanId);

            for (const span of spans) {
                const resourceNames = span.getTag(SpanTags.RESOURCE_NAMES);
                if (resourceNames) {
                    for (const resourceName of resourceNames) {
                        const resourceId = InvocationTraceSupport.generateResourceIdFromSpan(span, resourceName);
                        if (resourceId) {
                            const resource = resourcesMap.get(resourceId);
                            const newResource = new Resource();
                            newResource.init(span);
                            newResource.resourceName = resourceName;
                            resource ? resource.merge(newResource) : resourcesMap.set(resourceId, newResource);
                        }
                    }
                } else {
                    const resourceId = InvocationTraceSupport.generateResourceIdFromSpan(span);
                    if (resourceId) {
                        const resource = resourcesMap.get(resourceId);
                        const newResource = new Resource();
                        newResource.init(span);
                        resource ? resource.merge(newResource) : resourcesMap.set(resourceId, newResource);
                    }
                }
            }

            return Array.from(resourcesMap.values());
        } catch (e) {
            ThundraLogger.error(
                `<InvocationTraceSupport> Error while creating the resources data for invocation:`, e);
        }
    }

    /**
     * Gets the active {@link ThundraSpan} for the current invocation
     * @return {ThundraSpan} the active {@link ThundraSpan} for the current invocation
     */
    static getActiveSpan(): ThundraSpan {
        const { tracer } = ExecutionContextManager.get();

        if (!tracer) {
            return undefined;
        }

        return tracer.getActiveSpan();
    }

    /**
     * Adds the incoming trace link for the invocation
     * @param {string} traceLink the incoming trace link to be added
     * @return {boolean} {@code true} if trace link has been added, {@code false} otherwise
     */
    static addIncomingTraceLink(traceLink: string): boolean {
        const { incomingTraceLinks } = ExecutionContextManager.get();
        if (incomingTraceLinks && incomingTraceLinks.length < this.MAX_INCOMING_TRACE_LINK) {
            incomingTraceLinks.push(traceLink);
            return true;
        }
        return false;
    }

    /**
     * Adds the incoming trace links for the invocation
     * @param {string[]} traceLinks the incoming trace links to be added
     * @return {boolean} {@code true} if trace link has been added, {@code false} otherwise
     */
    static addIncomingTraceLinks(traceLinks: string[]): boolean {
        const { incomingTraceLinks } = ExecutionContextManager.get();
        if (incomingTraceLinks && incomingTraceLinks.length + traceLinks.length <= this.MAX_INCOMING_TRACE_LINK) {
            incomingTraceLinks.push(...traceLinks);
            return true;
        }
        return false;
    }

    /**
     * Gets the incoming trace links for the invocation
     * @return {string[]} the incoming trace links
     */
    static getIncomingTraceLinks(): string[] {
        const { incomingTraceLinks } = ExecutionContextManager.get();
        if (!incomingTraceLinks) {
            return [];
        }
        return [...new Set(incomingTraceLinks)].filter((e) => e);
    }

    /**
     * Adds the outgoing trace link for the invocation
     * @param {string} traceLink the outgoing trace link to be added
     * @return {boolean} {@code true} if trace link has been added, {@code false} otherwise
     */
    static addOutgoingTraceLink(traceLink: string): boolean {
        const { outgoingTraceLinks } = ExecutionContextManager.get();
        if (outgoingTraceLinks && outgoingTraceLinks.length < this.MAX_OUTGOING_TRACE_LINK) {
            outgoingTraceLinks.push(traceLink);
            return true;
        }
        return false;
    }

    /**
     * Adds the outgoing trace links for the invocation
     * @param {string[]} traceLinks the outgoing trace links to be added
     * @return {boolean} {@code true} if trace link has been added, {@code false} otherwise
     */
    static addOutgoingTraceLinks(traceLinks: string[]): boolean {
        const { outgoingTraceLinks } = ExecutionContextManager.get();
        if (outgoingTraceLinks && outgoingTraceLinks.length + traceLinks.length <= this.MAX_OUTGOING_TRACE_LINK) {
            outgoingTraceLinks.push(...traceLinks);
            return true;
        }
        return false;
    }

    /**
     * Gets the outgoing trace links for the invocation
     * @return {string[]} the outgoing trace links
     */
    static getOutgoingTraceLinks(): string[] {
        const { tracer, outgoingTraceLinks } = ExecutionContextManager.get();

        if (!tracer) {
            return [];
        }

        try {
            const spans = tracer.getSpanList();
            let traceLinkCount: number = 0;
            const traceLinks = flatten(
                spans.
                    filter((span: ThundraSpan) => {
                        const tLinks: string[] = span.getTag(SpanTags.TRACE_LINKS);
                        if (tLinks) {
                            traceLinkCount += tLinks.length;
                        }
                        return tLinks && traceLinkCount <= this.MAX_OUTGOING_TRACE_LINK;
                    }).
                    map((span: ThundraSpan) => span.getTag(SpanTags.TRACE_LINKS)),
            );
            if (outgoingTraceLinks) {
                traceLinks.push(...outgoingTraceLinks);
            }
            return [...new Set<string>(traceLinks)];
        } catch (e) {
            ThundraLogger.error(
                `<InvocationTraceSupport> Error while getting the outgoing trace links for invocation:`, e);
        }
    }

    private static generateResourceIdFromSpan(span: ThundraSpan, resourceName?: string): string {
        if (span.className && span.operationName) {
            if (!resourceName) {
                resourceName = span.operationName;
            }
            let id = `${span.className.toUpperCase()}\$${resourceName}`;
            if (span.getTag(SpanTags.OPERATION_TYPE)) {
                id = id + `\$${span.getTag(SpanTags.OPERATION_TYPE)}`;
            }
            return id;
        }
    }

}

export default InvocationTraceSupport;
