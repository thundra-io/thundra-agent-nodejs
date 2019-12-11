import ThundraSpanListener from './ThundraSpanListener';
import ThundraSpan from '../../opentracing/Span';

const get = require('lodash.get');

class TagInjectorSpanListener implements ThundraSpanListener {
    private tags: any;

    constructor(config: any = {}) {
        this.tags = get(config, 'tags', {});
    }

    setTags(tags: any) {
        this.tags = tags;
    }

    getTags(): any {
        return this.tags;
    }

    onSpanStarted(span: ThundraSpan, me: any, callback: () => any, args: any[], callbackAlreadyCalled?: boolean): boolean {
        return false;
    }

    onSpanInitialized(span: ThundraSpan, me: any, callback: () => any, args: any[], callbackAlreadyCalled?: boolean): boolean {
        const existingTags = get(span, 'tags', {});
        const newTags = {...existingTags, ...this.tags};

        span.tags = newTags;

        return false;
    }

    onSpanFinished(span: ThundraSpan, me: any, callback: () => any, args: any[], callbackAlreadyCalled?: boolean): boolean {
        return false;
    }

    failOnError() {
        return false;
    }
}

export default TagInjectorSpanListener;
