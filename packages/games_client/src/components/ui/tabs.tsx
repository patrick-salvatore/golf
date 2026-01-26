import {
  createContext,
  useContext,
  createSignal,
  splitProps,
  Show,
  type ParentProps,
  type ComponentProps,
} from 'solid-js';
import { cn } from '~/lib/cn';

type TabsContextValue = {
  value: () => string;
  onChange: (value: string) => void;
};

const TabsContext = createContext<TabsContextValue>();

export interface TabsProps extends ParentProps {
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  class?: string;
}

export const Tabs = (props: TabsProps) => {
  const [selected, setSelected] = createSignal(
    props.value || props.defaultValue || '',
  );

  const handleChange = (newValue: string) => {
    setSelected(newValue);
    props.onChange?.(newValue);
  };

  return (
    <TabsContext.Provider value={{ value: selected, onChange: handleChange }}>
      <div class={cn('', props.class)}>{props.children}</div>
    </TabsContext.Provider>
  );
};

export const TabsList = (props: ComponentProps<'div'>) => {
  const [local, rest] = splitProps(props, ['class']);
  return (
    <div
      class={cn(
        'inline-flex h-9 items-center justify-center rounded-lg bg-muted p-1 mb-2 text-muted-foreground',
        local.class,
      )}
      {...rest}
    />
  );
};

export const TabsTrigger = (
  props: ComponentProps<'button'> & { value: string },
) => {
  const context = useContext(TabsContext);
  const [local, rest] = splitProps(props, ['class', 'value']);

  return (
    <button
      type="button"
      class={cn(
        'inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
        context?.value() === local.value
          ? 'bg-background text-foreground shadow'
          : 'hover:bg-background/50 hover:text-foreground',
        local.class,
      )}
      onClick={() => context?.onChange(local.value)}
      {...rest}
    />
  );
};

export const TabsContent = (
  props: ComponentProps<'div'> & { value: string },
) => {
  const context = useContext(TabsContext);
  const [local, rest] = splitProps(props, ['class', 'value']);

  return (
    <Show when={context?.value() === local.value}>
      <div
        class={cn(
          'mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
          local.class,
        )}
        {...rest}
      />
    </Show>
  );
};

export const TabsIndicator = (
  _props: ComponentProps<'div'> & { variant?: string },
) => {
  // Not strictly needed in simple version, keeping stub for compat
  return null;
};
