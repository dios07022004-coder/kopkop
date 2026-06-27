import { cn } from "@/lib/utils";

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "success" | "warning" | "danger" | "secondary";
}

export function Badge({
  className,
  variant = "default",
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-3 py-1 text-xs font-medium",
        variant === "default" && "bg-primary/10 text-primary",
        variant === "success" && "bg-[hsl(var(--success))]/15 text-[hsl(var(--success))]",
        variant === "warning" && "bg-[hsl(var(--warning))]/15 text-[hsl(var(--warning))]",
        variant === "danger" && "bg-[hsl(var(--danger))]/15 text-[hsl(var(--danger))]",
        variant === "secondary" && "bg-secondary text-secondary-foreground",
        className,
      )}
      {...props}
    />
  );
}
