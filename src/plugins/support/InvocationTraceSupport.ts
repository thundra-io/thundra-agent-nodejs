import ThundraLogger from '../../ThundraLogger';
import Resource from '../data/invocation/Resource';
import ThundraSpan from '../../opentracing/Span';
import { SpanTags } from '../../Constants';
import ExecutionContextManager from '../../context/ExecutionContextManager';
const flatten = require('lodash.flatten');

class InvocationTraceSupport {

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
                `Error while creating the resources data for invocation. ${e}`);
        }
    }

    static generateResourceIdFromSpan(span: ThundraSpan, resourceName?: string): string {
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

    static addIncomingTraceLink(traceLink: string): void {
        const { incomingTraceLinks } = ExecutionContextManager.get();
        if (incomingTraceLinks) {
            incomingTraceLinks.push(traceLink);
        }
    }

    static addIncomingTraceLinks(traceLinks: any[]): void {
        const { incomingTraceLinks } = ExecutionContextManager.get();
        if (incomingTraceLinks) {
            incomingTraceLinks.push(...traceLinks);
        }
    }

    static getIncomingTraceLinks(): any[] {
        const { incomingTraceLinks } = ExecutionContextManager.get();
        if (!incomingTraceLinks) {
            return [];
        }
        return [...new Set(incomingTraceLinks)].filter((e) => e);
    }

    static addOutgoingTraceLink(traceLink: string): void {
        const { outgoingTraceLinks } = ExecutionContextManager.get();
        if (outgoingTraceLinks) {
            outgoingTraceLinks.push(traceLink);
        }
    }

    static addOutgoingTraceLinks(traceLinks: any[]): void {
        const { outgoingTraceLinks } = ExecutionContextManager.get();
        if (outgoingTraceLinks) {
            outgoingTraceLinks.push(...traceLinks);
        }
    }

    static getActiveSpan(): ThundraSpan {
        const { tracer } = ExecutionContextManager.get();

        if (!tracer) {
            return undefined;
        }

        return tracer.getActiveSpan();
    }

    static getOutgoingTraceLinks(): any[] {
        const { tracer, outgoingTraceLinks } = ExecutionContextManager.get();

        if (!tracer) {
            return [];
        }

        try {
            const spans = tracer.getSpanList();
            const traceLinks = flatten(
                spans.filter((span: ThundraSpan) => span.getTag(SpanTags.TRACE_LINKS))
                    .map((span: ThundraSpan) => span.getTag(SpanTags.TRACE_LINKS)),
            );
            if (outgoingTraceLinks) {
                traceLinks.push(...outgoingTraceLinks);
            }
            return [...new Set(traceLinks)];
        } catch (e) {
            ThundraLogger.error(
                `Error while getting the outgoing trace links for invocation. ${e}`);
        }
    }

    static clear(): void {
        // pass
    }

}

export default InvocationTraceSupport;
