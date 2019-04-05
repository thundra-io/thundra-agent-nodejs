import ThundraLogger from '../../ThundraLogger';
import Resource from '../data/invocation/Resource';
import ThundraTracer from '../../opentracing/Tracer';
import ThundraSpan from '../../opentracing/Span';
import { SpanTags } from '../../Constants';
const _ = require('lodash');

class InvocationTraceSupport {
    static incomingTraceLinks: any[] = [];
    static getResources(rootSpanId: string = ''): Resource[] {
        try {
            if (!ThundraTracer.getInstance()) {
                return undefined;
            }

            const resourcesMap: Map<string, Resource> = new Map<string, Resource>();
            const spans = ThundraTracer.getInstance().recorder.getSpanList().
                            filter((span: ThundraSpan) => span.getTag(SpanTags.TOPOLOGY_VERTEX)).
                            filter((span: ThundraSpan) => span.spanContext.spanId !== rootSpanId);

            for (const span of spans) {
                const resourceId = InvocationTraceSupport.generateResourceIdFromSpan(span);
                if (resourceId) {
                    const resource = resourcesMap.get(resourceId);
                    const newResource = new Resource();
                    newResource.init(span);
                    resource ? resource.merge(newResource) : resourcesMap.set(resourceId, newResource);
                }
            }

            return Array.from(resourcesMap.values());
        } catch (e) {
            ThundraLogger.getInstance().error(
                `Error while creating the resources data for invocation. ${e}`);
        }
    }

    static generateResourceIdFromSpan(span: ThundraSpan): string {
        if (span.className && span.operationName) {
            let id = `${span.className.toUpperCase()}\$${span.operationName}`;
            if (span.getTag(SpanTags.OPERATION_TYPE)) {
                id = id + `\$${span.getTag(SpanTags.OPERATION_TYPE)}`;
            }
            return id;
        }
    }

    static addIncomingTraceLinks(traceLinks: any[]): void {
        InvocationTraceSupport.incomingTraceLinks.push(...traceLinks);
    }

    static getIncomingTraceLinks(): any[] {
        return [...new Set(InvocationTraceSupport.incomingTraceLinks)].filter((e) => e);
    }

    static getOutgoingTraceLinks(): any[] {
        if (!ThundraTracer.getInstance()) {
            return undefined;
        }

        try {
            const spans = ThundraTracer.getInstance().recorder.getSpanList();
            const outgoingTraceLinks = _.flatten(
                spans.filter((span: ThundraSpan) => span.getTag(SpanTags.TRACE_LINKS))
                    .map((span: ThundraSpan) => span.getTag(SpanTags.TRACE_LINKS)),
            );

            return [...new Set(outgoingTraceLinks)];
        } catch (e) {
            ThundraLogger.getInstance().error(
                `Error while getting the outgoing trace links for invocation. ${e}`);
        }
    }

    static clear(): void {
        InvocationTraceSupport.incomingTraceLinks = [];
    }
}

export default InvocationTraceSupport;
