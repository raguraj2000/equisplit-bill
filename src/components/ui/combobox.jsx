import * as React from "react";
import { Check, ChevronsUpDown, X } from "lucide-react";
import { cn } from "@/lib/utils";

const ComboboxContext = React.createContext(null);

export function Combobox({
  items = [],
  value,
  defaultValue,
  onValueChange,
  multiple = false,
  itemToStringValue = (item) => (typeof item === "string" ? item : item?.label || ""),
  children,
  className,
  ...props
}) {
  const [selectedValue, setSelectedValue] = React.useState(
    value !== undefined ? value : defaultValue || (multiple ? [] : "")
  );
  const [query, setQuery] = React.useState("");
  const [isOpen, setIsOpen] = React.useState(false);

  React.useEffect(() => {
    if (value !== undefined) {
      setSelectedValue(value);
    }
  }, [value]);

  const handleSelect = React.useCallback(
    (itemVal) => {
      if (multiple) {
        const currentList = Array.isArray(selectedValue) ? selectedValue : [];
        const exists = currentList.some(
          (val) => itemToStringValue(val) === itemToStringValue(itemVal)
        );
        const updated = exists
          ? currentList.filter((val) => itemToStringValue(val) !== itemToStringValue(itemVal))
          : [...currentList, itemVal];
        if (value === undefined) setSelectedValue(updated);
        onValueChange?.(updated);
      } else {
        if (value === undefined) setSelectedValue(itemVal);
        onValueChange?.(itemVal);
        setIsOpen(false);
      }
    },
    [multiple, selectedValue, value, onValueChange, itemToStringValue]
  );

  const filteredItems = React.useMemo(() => {
    if (!query.trim()) return items;
    return items.filter((item) => {
      const text = itemToStringValue(item);
      return text.toLowerCase().includes(query.toLowerCase());
    });
  }, [items, query, itemToStringValue]);

  return (
    <ComboboxContext.Provider
      value={{
        items,
        filteredItems,
        value: selectedValue,
        onSelect: handleSelect,
        query,
        setQuery,
        isOpen,
        setIsOpen,
        multiple,
        itemToStringValue,
      }}
    >
      <div className={cn("relative w-full", className)} {...props}>
        {children}
      </div>
    </ComboboxContext.Provider>
  );
}

export function ComboboxInput({ placeholder = "Select...", className, ...props }) {
  const context = React.useContext(ComboboxContext);
  if (!context) return null;

  const displayVal = React.useMemo(() => {
    if (context.multiple) return "";
    return context.value ? context.itemToStringValue(context.value) : "";
  }, [context.value, context.multiple, context.itemToStringValue]);

  return (
    <div className="relative flex items-center">
      <input
        type="text"
        placeholder={placeholder}
        value={context.isOpen ? context.query : displayVal}
        onFocus={() => context.setIsOpen(true)}
        onChange={(e) => {
          context.setQuery(e.target.value);
          if (!context.isOpen) context.setIsOpen(true);
        }}
        className={cn(
          "w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 pr-8",
          className
        )}
        {...props}
      />
      <ChevronsUpDown
        className="absolute right-2.5 size-4 text-gray-400 cursor-pointer pointer-events-none"
        aria-hidden="true"
      />
    </div>
  );
}

export function ComboboxContent({ children, className }) {
  const context = React.useContext(ComboboxContext);
  if (!context || !context.isOpen) return null;

  return (
    <div
      className={cn(
        "absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black/5 focus:outline-none sm:text-sm",
        className
      )}
    >
      {children}
    </div>
  );
}

export function ComboboxList({ children }) {
  const context = React.useContext(ComboboxContext);
  if (!context) return null;

  if (typeof children === "function") {
    return <>{context.filteredItems.map(children)}</>;
  }

  return <>{children}</>;
}

export function ComboboxEmpty({ children = "No items found." }) {
  const context = React.useContext(ComboboxContext);
  if (!context || context.filteredItems.length > 0) return null;

  return (
    <div className="py-2.5 px-3 text-center text-sm text-gray-500">
      {children}
    </div>
  );
}

export function ComboboxItem({ value, children, className }) {
  const context = React.useContext(ComboboxContext);
  if (!context) return null;

  const isSelected = React.useMemo(() => {
    const itemStr = context.itemToStringValue(value);
    if (context.multiple) {
      return (
        Array.isArray(context.value) &&
        context.value.some((val) => context.itemToStringValue(val) === itemStr)
      );
    }
    return context.itemToStringValue(context.value) === itemStr;
  }, [context.value, context.multiple, context.itemToStringValue, value]);

  return (
    <div
      onClick={() => context.onSelect(value)}
      className={cn(
        "relative flex cursor-pointer select-none items-center justify-between px-3 py-2 text-sm text-gray-900 hover:bg-indigo-50 hover:text-indigo-900 transition-colors",
        isSelected && "font-medium bg-indigo-50/50 text-indigo-600",
        className
      )}
    >
      <span>{children || context.itemToStringValue(value)}</span>
      {isSelected && <Check className="size-4 text-indigo-600 ml-2" />}
    </div>
  );
}
