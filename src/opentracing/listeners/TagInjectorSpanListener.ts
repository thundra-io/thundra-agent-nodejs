import ThundraSpanListener from './ThundraSpanListener';
import ThundraSpan from '../Span';

const get = require('lodash.get');

/**
 * {@link ThundraSpanListener} implementation which injects given tags
 * on start or finish of the span
 */
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

    /**
     * @inheritDoc
     */
    onSpanStarted(span: ThundraSpan, me: any, callback: () => any, args: any[], callbackAlreadyCalled?: boolean): boolean {
        return false;
    }

    /**
     * @inheritDoc
     */
    onSpanInitialized(span: ThundraSpan, me: any, callback: () => any, args: any[], callbackAlreadyCalled?: boolean): boolean {
        const existingTags = get(span, 'tags', {});
        const newTags = {...existingTags, ...this.tags};

        span.tags = newTags;

        return false;
    }

    /**
     * @inheritDoc
     */
    onSpanFinished(span: ThundraSpan, me: any, callback: () => any, args: any[], callbackAlreadyCalled?: boolean): boolean {
        return false;
    }

    /**
     * @inheritDoc
     */
    failOnError() {
        return false;
    }

}

export default TagInjectorSpanListener;
