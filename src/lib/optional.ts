export class Optional<T> {
  private constructor(private value: T | null) {}

  static of<T>(value: T | null | undefined): Optional<T> {
    return new Optional(value ?? null);
  }

  static empty<T>(): Optional<T> {
    return new Optional<T>(null);
  }

  static async fromAsync<T>(promise: Promise<T>): Promise<Optional<T>> {
    try {
      const result = await promise;
      return Optional.of(result);
    } catch {
      return Optional.empty<T>();
    }
  }

  isPresent(): boolean {
    return this.value !== null;
  }

  isEmpty(): boolean {
    return this.value === null;
  }

  get(): T {
    if (this.value === null) {
      throw new Error('No value present');
    }
    return this.value;
  }

  orElse(defaultValue: T): T {
    return this.value ?? defaultValue;
  }

  orElseGet(supplier: () => T): T {
    return this.value ?? supplier();
  }

  map<U>(mapper: (value: T) => U): Optional<U> {
    return this.value ? Optional.of(mapper(this.value)) : Optional.empty<U>();
  }

  flatMap<U>(mapper: (value: T) => Optional<U>): Optional<U> {
    return this.value ? mapper(this.value) : Optional.empty<U>();
  }

  filter(predicate: (value: T) => boolean): Optional<T> {
    return this.value && predicate(this.value) ? this : Optional.empty<T>();
  }

  ifPresent(consumer: (value: T) => void): void {
    if (this.value) {
      consumer(this.value);
    }
  }
}
