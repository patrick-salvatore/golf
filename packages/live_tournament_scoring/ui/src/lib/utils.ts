export function tryCatch<A>(f: () => A): A | string {
  try {
    const value = f();
    return value;
  } catch (reason) {
    return reason instanceof Error ? reason.message : String(reason);
  }
}

export const groupByIdMap = <
  E extends Record<string, any>,
  K extends keyof E = keyof E
>(
  arr: Array<E>,
  idKey: K
): Record<E[K], Array<E>> => {
  const out = {} as Record<E[K], Array<E>>;

  for (let i = 0; i < arr.length; i++) {
    const item = arr[i];
    const key = item[idKey];

    if (!out[key]) {
      out[key] = [];
    }
    out[key].push(item);
  }

  return out;
};

export const reduceToByIdMap = <
  E extends Record<string, any>,
  K extends keyof E = keyof E
>(
  arr: Array<E>,
  idKey: K
): Record<E[K], E> =>
  arr.reduce(
    (acc, el) => ({ ...acc, [el[idKey as string]]: el }),
    {} as Record<K, E>
  );

export const mapArrayByIndex = <E extends Record<string, any>>(
  arr: Array<E>
): Record<number, E> =>
  arr.reduce((acc, el, i) => ({ ...acc, [i]: el }), {} as Record<number, E>);
