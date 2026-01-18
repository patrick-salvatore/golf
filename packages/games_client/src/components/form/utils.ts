import { batch, untrack } from "solid-js";
import { validate } from "./schema_resolver";

export function getValues(form) {
  return untrack(() =>
    Object.entries(form.fields).reduce(
      (fields, [key, field]: any) => ({ ...fields, [key]: field.value }),
      {}
    )
  );
}

export function validateIfRequired(
  form,
  field,
  name,
  { on: modes, shouldFocus = false }
): void {
  untrack(() => {
    const validateOn = field.validateOn ?? form.validateOn;
    const revalidateOn = field.revalidateOn ?? form.revalidateOn;
    if (
      (modes as string[]).includes(
        (validateOn === "submit" ? form.submitted : field.error)
          ? revalidateOn
          : validateOn
      )
    ) {
      validate(form, name, { shouldFocus });
    }
  });
}

export function getElementInput(element, field, type) {
  const { checked, files, options, value, valueAsDate, valueAsNumber } =
    element as HTMLInputElement & HTMLSelectElement & HTMLTextAreaElement;
  return untrack(() =>
    !type || type === "string"
      ? value
      : type === "string[]"
      ? options
        ? [...options]
            .filter((e) => e.selected && !e.disabled)
            .map((e) => e.value)
        : checked
        ? [...((field.value || []) as string[]), value]
        : ((field.value || []) as string[]).filter((v) => v !== value)
      : type === "number"
      ? valueAsNumber
      : type === "boolean"
      ? checked
      : type === "File" && files
      ? files[0]
      : type === "File[]" && files
      ? [...files]
      : type === "Date" && valueAsDate
      ? valueAsDate
      : field.value
  );
}

export function updateFieldDirty(form, field): void {
  untrack(() => {
    // Check if field is dirty
    const dirty = isFieldDirty(field.startValue.get(), field.value);

    // Update dirty state of field if necessary
    if (dirty !== field.dirty.get()) {
      batch(() => {
        field.dirty.set(dirty);
        form._dirty.set(dirty);
      });
    }
  });
}

export function isFieldDirty(startValue, currentValue) {
  const toValue = (item: string | File | Blob) =>
    item instanceof Blob ? item.size : item;
  return Array.isArray(startValue) && Array.isArray(currentValue)
    ? startValue.map(toValue).join() !== currentValue.map(toValue).join()
    : startValue instanceof Date && currentValue instanceof Date
    ? startValue.getTime() !== currentValue.getTime()
    : Number.isNaN(startValue) && Number.isNaN(currentValue)
    ? false
    : startValue !== currentValue;
}

const compact = <TValue>(value: TValue[]) =>
  Array.isArray(value) ? value.filter(Boolean) : [];

const stringToPath = (input: string): string[] =>
  compact(input.replace(/["|']|\]/g, "").split(/\.|\[/));

const isUndefined = (val: unknown): val is undefined => val === undefined;
const isNull = (val: unknown): val is null => val === null;

const isNullOrUndefined = (val: unknown): val is null | undefined =>
  isNull(val) || isUndefined(val);

export const isObjectType = (value: unknown): value is object =>
  typeof value === "object";

export function isObject<T extends object>(value: unknown): value is T {
  return (
    !isNullOrUndefined(value) && !Array.isArray(value) && isObjectType(value)
  );
}

export function get<T>(
  object: T,
  path?: string | null,
  defaultValue?: unknown
) {
  if (!path) {
    return defaultValue;
  }

  const result = stringToPath(path).reduce(
    (result, key) =>
      isNullOrUndefined(result) ? result : result[key as keyof {}],
    object
  );

  return isUndefined(result) || result === object
    ? isUndefined(object[path as keyof T])
      ? defaultValue
      : object[path as keyof T]
    : result;
}

export function set(object, path, value) {
  let index = -1;
  const tempPath = stringToPath(path);
  const length = tempPath.length;
  const lastIndex = length - 1;

  while (++index < length) {
    const key = tempPath[index];
    let newValue = value;

    if (index !== lastIndex) {
      const objValue = object[key];
      newValue =
        isObject(objValue) || Array.isArray(objValue)
          ? objValue
          : !isNaN(+tempPath[index + 1])
          ? []
          : {};
    }

    if (key === "__proto__" || key === "constructor" || key === "prototype") {
      return;
    }

    object[key] = newValue;
    object = object[key];
  }
}
