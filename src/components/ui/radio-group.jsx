import * as React from "react";
import { cn } from "@/lib/utils";

const RadioGroupContext = React.createContext({
  value: undefined,
  onValueChange: () => {},
  disabled: false,
  name: undefined,
});

export function RadioGroup({
  value,
  defaultValue,
  onValueChange,
  disabled = false,
  name,
  className,
  children,
  ...props
}) {
  const [selectedValue, setSelectedValue] = React.useState(
    value !== undefined ? value : defaultValue
  );

  React.useEffect(() => {
    if (value !== undefined) {
      setSelectedValue(value);
    }
  }, [value]);

  const handleSelect = React.useCallback(
    (val) => {
      if (disabled) return;
      if (value === undefined) {
        setSelectedValue(val);
      }
      onValueChange?.(val);
    },
    [disabled, value, onValueChange]
  );

  return (
    <RadioGroupContext.Provider
      value={{
        value: selectedValue,
        onValueChange: handleSelect,
        disabled,
        name,
      }}
    >
      <div
        role="radiogroup"
        aria-disabled={disabled}
        className={cn("grid gap-2", className)}
        {...props}
      >
        {children}
      </div>
    </RadioGroupContext.Provider>
  );
}

export function RadioGroupItem({
  value,
  id,
  disabled: itemDisabled,
  className,
  ...props
}) {
  const context = React.useContext(RadioGroupContext);
  const isChecked = context.value === value;
  const isDisabled = context.disabled || itemDisabled;

  return (
    <button
      type="button"
      role="radio"
      id={id}
      aria-checked={isChecked}
      aria-disabled={isDisabled}
      disabled={isDisabled}
      onClick={() => context.onValueChange(value)}
      className={cn(
        "aspect-square size-4 rounded-full border border-gray-300 text-indigo-600 ring-offset-white focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 flex items-center justify-center transition-all",
        isChecked && "border-indigo-600 bg-indigo-600 text-white shadow-sm",
        className
      )}
      {...props}
    >
      {isChecked && (
        <span className="size-2 rounded-full bg-white flex items-center justify-center" />
      )}
    </button>
  );
}
