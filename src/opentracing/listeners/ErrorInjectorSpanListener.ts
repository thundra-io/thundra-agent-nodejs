import ThundraSpanListener from './ThundraSpanListener';
import ThundraSpan from '../Span';
import ThundraChaosError from '../../plugins/error/ThundraChaosError';

const get = require('lodash.get');

class ErrorInjectorSpanListener implements ThundraSpanListener {
    private readonly DEFAULT_ERROR_MESSAGE: string = 'Error injected by Thundra!';
    private readonly DEFAULT_INJECT_COUNT_FREQ: number = 1;
    private readonly DEFAULT_INJECT_ON_FINISH: boolean = false;
    private readonly DEFAULT_ERROR_TYPE: string = 'Error';

    private injectCountFreq: number;
    private counter: number;
    private injectOnFinish: boolean;
    private errorType: string;
    private errorMessage: string;

    constructor(opt: any = {}) {
        this.injectCountFreq = get(opt, 'injectCountFreq', this.DEFAULT_INJECT_COUNT_FREQ);
        this.injectOnFinish = get(opt, 'injectOnFinish', this.DEFAULT_INJECT_ON_FINISH);
        this.errorType = get(opt, 'errorType', this.DEFAULT_ERROR_TYPE);
        this.errorMessage = get(opt, 'errorMessage', this.DEFAULT_ERROR_MESSAGE);
        this.counter = 0;
    }

    onSpanStarted(span: ThundraSpan, me: any, callback: () => any, args: any[], callbackAlreadyCalled?: boolean): boolean {
        return false;
    }

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

    failOnError() {
        return true;
    }

    private _injectErrorWithCallback(span: ThundraSpan,  me: any, callback: () => any): void {
        if (this.counter % this.injectCountFreq === 0) {
            const error = new ThundraChaosError(this.errorMessage);
            error.name = this.errorType;
            span.setErrorTag(error);
            if (typeof(callback) === 'function') {
                callback.apply(me, [error]);
            }
        }

        this.counter++;
    }

    private _injectError(span: ThundraSpan,  me: any): void {
        if (this.counter % this.injectCountFreq === 0) {
            const error = new ThundraChaosError(this.errorMessage);
            error.name = this.errorType;
            span.setErrorTag(error);
            this.counter++;
            throw error;
        }

        this.counter++;
    }
}

export default ErrorInjectorSpanListener;
