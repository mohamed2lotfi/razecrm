import React, { useState, useRef, useEffect } from 'react';
import { Globe, ChevronDown, Check, X } from 'lucide-react';
import CountryFlag from '@/components/CountryFlag';
import { cn } from '@/lib/utils';

const DestinationSelect = ({
  value,
  onChange,
  destinations = [],
  placeholder = "Toutes destinations",
  allowAll = true,
  className = "",
  size = "sm", // "sm" (h-9) or "default" (h-10)
  mode = "name", // "name" (value is destination nom) or "id" (value is destination id)
  showArabic = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  // Find currently selected item
  const selectedDest = destinations.find(d => 
    mode === 'id' ? d.id === value : (d.nom === value || d.id === value)
  );

  const isAllSelected = !value || value === 'all' || value === '';

  const handleSelect = (dest) => {
    if (!dest) {
      onChange(mode === 'id' ? '' : 'all', null);
    } else {
      onChange(mode === 'id' ? dest.id : dest.nom, dest);
    }
    setIsOpen(false);
  };

  return (
    <div className={cn("relative inline-block text-left", className)} ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(prev => !prev)}
        className={cn(
          "w-full flex items-center justify-between gap-2 rounded-xl border bg-background text-xs font-semibold transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/20",
          size === 'sm' ? "h-9 px-3" : "h-10 px-3.5",
          isOpen ? "border-primary/50 ring-2 ring-primary/10 shadow-xs" : "border-border/80 hover:border-border hover:bg-muted/30",
          !isAllSelected ? "text-foreground font-bold" : "text-foreground/80"
        )}
      >
        <div className="flex items-center gap-2 truncate flex-1 text-left min-w-0">
          {isAllSelected ? (
            <>
              <Globe size={14} className="text-muted-foreground shrink-0" />
              <span className="truncate">{placeholder}</span>
            </>
          ) : (
            <>
              <CountryFlag 
                emoji={selectedDest?.emoji} 
                destinationName={selectedDest?.nom || (typeof value === 'string' ? value : '')} 
                className="w-4 h-3 rounded-xs shrink-0 shadow-2xs" 
              />
              <span className="truncate text-foreground font-bold">
                {selectedDest?.nom || value}
              </span>
            </>
          )}
        </div>

        <ChevronDown 
          size={13} 
          className={cn("text-muted-foreground transition-transform duration-200 shrink-0", isOpen && "rotate-180 text-primary")} 
        />
      </button>

      {/* Dropdown Popover Menu */}
      {isOpen && (
        <div className="absolute left-0 mt-1.5 w-60 max-h-64 overflow-y-auto rounded-2xl bg-card border border-border/90 shadow-xl p-1.5 z-50 animate-in fade-in-0 zoom-in-95 duration-150 space-y-0.5">
          {allowAll && (
            <button
              type="button"
              onClick={() => handleSelect(null)}
              className={cn(
                "w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-xl text-xs font-medium transition-colors text-left",
                isAllSelected 
                  ? "bg-primary/10 text-primary font-bold" 
                  : "text-foreground/80 hover:bg-muted/60 hover:text-foreground"
              )}
            >
              <div className="flex items-center gap-2 min-w-0">
                <Globe size={14} className={isAllSelected ? "text-primary" : "text-muted-foreground"} />
                <span className="truncate">{placeholder}</span>
              </div>
              {isAllSelected && <Check size={13} className="text-primary shrink-0 font-bold" />}
            </button>
          )}

          {destinations.length > 0 && allowAll && (
            <div className="my-1 border-t border-border/40" />
          )}

          {destinations.map(d => {
            const isSelected = mode === 'id' ? d.id === value : (d.nom === value || d.id === value);

            return (
              <button
                key={d.id}
                type="button"
                onClick={() => handleSelect(d)}
                className={cn(
                  "w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-xl text-xs transition-colors text-left",
                  isSelected 
                    ? "bg-primary/10 text-primary font-bold" 
                    : "text-foreground/85 hover:bg-muted/60 hover:text-foreground font-medium"
                )}
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <CountryFlag 
                    emoji={d.emoji} 
                    destinationName={d.nom} 
                    className="w-4 h-3 rounded-xs shrink-0 shadow-2xs" 
                  />
                  <span className="truncate">{d.nom}</span>
                  {showArabic && d.nom_ar && (
                    <span className="text-[10px] text-muted-foreground truncate" dir="rtl">
                      ({d.nom_ar})
                    </span>
                  )}
                </div>

                {isSelected && (
                  <Check size={13} className="text-primary shrink-0 font-bold" />
                )}
              </button>
            );
          })}

          {destinations.length === 0 && (
            <div className="px-3 py-4 text-center text-xs text-muted-foreground">
              Aucune destination disponible
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default DestinationSelect;
