import {
  createSignal as createSolidSignal,
  createMemo,
  createEffect,
  batch,
  untrack,
} from "solid-js";
import {
  validateIfRequired,
  updateFieldDirty,
  getElementInput,
  get,
  getValues,
} from "./utils";
import { resolver } from "./schema_resolver";
import { transform } from "zod/v4";

function createSignal<T>(value?: T) {
  const [get, set] = createSolidSignal(value);
  return { get, set };
}

function handleFieldEvent(
  form,
  field,
  name,
  event,
  validationModes,
  options = {} as any
): void {
  batch(() => {
    if (event?.target?.value) {
      let value = event.target.value;

      if (options.transform) {
        value = transform(value);
      }

      field._value.set(value);
    }
    field.touched.set(true);
    form._touched.set(true);

    updateFieldDirty(form, field);

    validateIfRequired(form, field, name, { on: validationModes });
  });
}

function createFormStore({
  initialValues = {},
  validateOn = "submit",
  revalidateOn = "input",
  schema,
}) {
  // Create signals of form store
  const fieldNames = createSignal([]);
  const fieldArrayNames = createSignal([]);
  const element = createSignal<HTMLFormElement>();
  const submitCount = createSignal(0);
  const submitting = createSignal(false);
  const submitted = createSignal(false);
  const validating = createSignal(false);
  const touched = createSignal(false);
  const dirty = createSignal(false);
  const invalid = createSignal(false);
  const response = createSignal();
  const error = createSignal();

  const fields = createSignal({});

  // Return form functions and state
  return {
    // Props
    initialValues,
    schema,
    validateOn,
    revalidateOn,

    // Signals
    fieldNames,
    fieldArrayNames,
    _touched: touched,
    _element: element,
    _submitCount: submitCount,
    _submitting: submitting,
    _submitted: submitted,
    _validating: validating,
    _dirty: dirty,
    _invalid: invalid,
    _response: response,
    _error: error,

    // Stores
    _fields: fields,
    // setFields,

    _fieldArrays: {},

    // Other
    _validators: new Set(),

    get fieldErrors() {
      return Object.entries(fields.get()).reduce(
        (acc, [key, field]: any) => ({ ...acc, [key]: field.error }),
        {}
      ) as any;
    },
    get values() {
      return getValues({ fields: fields.get() });
    },
    get element() {
      return element.get();
    },
    get submitCount() {
      return submitCount.get();
    },
    get submitting() {
      return submitting.get();
    },
    get submitted() {
      return submitted.get();
    },
    get validating() {
      return validating.get();
    },
    get touched() {
      return touched.get();
    },
    get dirty() {
      return dirty.get();
    },
    get invalid() {
      return invalid.get();
    },
    get response() {
      return response.get();
    },
    get error() {
      return error.get();
    },
    get fields() {
      return fields.get() as any;
    },
  };
}

export function createForm(options = {} as any) {
  const form = createFormStore(options);

  function initializeFieldStore(name, options) {
    // Initialize store on first request
    const field = untrack(() => form.fields[name]);

    if (!field) {
      const initial = get(form.initialValues, name);

      // Create signals of field store
      const elements = createSignal([]);
      const type = createSignal("");
      const initialValue = createSignal(initial);
      const startValue = createSignal(initial);
      const value = createSignal(initial);
      const error = createSignal();
      const active = createSignal(false);
      const touched = createSignal(false);
      const dirty = createSignal(false);

      form._fields.set((prev) => ({
        ...prev,

        [name]: {
          // Signals
          elements,
          initialValue,
          startValue,
          _value: value,
          _error: error,
          active,
          touched,
          dirty,
          type,

          // Other
          validate: [],
          validateOn: options?.validateOn || undefined,
          revalidateOn: options?.revalidateOn || "blur",
          consumers: new Set(),

          get value() {
            return value.get() ?? initialValue.get();
          },
          get error() {
            return error.get();
          },
        },
      }));

      // Add name of field to form
      form.fieldNames.set((names) => [...names, name]);
    }

    // Return store of field
    return form.fields[name]!;
  }

  function register(name, options = {} as any) {
    const getField = createMemo(() => {
      return initializeFieldStore(name, options);
    });

    const out: any = {
      name,
      ref(element) {
        const type = element.type;

        getField().elements.set((elements) => [...elements, element]);
        getField().type.set(element.type);

        createEffect(() => {
          if (
            element.type !== "radio" &&
            untrack(() => getField().startValue.get()) === undefined &&
            untrack(() => getField().value) === undefined
          ) {
            const input = getElementInput(element, getField(), type);
            getField()._value.set(() => input);
          }
        });
      },
      onInput(event) {
        handleFieldEvent(form, getField(), name, event, ["touched", "input"], {
          transform: options.transform,
        });
      },
      onChange(event) {
        if (options && options.onChange) {
          options.onChange(event);
        }

        handleFieldEvent(form, getField(), name, event, ["change"], {
          transform: options.transform,
        });
      },
      onBlur(event) {
        handleFieldEvent(form, getField(), name, event, ["touched", "blur"]);
      },
    };

    if (form.fields[name].value && !Array.isArray(form.fields[name].value)) {
      out.value = form.fields[name].value;
    }

    return out;
  }

  const handleSubmit = (onSubmit) => async (event) => {
    event.preventDefault();

    batch(() => {
      form._submitted.set(true);
      form._submitting.set(true);
      form._submitCount.set((count) => (count ? count + 1 : 1));
    });
    const values = getValues(form);
    const schema = form.schema;

    try {
      if (schema) await resolver(schema, values);

      try {
        await onSubmit?.(values, event);
      } catch (error: any) {
        console.log(error)
        form._error.set(error);
      }
    } catch (error: any) {
      batch(() => {
        Object.entries(error.errors).forEach(([key, e]) => {
          form.fields[key] && form.fields[key]._error.set(e);
        });
      });
    } finally {
      form._submitting.set(false);
    }
  };

  // Return form store and linked components
  return { form, register, handleSubmit };
}
