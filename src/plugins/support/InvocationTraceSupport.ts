import ThundraLogger from '../../ThundraLogger';
import Resource from '../data/invocation/Resource';
import ThundraTracer from '../../opentracing/Tracer';
import ThundraSpan from '../../opentracing/Span';
import { SpanTags } from '../../Constants';

class InvocationTraceSupport {

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
}

export default InvocationTraceSupport;
