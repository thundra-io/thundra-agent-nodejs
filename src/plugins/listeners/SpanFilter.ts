import ThundraSpan from '../../opentracing/Span';

class SpanFilter {
    private $domainName: string;
    private $className: string;
    private $operationName: string;
    private $tags: any;

    constructor(domainName: string, className: string, operationName: string, tags: any) {
        this.$domainName = domainName;
        this.$className = className;
        this.$operationName = operationName;
        this.$tags = tags ? tags : {};
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
        return accepted;
    }

}

export default SpanFilter;
