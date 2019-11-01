import ThundraSpanListener from './ThundraSpanListener';
import ThundraSpan from '../../opentracing/Span';
import { SpanTags, SecurityTags } from '../../Constants';

const get = require('lodash.get');

class SecurityAwareSpanListener implements ThundraSpanListener {
    private block: boolean;
    private whitelist: Operation[];
    private blacklist: Operation[];

    constructor(config: any = {}) {
        this.block = get(config, 'block', false);
        this.whitelist = get(config, 'whitelist', []).map((opConfig: any) => new Operation(opConfig));
        this.blacklist = get(config, 'blacklist', []).map((opConfig: any) => new Operation(opConfig));
    }

    onSpanStarted(span: ThundraSpan, me?: any, callback?: () => any, args?: any[], callbackAlreadyCalled?: boolean): boolean {
        if (!this.isExternalOperation(span)) {
            return false;
        }

        for (const op of this.blacklist) {
            if (op.matches) {
                this.handleSecurityIssue(span);
                return false;
            }
        }

        const hasWhitelist = Array.isArray(this.whitelist) && this.whitelist.length > 0;

        if (hasWhitelist) {
            for (const op of this.whitelist) {
                if (op.matches) {
                    return false;
                }
            }

            this.handleSecurityIssue(span);
        }
    }

    onSpanFinished(span: ThundraSpan, me?: any, callback?: () => any, args?: any[], callbackAlreadyCalled?: boolean): boolean {
        return false;
    }

    failOnError(): boolean {
        return true;
    }

    isExternalOperation(span: ThundraSpan): boolean {
        return span.getTag(SpanTags.TOPOLOGY_VERTEX) === true;
    }

    handleSecurityIssue(span: ThundraSpan) {
        if (this.block) {
            span.setTag(SecurityTags.BLOCKED, true);
            throw new SecurityError('Operaiton was blocked due to security configuration');
        } else {
            span.setTag(SecurityTags.VIOLATED, true);
        }
    }
}

class SecurityError extends Error {
    constructor(message: string) {
        super(message);
        this.name = this.constructor.name;
        Error.captureStackTrace(this, this.constructor);
    }
}

class Operation {
    private className: string;
    private operationTypes: string[];
    private tags: any;

    constructor(config: any = {}) {
        this.className = get(config, 'className', '');
        this.operationTypes = get(config, 'operationTypes');
        this.tags = get(config, 'tags');
    }

    matches(span: ThundraSpan): boolean {
        let matched = true;

        if (this.className) {
            matched = this.className === span.className;
        }

        if (matched && this.operationTypes) {
            matched = this.operationTypes.includes(this.getOperationType(span));
        }

        if (matched && this.tags) {
            for (const tagKey of Object.keys(this.tags)) {
                const tagVal = get(this.tags, tagKey, []);
                if (Array.isArray(tagVal) && !tagVal.includes(span.getTag(tagKey))) {
                    matched = false;
                    break;
                } else if (span.getTag(tagKey) !== tagVal) {
                    matched = false;
                    break;
                }
            }
        }

        return matched;
    }

    getOperationType(span: ThundraSpan): string {
        return 'TODO';
    }
}

export default SecurityAwareSpanListener;
