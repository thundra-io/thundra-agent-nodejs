import ThundraLogger from '../../ThundraLogger';
import Resource from '../data/invocation/Resource';
import ThundraTracer from '../../opentracing/Tracer';
import ThundraSpan from '../../opentracing/Span';
import { SpanTags } from '../../Constants';
const flatten = require('lodash.flatten');

class InvocationTraceSupport {
    static tracer: ThundraTracer;
    static incomingTraceLinks: any[] = [];
    static outgoingTraceLinks: any[] = [];

    static getResources(rootSpanId: string = ''): Resource[] {
        try {
            const tracer = InvocationTraceSupport.tracer;
            if (!tracer) {
                return undefined;
            }

            const resourcesMap: Map<string, Resource> = new Map<string, Resource>();
            const spans = tracer.recorder.getSpanList().
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
            ThundraLogger.getInstance().error(
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
        InvocationTraceSupport.incomingTraceLinks.push(traceLink);
    }

    static addIncomingTraceLinks(traceLinks: any[]): void {
        InvocationTraceSupport.incomingTraceLinks.push(...traceLinks);
    }

    static getIncomingTraceLinks(): any[] {
        return [...new Set(InvocationTraceSupport.incomingTraceLinks)].filter((e) => e);
    }

    static addOutgoingTraceLink(traceLink: string): void {
        InvocationTraceSupport.outgoingTraceLinks.push(traceLink);
    }

    static addOutgoingTraceLinks(traceLinks: any[]): void {
        InvocationTraceSupport.outgoingTraceLinks.push(...traceLinks);
    }

    static getOutgoingTraceLinks(): any[] {
        const tracer = InvocationTraceSupport.tracer;

        if (!tracer) {
            return undefined;
        }

        try {
            const spans = tracer.recorder.getSpanList();
            const outgoingTraceLinks = flatten(
                spans.filter((span: ThundraSpan) => span.getTag(SpanTags.TRACE_LINKS))
                    .map((span: ThundraSpan) => span.getTag(SpanTags.TRACE_LINKS)),
            );
            outgoingTraceLinks.push(...InvocationTraceSupport.outgoingTraceLinks);
            return [...new Set(outgoingTraceLinks)];
        } catch (e) {
            ThundraLogger.getInstance().error(
                `Error while getting the outgoing trace links for invocation. ${e}`);
        }
    }

    static clear(): void {
        InvocationTraceSupport.incomingTraceLinks = [];
        InvocationTraceSupport.outgoingTraceLinks = [];
    }
}

export default InvocationTraceSupport;
