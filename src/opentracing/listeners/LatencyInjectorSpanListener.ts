import ThundraSpanListener from './ThundraSpanListener';
import ThundraSpan from '../Span';
import Utils from '../../utils/Utils';

const get = require('lodash.get');

/**
 * {@link ThundraSpanListener} implementation which adds delay
 * on start or finish of the span.
 *
 * This span listener implementation is generally useful for injecting errors
 * while testing applications to create chaotic environment.
 */
class LatencyInjectorSpanListener implements ThundraSpanListener {

    private readonly DEFAULT_DELAY = 100;
    private readonly DEFAULT_INJECT_ON_FINISH: boolean = true;
    private readonly DEFAULT_RANDOMIZE_DELAY: boolean = false;

    private injectOnFinish: boolean;
    private delay: number;
    private randomizeDelay: boolean;

    constructor(opt: any = {}) {
        this.injectOnFinish = this.DEFAULT_INJECT_ON_FINISH;
        this.delay = get(opt, 'delay', this.DEFAULT_DELAY);
        this.randomizeDelay = get(opt, 'randomizeDelay', this.DEFAULT_RANDOMIZE_DELAY);
    }

    /**
     * @inheritDoc
     */
    onSpanStarted(span: ThundraSpan, me?: any, callback?: () => any, args?: any[], callbackAlreadyCalled?: boolean): boolean {
        return false;
    }

    /**
     * @inheritDoc
     */
    onSpanInitialized(span: ThundraSpan, me?: any, callback?: () => any, args?: any[], callbackAlreadyCalled?: boolean): boolean {
        if (callbackAlreadyCalled === undefined || callbackAlreadyCalled === false) {
            if (callback && typeof callback === 'function' && !this.injectOnFinish) {
                const sleep = this.randomizeDelay ? Utils.getRandomNumber(this.delay) : this.delay;
                Utils.sleep(sleep).then(() => {
                    span.finishTime = Date.now();
                    callback.apply(me, args);
                });
                return true;
            }
        }

        return false;
    }

    /**
     * @inheritDoc
     */
    onSpanFinished(span: ThundraSpan, me?: any, callback?: () => any, args?: any[]): boolean {
        if (callback && typeof callback === 'function' && this.injectOnFinish) {
            const sleep = this.randomizeDelay ? Utils.getRandomNumber(this.delay) : this.delay;
            Utils.sleep(sleep).then(() => {
                span.finishTime = Date.now();
                callback.apply(me, args);
            });
            return true;
        }

        return false;
    }

    /**
     * @inheritDoc
     */
    failOnError() {
        return false;
    }

}

export default LatencyInjectorSpanListener;
