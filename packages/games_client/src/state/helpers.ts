export const identity = <T>(s: T) => s;

export type InitFn<T> = (data: T) => void;
