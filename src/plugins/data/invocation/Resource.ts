import ThundraSpan from '../../../opentracing/Span';
import { SpanTags } from '../../../Constants';

class Resource {
    resourceType: string;
    resourceName: string;
    resourceOperation: string;
    resourceCount: number;
    resourceErrorCount: number;
    resourceErrors: string[];
    resourceDuration: number;

    constructor(opt: any = {}) {
        this.resourceType = opt.resourceType;
        this.resourceName = opt.resourceOperation;
        this.resourceOperation = opt.resourceOperation;
        this.resourceCount = opt.resourceCount;
        this.resourceErrorCount = opt.resourceErrorCount;
        this.resourceErrors = opt.resourceErrors ? opt.resourceErrors : [];
        this.resourceDuration = opt.resourceDuration;
    }

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
    }

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
        }
    }

    public generateId(): string {
        return `${this.resourceType.toUpperCase()}\$${this.resourceName}\$${this.resourceOperation}`;
    }
}

export default Resource;
