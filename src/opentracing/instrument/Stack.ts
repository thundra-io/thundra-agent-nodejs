class Stack<T> {
  store: T[] = [];
  push(val: T) {
    this.store.push(val);
  }
  pop(): T | undefined {
    return this.store.pop();
  }
  peek(): T | undefined {
    if (this.store.length === 0) {
      return undefined;
    } else {
      return (this.store[this.store.length - 1]);
    }
  }
  clear(): void {
    this.store = [];
  }
}

export default Stack;
