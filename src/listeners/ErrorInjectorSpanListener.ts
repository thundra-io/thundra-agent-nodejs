import ThundraSpanListener from './ThundraSpanListener';
import ThundraSpan from '../opentracing/Span';
import ThundraChaosError from '../error/ThundraChaosError';
import Utils from '../utils/Utils';

const get = require('lodash.get');

/**
 * {@link ThundraSpanListener} implementation which throws specified/given error
 * on start or finish of the span.
 *
 * This span listener implementation is generally useful for injecting errors
 * while testing applications to create chaotic environment.
 */
class ErrorInjectorSpanListener implements ThundraSpanListener {

    private readonly DEFAULT_ERROR_MESSAGE: string = 'Error injected by Thundra!';
    private readonly DEFAULT_INJECT_PERCENTAGE: number = 100;
    private readonly DEFAULT_INJECT_ON_FINISH: boolean = false;
    private readonly DEFAULT_ERROR_TYPE: string = 'Error';

    private injectPercentage: number;
    private injectOnFinish: boolean;
    private errorType: string;
    private errorMessage: string;

    constructor(opt: any = {}) {
        this.injectPercentage = get(opt, 'injectPercentage', this.DEFAULT_INJECT_PERCENTAGE);
        this.injectOnFinish = get(opt, 'injectOnFinish', this.DEFAULT_INJECT_ON_FINISH);
        this.errorType = get(opt, 'errorType', this.DEFAULT_ERROR_TYPE);
        this.errorMessage = get(opt, 'errorMessage', this.DEFAULT_ERROR_MESSAGE);
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
        if (callback && !this.injectOnFinish) {
            if (callbackAlreadyCalled === undefined || callbackAlreadyCalled === false) {
                this._injectErrorWithCallback(span, me, callback);
                return true;
            }

            return false;
        }

        if (!callback && !this.injectOnFinish && this.failOnError()) {
            this._injectError(span, me);
            return false;
        }
    }

    /**
     * @inheritDoc
     */
    onSpanFinished(span: ThundraSpan, me: any, callback: () => any, args: any[], callbackAlreadyCalled?: boolean): boolean {
        if (callback && this.injectOnFinish) {
            if (callbackAlreadyCalled === undefined || callbackAlreadyCalled === false) {
                this._injectErrorWithCallback(span, me, callback);
                return true;
            }

            return false;
        }

        if (!callback && this.injectOnFinish && this.failOnError()) {
            this._injectError(span, me);
            return false;
        }
    }

    /**
     * @inheritDoc
     */
    failOnError() {
        return true;
    }

    private _injectErrorWithCallback(span: ThundraSpan,  me: any, callback: () => any): void {

        const perc = Utils.getRandomNumber(100);
        if (this.injectPercentage > (100 - perc)) {
            const error = new ThundraChaosError(this.errorMessage);
            error.name = this.errorType;
            span.setErrorTag(error);
            if (typeof(callback) === 'function') {
                callback.apply(me, [error]);
            }
        }
    }

    private _injectError(span: ThundraSpan,  me: any): void {

        const perc = Utils.getRandomNumber(100);
        if (this.injectPercentage > (100 - perc)) {
            const error = new ThundraChaosError(this.errorMessage);
            error.name = this.errorType;
            span.setErrorTag(error);
            throw error;
        }
    }
}

export default ErrorInjectorSpanListener;
