/**
 * The built-in stack implementation for internal ussage
 */
class Stack<T> {

    private store: T[] = [];

    /**
     * Pushed the value to stack
     * @param val the value to be pushed
     */
    push(val: T) {
        this.store.push(val);
    }

    /**
     * Pops value from stack
     * @return the popped value from stack
     */
    pop(): T | undefined {
        return this.store.pop();
    }

    /**
     * Peeks value from stack
     * @return the peeked value from stack
     */
    peek(): T | undefined {
        if (this.store.length === 0) {
            return undefined;
        } else {
            return (this.store[this.store.length - 1]);
        }
    }

    /**
     * Clears stack
     */
    clear(): void {
        this.store = [];
    }

}

export default Stack;
