import ThundraSpanListener from './ThundraSpanListener';
import ThundraSpan from '../../opentracing/Span';
import ThundraLogger from '../../ThundraLogger';
import {AwsXrayConstants } from '../../Constants';

let AWSXRay: any;
let Subsegment: any;
try {
    AWSXRay = require('aws-xray-sdk-core');
    Subsegment = AWSXRay.Subsegment;
// tslint:disable-next-line:no-empty
} catch (err) {}

class AwsXRayThundraSpanListener  implements ThundraSpanListener {
    subsegmentMap: Map<string, any>;
    pluginContext: any;

    constructor(pluginContext: any) {
        this.pluginContext = pluginContext;
        this.subsegmentMap = new Map<string, any>();
    }

    onSpanStarted(span: ThundraSpan): void {
        try {
            if (!AWSXRay) {
                ThundraLogger.getInstance().error('XRay plugin is enabled but cannot load module aws-xray-sdk-core.');
                return;
            }
            const operationName = this.normalizeOperationName(span.getOperationName());
            span.setTag(AwsXrayConstants.XRAY_SUBSEGMENTED_TAG_NAME, true);

            const segment = AWSXRay.getSegment();
            const subsegment = new Subsegment(operationName);
            this.subsegmentMap.set(span.spanContext.spanId, subsegment);
            segment.addSubsegment(subsegment);
        } catch (err) {
            ThundraLogger.getInstance().error('Error occurred while beginning XRay sub-segment for span ' + err);
        }
    }

    onSpanFinished(span: ThundraSpan): void {
        try {
            if (!AWSXRay) {
                ThundraLogger.getInstance().error('XRay plugin is enabled but cannot load module aws-xray-sdk-core.');
                return;
            }
            if (span.getTag(AwsXrayConstants.XRAY_SUBSEGMENTED_TAG_NAME)) {
                const subsegment = this.subsegmentMap.get(span.spanContext.spanId);
                if (subsegment) {
                    this.addToAnnotations(span, subsegment);
                    this.addToErrors(span, subsegment);
                    this.addToMetadatas(span, subsegment);
                    subsegment.close();
                }
            }
        } catch (err) {
            ThundraLogger.getInstance().error('Error occurred while ending XRay sub-segment for span ' + err);
        }
    }

    onDestroy(): void {
        this.subsegmentMap.clear();
    }

    normalizeAnnotationName(annotationName: string): string {
        annotationName = annotationName.replace(/[\W]+/g, '');
        annotationName = annotationName.substring(0, 500);
        return annotationName;
    }

    normalizeOperationName(operationName: string): string {
        return operationName ? operationName.substring(0, 200) : AwsXrayConstants.DEFAULT_OPERATION_NAME;
    }

    normalizeAnnotationValue(annotationValue: string): string {
        if (typeof annotationValue === 'string') {
            annotationValue = annotationValue.substring(0, 1000);
        }
        return annotationValue;
    }

    addToAnnotations(span: ThundraSpan, subsegment: any): void {
        this.putAnnotationIfAvailable(subsegment, 'traceId', this.pluginContext.traceId);
        this.putAnnotationIfAvailable(subsegment, 'transactionId', this.pluginContext.transactionId);
        this.putAnnotationIfAvailable(subsegment, 'parentSpanId', span.spanContext.parentId);
        this.putAnnotationIfAvailable(subsegment, 'spanId', span.spanContext.spanId);

        this.putAnnotationIfAvailable(subsegment, 'domainName', span.domainName);
        this.putAnnotationIfAvailable(subsegment, 'className', span.className);
        this.putAnnotationIfAvailable(subsegment, 'operationName', span.getOperationName());
        this.putAnnotationIfAvailable(subsegment, 'startTimestamp', span.startTime);
        this.putAnnotationIfAvailable(subsegment, 'finishTimestamp', span.finishTime);
        this.putAnnotationIfAvailable(subsegment, 'duration', span.getDuration());
    }

    putAnnotationIfAvailable(subsegment: any, annotationName: string, annotationValue: any) {
        if (annotationValue) {
            subsegment.addAnnotation(this.normalizeAnnotationName(annotationName),
                this.normalizeAnnotationValue(annotationValue));
        }
    }

    addToErrors(span: ThundraSpan, subsegment: any): void {
        if (span.getTag('error')) {
            subsegment.addError(new Error(span.getTag('error.message')));
        }
    }

    addToMetadatas(span: ThundraSpan, subsegment: any): void {
        Object.keys(span.tags).forEach((key) => {
            subsegment.addMetadata(key, span.tags[key]);
          });
    }
}

export default AwsXRayThundraSpanListener;
