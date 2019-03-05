import ThundraSpanListener from './ThundraSpanListener';
import ThundraSpan from '../../opentracing/Span';
import Utils from '../utils/Utils';

const koalas = require('koalas');

class LatencyInjectorSpanListener implements ThundraSpanListener {
    private readonly DEFAULT_DELAY = 100;
    private readonly DEFAULT_INJECT_ON_FINISH: boolean = false;
    private readonly DEFAULT_RANDOMIZE_DELAY: boolean = false;

    private injectOnFinish: boolean;
    private delay: number;
    private randomizeDelay: boolean;

    constructor(opt: any = {}) {
        this.injectOnFinish = JSON.parse(koalas(opt.injectOnFinish, this.DEFAULT_INJECT_ON_FINISH));
        this.delay = JSON.parse(koalas(opt.delay, this.DEFAULT_DELAY));
        this.randomizeDelay = JSON.parse(koalas(opt.randomizeDelay, this.DEFAULT_RANDOMIZE_DELAY));
    }

    onSpanStarted(span: ThundraSpan, me?: any, callback?: () => any, args?: any[], callbackAlreadyCalled?: boolean): boolean {
        if (callbackAlreadyCalled === undefined || callbackAlreadyCalled === false) {
            if (callback && !this.injectOnFinish) {
                const sleep = this.randomizeDelay ? Utils.getRandomInt(this.delay) : this.delay;
                Utils.sleep(sleep).then(() => {
                    if (typeof(callback) === 'function') {
                        callback.apply(me, args);
                    }
                });
            }
            return true;
        }

        return false;
    }

    onSpanFinished(span: ThundraSpan, me?: any, callback?: () => any, args?: any[]): boolean {
        if (callback && this.injectOnFinish) {
            const sleep = this.randomizeDelay ? Utils.getRandomInt(this.delay) : this.delay;
            Utils.sleep(sleep).then(() => {
                if (typeof(callback) === 'function') {
                    callback.apply(me, args);
                }
            });
        }

        return true;
    }

    failOnError() {
        return false;
    }

    invokesCallback(): boolean {
        return true;
    }
}

export default LatencyInjectorSpanListener;
