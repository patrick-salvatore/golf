import {
  type JSX,
  Show,
  type ParentProps,
  type ParentComponent,
  createEffect,
} from "solid-js";
import { cn } from "~/lib/cn";

import { createContext, useContext } from "solid-js";
import { TextField } from "@kobalte/core/text-field";
import { TextFieldRoot } from "../ui/textfield";

export const FormContext = createContext();

const Form: ParentComponent<{ form: any }> = (props) => (
  <FormContext.Provider value={props.form}>
    {props.children}
  </FormContext.Provider>
);

export function useFormContext() {
  const context = useContext(FormContext);
  if (!context) {
    throw new Error("can't find FormContext");
  }
  return context;
}

export function useField(path: string) {
  const form = useFormContext() as any;

  return form.fields[path];
}

type FormItemProps = ParentProps<JSX.HTMLAttributes<HTMLDivElement>>;

const CircleAlertIcon = ({ width, height }: any) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke-linecap="round"
      stroke-linejoin="round"
      stroke="currentColor"
      stroke-width="2"
      class="lucide lucide-icon lucide-circle-alert"
      width={width || "16"}
      height={height || "16"}
    >
      <circle cx="12" cy="12" r="10"></circle>
      <line x1="12" x2="12" y1="8" y2="12"></line>
      <line x1="12" x2="12.01" y1="16" y2="16"></line>
    </svg>
  );
};

const FormItem = ({ class: _class, ...props }: FormItemProps) => {
  return <div class={cn("space-y-2", _class)} {...props} />;
};
FormItem.displayName = "FormItem";

type FormErrorProps = ParentProps<JSX.HTMLAttributes<HTMLParagraphElement>>;

const FormError = ({ class: _class, ...props }: FormErrorProps) => {
  const form = useFormContext() as any;

  const getMessage = () => {
    const error = form.error;

    if (typeof error === "string") {
      return error;
    } else if (error instanceof Error) {
      return error.message;
    }

    return null;
  };

  return (
    <Show when={form.error}>
      <p
        class={cn(
          "w-full flex gap-2 justify-center text-destructive bg-destructive/10 p-2 rounded-md text-center",
          "text-xs font-normal",
          _class
        )}
        {...props}
      >
        <CircleAlertIcon width={16} height={16} />
        <span>{getMessage()}</span>
      </p>
    </Show>
  );
};
FormError.displayName = "FormFieldError";

export const FormField = (props: any) => {
  const field = useField(props.name);
  return (
    <TextFieldRoot
      class={cn(
        "text-sm placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50 h-[50px]",
        field.error() && "border-red-500 focus-visible:ring-red-500"
      )}
    >
      {props.children}
      <FieldError name={props.name} />
    </TextFieldRoot>
  );
};
FormError.displayName = "FormField";

type FieldErrorProps = ParentProps<JSX.HTMLAttributes<HTMLParagraphElement>> & {
  name: string;
};

const FieldError = ({ name, class: _class, ...props }: FieldErrorProps) => {
  const field = useField(name);

  return (
    <Show when={field.error}>
      <p
        class={cn(
          "gap-1 flex text-destructive bg-destructive/10 p-2 rounded-md text-center",
          "text-xs font-normal",
          _class
        )}
        {...props}
      >
        <CircleAlertIcon width={16} height={16} />
        <span>{field.error?.message}</span>
      </p>
    </Show>
  );
};
FieldError.displayName = "FormFieldError";

export { Form, FormItem, FormError, FieldError };
