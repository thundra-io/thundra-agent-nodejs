import ThundraSpanListener from './ThundraSpanListener';
import ThundraSpan from '../../opentracing/Span';
import { SpanTags } from '../../Constants';

const get = require('lodash.get');

class SecurityAwareSpanListener implements ThundraSpanListener {
    private block: boolean;
    private whitelist: Operation[];
    private blacklist: Operation[];

    onSpanStarted(span: ThundraSpan, me?: any, callback?: () => any, args?: any[], callbackAlreadyCalled?: boolean): boolean {
        if (!this.isExternalOperation(span)) {
            return !callbackAlreadyCalled;
        }
        return false;
    }

    onSpanFinished(span: ThundraSpan, me?: any, callback?: () => any, args?: any[], callbackAlreadyCalled?: boolean): boolean {
        return false;
    }

    failOnError(): boolean {
        return false;
    }

    isExternalOperation(span: ThundraSpan): boolean {
        return span.getTag(SpanTags.TOPOLOGY_VERTEX) === true;
    }
}

class Operation {
    private className: string;
    private operationTypes: string[];
    private tags: any;

    constructor(config: any = {}) {
        this.className = get(config, 'className', '');
        this.operationTypes = get(config, 'operationTypes', []);
        this.tags = get(config, 'tags', {});
    }
}

export default SecurityAwareSpanListener;
