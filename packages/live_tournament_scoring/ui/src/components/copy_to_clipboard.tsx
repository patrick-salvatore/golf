import { createSignal, Show, splitProps } from "solid-js";

// Copy to Clipboard Hook
const createCopyToClipboard = () => {
  const [copied, setCopied] = createSignal(false);
  const [error, setError] = createSignal(null);

  const copyToClipboard = async (text) => {
    try {
      setError(null);

      // Check if the Clipboard API is supported
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else {
        // Fallback for older browsers
        const textArea = document.createElement("textarea");
        textArea.value = text;
        textArea.style.position = "absolute";
        textArea.style.left = "-999999px";
        textArea.style.top = "-999999px";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();

        const successful = document.execCommand("copy");
        document.body.removeChild(textArea);

        if (!successful) {
          throw new Error("Failed to copy text");
        }
      }

      setCopied(true);

      // Reset copied state after 2 seconds
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      setError(err.message);
      console.error("Failed to copy to clipboard:", err);
    }
  };

  return { copied, error, copyToClipboard };
};

// Basic Copy Button Component
export const CopyButton = (props) => {
  const [local, rest] = splitProps(props, [
    "text",
    "children",
    "size",
    "variant",
    "showIcon",
    "onCopy",
    "disabled",
    "className",
  ]);
  const {
    text,
    children,
    size = "small",
    variant = "primary",
    showIcon = true,
    onCopy,
    disabled = false,
    className = "",
  } = local;

  console.log(variant);

  const { copied, error, copyToClipboard } = createCopyToClipboard();

  const handleClick = async () => {
    if (disabled) return;

    await copyToClipboard(text);

    if (onCopy) {
      onCopy(text, copied());
    }
  };

  const sizeClasses = {
    small: "px-2 py-1 text-xs",
    medium: "px-3 py-2 text-sm",
    large: "px-4 py-3 text-base",
  };

  const variantClasses = {
    primary: "bg-blue-600 hover:bg-blue-700 text-white",
    secondary: "bg-gray-200 hover:bg-gray-300 text-gray-700",
    outline: "border border-gray-300 hover:bg-gray-50 text-gray-700",
    ghost: "hover:bg-gray-100 text-gray-700",
  };

  const iconSize = {
    small: "w-3 h-3",
    medium: "w-4 h-4",
    large: "w-5 h-5",
  };

  return (
    <button
      onClick={handleClick}
      disabled={disabled}
      class={`
        ${sizeClasses[size]}
        ${variantClasses[variant]}
        ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
        ${className}
        rounded-md font-medium transition-all duration-200 
        flex items-center space-x-2
      `}
      {...rest}
    >
      <Show when={showIcon}>
        <Show
          when={!copied()}
          fallback={
            <svg
              class={`${iconSize[size]} text-green-500`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M5 13l4 4L19 7"
              />
            </svg>
          }
        >
          <svg
            class={iconSize[size]}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
            />
          </svg>
        </Show>
      </Show>

      <span>{children}</span>
    </button>
  );
};

export const CodeBlock = (props) => {
  const { code, language = "javascript", title, className = "" } = props;
  const { copied, copyToClipboard } = createCopyToClipboard();

  return (
    <div class={`bg-gray-900 rounded-lg overflow-hidden ${className}`}>
      <Show when={title}>
        <div class="bg-gray-800 px-4 py-2 text-sm text-gray-300 border-b border-gray-700">
          {title}
        </div>
      </Show>

      <div class="relative">
        <pre class="p-4 text-sm text-gray-300 overflow-x-auto">
          <code class={`language-${language}`}>{code}</code>
        </pre>

        <button
          onClick={() => copyToClipboard(code)}
          class="absolute top-2 right-2 p-2 bg-gray-800 hover:bg-gray-700 rounded-md transition-colors duration-200"
          title="Copy to clipboard"
        >
          <Show
            when={!copied()}
            fallback={
              <svg
                class="w-4 h-4 text-green-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M5 13l4 4L19 7"
                />
              </svg>
            }
          >
            <svg
              class="w-4 h-4 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
              />
            </svg>
          </Show>
        </button>
      </div>
    </div>
  );
};

export const CopyInput = (props) => {
  const { value, label, placeholder = "", className = "" } = props;
  const { copied, copyToClipboard } = createCopyToClipboard();

  return (
    <div class={`space-y-2 ${className}`}>
      <Show when={label}>
        <label class="block text-sm font-medium text-gray-700">{label}</label>
      </Show>

      <div class="relative">
        <input
          type="text"
          value={value}
          placeholder={placeholder}
          readonly
          class="w-full pr-12 pl-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />

        <button
          onClick={() => copyToClipboard(value)}
          class="absolute right-2 top-1/2 transform -translate-y-1/2 p-1 hover:bg-gray-200 rounded transition-colors duration-200"
          title="Copy to clipboard"
        >
          <Show
            when={!copied()}
            fallback={
              <svg
                class="w-4 h-4 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M5 13l4 4L19 7"
                />
              </svg>
            }
          >
            <svg
              class="w-4 h-4 text-gray-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
              />
            </svg>
          </Show>
        </button>
      </div>
    </div>
  );
};
