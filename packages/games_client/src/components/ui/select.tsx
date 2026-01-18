import {
  createSignal,
  createContext,
  useContext,
  splitProps,
  Show,
  For,
  onCleanup,
  onMount,
  type ComponentProps,
  type ParentProps,
  type JSX,
} from "solid-js";
import { cn } from "~/lib/cn";

// -- Select Context --
type SelectContextValue = {
  value: () => string | undefined;
  onChange: (value: string) => void;
  isOpen: () => boolean;
  setIsOpen: (open: boolean) => void;
  placeholder?: string;
};

const SelectContext = createContext<SelectContextValue>();

// -- Select Root --
export interface SelectProps<T = any> {
  value?: T;
  onChange?: (value: T) => void;
  options?: T[];
  placeholder?: string;
  itemComponent?: (props: { item: any }) => JSX.Element;
  children?: JSX.Element;
  class?: string;
}

export function Select<T>(props: SelectProps<T>) {
  const [open, setOpen] = createSignal(false);
  const [internalValue, setInternalValue] = createSignal<any>(props.value);

  const handleSelect = (val: any) => {
    setInternalValue(val);
    props.onChange?.(val);
    setOpen(false);
  };

  // Close on outside click
  let ref: HTMLDivElement | undefined;
  const onClickOutside = (e: MouseEvent) => {
    if (ref && !ref.contains(e.target as Node)) {
      setOpen(false);
    }
  };

  onMount(() => document.addEventListener("click", onClickOutside));
  onCleanup(() => document.removeEventListener("click", onClickOutside));

  return (
    <SelectContext.Provider
      value={{
        value: () => (props.value !== undefined ? (props.value as unknown as string) : internalValue()),
        onChange: handleSelect,
        isOpen: open,
        setIsOpen: setOpen,
        placeholder: props.placeholder,
      }}
    >
      <div class={cn("relative w-full", props.class)} ref={ref}>
        {props.children}
      </div>
    </SelectContext.Provider>
  );
}

// -- Trigger --
export const SelectTrigger = (props: ComponentProps<"button">) => {
  const context = useContext(SelectContext);
  const [local, rest] = splitProps(props, ["class", "children"]);

  return (
    <button
      type="button"
      class={cn(
        "flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
        local.class
      )}
      onClick={() => context?.setIsOpen(!context.isOpen())}
      {...rest}
    >
      {local.children}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        class="h-4 w-4 opacity-50"
      >
        <path d="m6 9 6 6 6-6" />
      </svg>
    </button>
  );
};

// -- Value --
export const SelectValue = <T,>(props: { children?: (state: { selectedOption: () => T }) => JSX.Element }) => {
  const context = useContext(SelectContext);
  
  return (
    <span class="block truncate">
        <Show when={context?.value()} fallback={context?.placeholder}>
            {/* If children is function, call it (Kobalte style) */}
            {typeof props.children === "function" 
                ? props.children({ selectedOption: context!.value as any })
                : context?.value()}
        </Show>
    </span>
  );
};

// -- Content --
export const SelectContent = (props: ComponentProps<"div">) => {
  const context = useContext(SelectContext);
  const [local, rest] = splitProps(props, ["class"]);

  return (
    <Show when={context?.isOpen()}>
      <div
        class={cn(
          "absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md border bg-popover text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95",
          local.class
        )}
        {...rest}
      />
    </Show>
  );
};

// -- Item --
export const SelectItem = (props: ComponentProps<"div"> & { item: any }) => {
  const context = useContext(SelectContext);
  const [local, rest] = splitProps(props, ["class", "item", "children"]);

  // Kobalte passes `item` which is the value/object
  // We grab the raw value (string) usually
  const value = local.item.rawValue !== undefined ? local.item.rawValue : local.item;

  const isSelected = () => context?.value() === value;

  return (
    <div
      class={cn(
        "relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-2 pr-8 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 hover:bg-accent hover:text-accent-foreground",
        isSelected() && "bg-accent text-accent-foreground",
        local.class
      )}
      onClick={() => context?.onChange(value)}
      {...rest}
    >
      <span class="absolute right-2 flex h-3.5 w-3.5 items-center justify-center">
        <Show when={isSelected()}>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            class="h-4 w-4"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </Show>
      </span>
      <span class="truncate">{local.children}</span>
    </div>
  );
};

// -- Helpers/Stubs for compatibility --
export const SelectDescription = (_props: any) => <div {..._props} />;
export const SelectErrorMessage = (_props: any) => <div {..._props} />;
export const SelectItemDescription = (_props: any) => <div {..._props} />;
export const SelectHiddenSelect = (_props: any) => <div class="hidden" />;
export const SelectSection = (_props: any) => <div {..._props} />;

// Add properties to Select function to match Kobalte usage
(Select as any).Description = SelectDescription;
(Select as any).ErrorMessage = SelectErrorMessage;
(Select as any).ItemDescription = SelectItemDescription;
(Select as any).HiddenSelect = SelectHiddenSelect;
(Select as any).Section = SelectSection;
