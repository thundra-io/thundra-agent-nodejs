import ThundraSpan from '../../../opentracing/Span';
import { SpanTags, SecurityTags } from '../../../Constants';

/**
 * Represents resource (for ex. database query, API request, AWS service call, etc ...) with its metrics
 */
class Resource {

    resourceType: string;
    resourceName: string;
    resourceOperation: string;
    resourceCount: number;
    resourceErrorCount: number;
    resourceErrors: string[];
    resourceDuration: number;
    resourceMaxDuration: number;
    resourceAvgDuration: number;
    resourceBlockedCount: number;
    resourceViolatedCount: number;

    constructor(opt: any = {}) {
        this.resourceType = opt.resourceType;
        this.resourceName = opt.resourceOperation;
        this.resourceOperation = opt.resourceOperation;
        this.resourceCount = opt.resourceCount;
        this.resourceErrorCount = opt.resourceErrorCount;
        this.resourceErrors = opt.resourceErrors ? opt.resourceErrors : [];
        this.resourceDuration = opt.resourceDuration;
        this.resourceMaxDuration = opt.resourceMaxDuration;
        this.resourceAvgDuration = opt.resourceAvgDuration;
        this.resourceBlockedCount = opt.resourceBlockedCount || 0;
        this.resourceViolatedCount = opt.resourceViolatedCount || 0;
    }

    /**
     * Initializes from given {@link ThundraSpan}
     * @param {ThundraSpan} span the {@link ThundraSpan} to be initialized from
     */
    public init(span: ThundraSpan) {
        this.resourceType = span.className;
        this.resourceName = span.operationName;
        this.resourceOperation = span.getTag(SpanTags.OPERATION_TYPE);
        this.resourceCount = 1;
        this.resourceErrorCount = span.getTag('error') ? 1 : 0;
        if (span.getTag('error.kind') &&
            this.resourceErrors.indexOf(span.getTag('error.kind')) === -1) {

            this.resourceErrors.push(span.getTag('error.kind'));
        }
        this.resourceDuration = span.getDuration();
        this.resourceMaxDuration = span.getDuration();
        this.resourceAvgDuration = span.getDuration();
        this.resourceBlockedCount = span.getTag(SecurityTags.BLOCKED) ? 1 : 0;
        this.resourceViolatedCount = span.getTag(SecurityTags.VIOLATED) ? 1 : 0;
    }

    /**
     * Merges itself with given {@link Resource}
     * @param {Resource} resource the {@link Resource} to be merged into this one
     */
    public merge(resource: Resource): void {
        if (this.resourceType === resource.resourceType &&
            this.resourceName === resource.resourceName &&
            this.resourceOperation === resource.resourceOperation
        ) {

            this.resourceCount += resource.resourceCount;
            this.resourceErrorCount += resource.resourceErrorCount;
            if (resource.resourceErrors) {
                resource.resourceErrors.forEach((error: string) => {
                    if (error && this.resourceErrors.indexOf(error) === -1) {
                        this.resourceErrors.push(error);
                    }
                });
            }
            this.resourceDuration += resource.resourceDuration;
            this.resourceAvgDuration = Math.round(this.resourceDuration / this.resourceCount * 100) / 100;
            if (resource.resourceMaxDuration > this.resourceMaxDuration) {
                this.resourceMaxDuration = resource.resourceMaxDuration;
            }
            this.resourceBlockedCount += resource.resourceBlockedCount;
            this.resourceViolatedCount += resource.resourceViolatedCount;
        }
    }

    /**
     * Generates id of the resource
     * @return {string} generated id of the resource
     */
    public generateId(): string {
        return `${this.resourceType.toUpperCase()}\$${this.resourceName}\$${this.resourceOperation}`;
    }

}

export default Resource;
