import ThundraSpan from '../../opentracing/Span';

class SpanFilter {
    private $domainName: string;
    private $className: string;
    private $operationName: string;
    private $reverse: boolean;
    private $tags: any;

    constructor(config: any = {}) {
        this.$domainName = config.domainName;
        this.$className = config.className;
        this.$operationName = config.operationName;
        this.$reverse = config.reverse;
        this.$tags = config.tags ? config.tags : {};
    }

    get domainName(): string {
        return this.$domainName;
    }

    set domainName(domainName: string) {
         this.$domainName = domainName;
    }

    get className(): string {
        return this.$className;
    }

    set className(className: string) {
         this.$className = className;
    }

    get operationName(): string {
        return this.$operationName;
    }

    set operationName(operationName: string) {
         this.$operationName = operationName;
    }

    get reverse(): boolean {
        return this.$reverse;
    }

    set reverse(reverse: boolean) {
         this.$reverse = reverse;
    }

    get tags(): string {
        return this.$tags;
    }

    set tags(tags: string) {
         this.$tags = tags;
    }

    getTag(key: string): any {
        return this.$tags[key];
    }

    setTag(key: string, value: string): void {
        this.$tags[key] = value;
    }

    accept(span: ThundraSpan): boolean {
        let accepted = true;

        if (this.domainName) {
            accepted = this.domainName === span.domainName;
        }

        if (accepted && this.className) {
            accepted = this.className === span.className;
        }

        if (accepted && this.operationName) {
            accepted = this.operationName === span.operationName;
        }

        if (accepted) {
            const filterTags = this.tags;
            if (filterTags) {
                for (const tagKey of Object.keys(filterTags)) {
                    if (this.getTag(tagKey) !== span.getTag(tagKey)) {
                        accepted = false;
                        break;
                    }
                }
            }
        }

        if (this.reverse) {
            return !accepted;
        } else {
            return accepted;
        }
    }

}

export default SpanFilter;
