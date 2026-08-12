import * as React from "react"
import { cn } from "@/lib/utils"

const Select = React.forwardRef(({ className, style, children, ...props }, ref) => {
  return (
    <select
      className={cn(
        "flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm appearance-none",
        "ring-offset-background",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%239ca3af%22%20stroke-width%3D%222%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%2F%3E%3C%2Fsvg%3E')] bg-no-repeat pr-7",
        className
      )}
      style={{
        backgroundPosition: 'right 8px center',
        backgroundSize: '14px',
        ...style
      }}
      ref={ref}
      {...props}
    >
      {children}
    </select>
  )
})
Select.displayName = "Select"

export { Select }
