import * as React from "react";
import { LoaderIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function Spinner({ className, size = "md", ...props }) {
  const sizeClasses = {
    sm: "size-3.5",
    md: "size-4",
    lg: "size-6",
    xl: "size-8",
  };

  return (
    <LoaderIcon
      role="status"
      aria-label="Loading"
      className={cn(
        "animate-spin text-gray-500",
        sizeClasses[size] || "size-4",
        className
      )}
      {...props}
    />
  );
}
