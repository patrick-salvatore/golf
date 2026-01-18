import { Show, For } from "solid-js";
import { cn } from "~/lib/cn";

const Checkbox = (props) => {
  const {
    onChange,
    disabled = false,
    label,
    size = "small",
    color = "blue",
    indeterminate = false,
    error = false,
    errorMessage,
    description,
    id,
    name,
    value,
  } = props;

  const sizeClasses = {
    small: "w-4 h-4",
    medium: "w-5 h-5",
    large: "w-6 h-6",
  };

  const labelSizeClasses = {
    small: "text-sm",
    medium: "text-base",
    large: "text-lg",
  };

  const handleChange = (e) => {
    if (onChange) {
      onChange(e.target.checked, e);
    }
  };

  return (
    <div class="flex flex-col space-y-1">
      <div class="flex items-center space-x-2">
        <Show when={label}>
          <label
            for={id}
            class={`
                  ${labelSizeClasses[size]}
                  ${disabled && "text-gray-400 cursor-not-allowed"}
                  ${error ? "text-red-700" : ""}
                  font-medium block
                `}
          >
            {label}
          </label>
        </Show>

        <input
          type="checkbox"
          id={id}
          name={name}
          value={value}
          checked={value}
          onChange={handleChange}
          disabled={disabled}
          class={cn(
            sizeClasses[size],
            disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer",
            "h-4 w-4 shrink-0 rounded-sm border shadow transition-shadow focus-visible:outline-none focus-visible:ring-[1.5px] focus-visible:ring-ring data-[disabled]:cursor-not-allowed data-[checked]:bg-primary data-[checked]:text-primary-foreground data-[disabled]:opacity-50"
          )}
        />
      </div>
    </div>
  );
};

// Checkbox Group Component
const CheckboxGroup = (props) => {
  const {
    options = [],
    value = [],
    onChange,
    label,
    orientation = "vertical",
    size = "medium",
    color = "blue",
    disabled = false,
    error = false,
    errorMessage,
    ...rest
  } = props;

  const handleCheckboxChange = (optionValue, checked) => {
    let newValue;
    if (checked) {
      newValue = [...value, optionValue];
    } else {
      newValue = value.filter((v) => v !== optionValue);
    }

    if (onChange) {
      onChange(newValue);
    }
  };

  const orientationClasses = {
    vertical: "flex flex-col space-y-2",
    horizontal: "flex flex-wrap gap-4",
  };

  return (
    <div class="space-y-2">
      <Show when={label}>
        <label class="block text-sm font-medium text-gray-700 mb-2">
          {label}
        </label>
      </Show>

      <div class={orientationClasses[orientation]}>
        <For each={options}>
          {(option) => (
            <Checkbox
              id={`${rest.name || "checkbox"}-${option.value}`}
              label={option.label}
              description={option.description}
              checked={value.includes(option.value)}
              onChange={(checked) =>
                handleCheckboxChange(option.value, checked)
              }
              disabled={disabled || option.disabled}
              size={size}
              color={color}
              value={option.value}
            />
          )}
        </For>
      </div>

      <Show when={error && errorMessage}>
        <p class="text-red-600 text-sm">{errorMessage}</p>
      </Show>
    </div>
  );
};

export { Checkbox, CheckboxGroup };
