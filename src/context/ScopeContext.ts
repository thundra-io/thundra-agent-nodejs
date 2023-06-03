/**
 * Represents the context of scope
 * and holds scope specific data.
 */
export default class ScopeContext {

    private readonly parent: ScopeContext;
    private tracingStopped: boolean;

    constructor(opts: any = {}) {
        this.parent = opts.parent || undefined;
    }

    /**
     * Checks whether the tracing was stopped in the current scope
     * @return {boolean} {@code true} if the tracing was stopped in the current scope,
     *                   {@code false} otherwise
     */
    wasTracingStopped(): boolean {
        if (this.tracingStopped) {
            return true;
        } else {
            return this.parent && this.parent.wasTracingStopped();
        }
    }

    /**
     * Stops tracing in the current scope
     */
    stopTracing(): void {
        this.tracingStopped = true;
    }

}
