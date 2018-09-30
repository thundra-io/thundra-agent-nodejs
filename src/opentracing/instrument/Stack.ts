class Stack<T> {
    store: T[] = [];
    push(val: T) {
      this.store.push(val);
    }
    pop(): T | undefined {
      return this.store.pop();
    }
    clear(): void {
      this.store = [];
    }
  }

export default Stack;
