import zod from "zod";

import { get, getValues, set } from "./utils";

const setCustomValidity = (ref: any, fieldPath: any, errors: any) => {
  if (ref && "reportValidity" in ref) {
    const error = get(errors, fieldPath) as any;
    ref.setCustomValidity((error && error.message) || "");
    ref.reportValidity();
  }
};

let counter = 0;
export function getUniqueId(): number {
  return counter++;
}

export async function validate(form, name, _) {
  const schema = form.schema;

  if (!schema) return;

  const validator = getUniqueId();
  form._validators.add(validator);
  form._validating.set(true);

  try {
    const values = getValues(form);
    await resolver(schema.shape[name], values[name]);

    form.fields[name]._error.set(undefined);

    // return valid;
  } catch (e) {
    console.log(e);
  } finally {
    form._validating.set(false);
  }
}

function parseIssues(zodErrors: zod.ZodIssue[]) {
  const errors = {} as any;

  for (; zodErrors.length; ) {
    const error = zodErrors[0];
    const { code, message, path } = error;
    const _path = path.join(".");

    if (!errors[_path]) {
      if ("unionErrors" in error) {
        const unionError = error.unionErrors[0].errors[0];

        errors[_path] = {
          message: unionError.message,
          type: unionError.code,
        };
      } else {
        errors[_path] = { message, type: code };
      }
    }

    if ("unionErrors" in error) {
      error.unionErrors.forEach((unionError) =>
        unionError.errors.forEach((e) => zodErrors.push(e))
      );
    }

    zodErrors.shift();
  }

  return errors;
}

const nestErrors = (errors: any) => {
  const fieldErrors = {};
  for (const path in errors) {
    set(fieldErrors, path, errors[path]);
  }
  return fieldErrors;
};

export async function resolver(schema: any, values: any) {
  try {
    await schema.parse(values);

    return true;
  } catch (error: any) {
    console.log(error)
    throw {
      values: {},
      errors: nestErrors(parseIssues(error.errors)),
    };
  }
}
