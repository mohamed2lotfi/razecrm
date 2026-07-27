import * as React from "react"
import { createPortal } from "react-dom"
import { useEffect, useCallback } from "react"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"

const Dialog = ({ open, onOpenChange, children }) => {
  // Lock body scroll when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    }
    return () => { document.body.style.overflow = '' }
  }, [open])

  // Close on Escape
  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Escape') onOpenChange(false)
  }, [onOpenChange])

  useEffect(() => {
    if (open) {
      document.addEventListener('keydown', handleKeyDown)
      return () => document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open, handleKeyDown])

  if (!open) return null

  // Portal to <body> so the dialog is NEVER affected by parent transforms/offsets
  return createPortal(
    <div className="fixed inset-0 z-[100]">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50"
        onClick={() => onOpenChange(false)} 
      />
      {/* Center container */}
      <div className="absolute inset-0 overflow-y-auto">
        <div className="flex min-h-full items-center justify-center p-4 sm:p-6">
          {children}
        </div>
      </div>
    </div>,
    document.body
  )
}

const DialogContent = React.forwardRef(({ className, children, onClose, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "relative w-full max-w-lg bg-card rounded-xl border shadow-xl",
      "flex flex-col max-h-[85vh]",
      className
    )}
    onClick={(e) => e.stopPropagation()}
    {...props}
  >
    {/* Close button */}
    <button
      type="button"
      onClick={onClose || (() => {})}
      className="absolute right-4 top-4 z-10 rounded-full p-1.5 text-muted-foreground/60 hover:text-foreground hover:bg-muted transition-all"
      style={{ display: onClose ? 'flex' : 'none' }}
    >
      <X className="h-4 w-4" />
    </button>
    {children}
  </div>
))
DialogContent.displayName = "DialogContent"

const DialogHeader = ({ className, ...props }) => (
  <div className={cn("shrink-0 px-6 pt-6 pb-4", className)} {...props} />
)

const DialogTitle = React.forwardRef(({ className, ...props }, ref) => (
  <h2 ref={ref} className={cn("text-lg font-semibold leading-none tracking-tight text-foreground", className)} {...props} />
))
DialogTitle.displayName = "DialogTitle"

const DialogDescription = React.forwardRef(({ className, ...props }, ref) => (
  <p ref={ref} className={cn("text-sm text-muted-foreground mt-1.5", className)} {...props} />
))
DialogDescription.displayName = "DialogDescription"

const DialogBody = ({ className, ...props }) => (
  <div className={cn("flex-1 overflow-y-auto px-6 py-2", className)} {...props} />
)

const DialogFooter = ({ className, ...props }) => (
  <div className={cn("shrink-0 flex justify-end gap-3 px-6 pt-4 pb-6 border-t bg-muted/30 rounded-b-2xl", className)} {...props} />
)

export { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogBody, DialogFooter }
