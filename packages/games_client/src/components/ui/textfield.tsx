import {
  type ComponentProps,
  splitProps,
  createContext,
  useContext,
} from 'solid-js';
import { cva } from 'class-variance-authority';
import { cn } from '~/lib/cn';

export const TextFieldRoot = (props: ComponentProps<'div'>) => {
  const [local, rest] = splitProps(props, ['class']);
  return <div class={cn('space-y-2', local.class)} {...rest} />;
};

export const textfieldLabel = cva(
  'text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
);

export const TextFieldLabel = (props: ComponentProps<'label'>) => {
  const [local, rest] = splitProps(props, ['class']);
  return <label class={cn(textfieldLabel(), local.class)} {...rest} />;
};

export const TextField = (props: ComponentProps<'input'>) => {
  const [local, rest] = splitProps(props, ['class', 'type']);
  return (
    <input
      type={local.type}
      class={cn(
        `flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50
          placeholder:text-muted-foreground placeholder:opacity-100 appearance-none focus:outline-none focus:ring-2 focus:ring-ring`,
        local.class,
      )}
      {...rest}
    />
  );
};

export const TextFieldDescription = (props: ComponentProps<'div'>) => {
  const [local, rest] = splitProps(props, ['class']);
  return (
    <div
      class={cn('text-[0.8rem] text-muted-foreground', local.class)}
      {...rest}
    />
  );
};

export const TextFieldErrorMessage = (props: ComponentProps<'div'>) => {
  const [local, rest] = splitProps(props, ['class']);
  return (
    <div
      class={cn('text-[0.8rem] font-medium text-destructive', local.class)}
      {...rest}
    />
  );
};
