import ThundraLogger from '../../ThundraLogger';

class InvocationSupport {
    static instance: InvocationSupport;

    tags: Map<string, any>;

    constructor() {
        this.tags = new Map<string, any>();
        InvocationSupport.instance = this;
    }

    static getInstance(): InvocationSupport {
        return InvocationSupport.instance ? InvocationSupport.instance : new InvocationSupport();
    }

    setTag(key: string, value: any): void {
        try {
            this.tags.set(key, value);
        } catch (e) {
            ThundraLogger.getInstance().error(e);
        }
    }

    getTag(key: string): any {
        return this.tags.get(key);
    }

    setTags(keyValuePairs: {[key: string]: any }): void {
        try {
            Object.keys(keyValuePairs).forEach((key) => {
              this.tags.set(key, keyValuePairs[key]);
            });
        } catch (e) {
            ThundraLogger.getInstance().error(e);
        }
    }

    getTags(): Map<string, any> {
        return this.tags;
    }

    removeTags(): void {
        this.tags.clear();
    }
}

export default InvocationSupport;
