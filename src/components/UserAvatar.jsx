import React, { useState } from 'react';
import { User, Camera } from 'lucide-react';
import { cn } from '@/lib/utils';

const SIZE_MAP = {
  xs: "w-5 h-5 text-[9px]",
  sm: "w-7 h-7 text-xs",
  md: "w-9 h-9 text-sm",
  lg: "w-12 h-12 text-base",
  xl: "w-16 h-16 text-lg",
  '2xl': "w-24 h-24 text-2xl",
  '3xl': "w-28 h-28 text-3xl",
};

const UserAvatar = ({
  user,
  avatarUrl,
  name,
  size = "md",
  className = "",
  showOnline = false,
  isOnline = true,
  onClick,
  editable = false,
  onEditClick
}) => {
  const [imgError, setImgError] = useState(false);

  // Extract avatar URL
  const src = avatarUrl || user?.avatar_url || user?.photo_url || null;

  // Extract display name
  const displayName = name || user?.nom || user?.email?.split('@')[0] || 'Utilisateur';
  
  // Calculate initials (max 2 characters)
  const initials = displayName
    .trim()
    .split(/\s+/)
    .map(part => part.charAt(0))
    .join('')
    .substring(0, 2)
    .toUpperCase() || 'U';

  const sizeClass = SIZE_MAP[size] || SIZE_MAP.md;

  return (
    <div 
      className={cn("relative inline-flex items-center justify-center shrink-0 group select-none", className)}
      onClick={onClick}
    >
      <div className={cn(
        "rounded-full overflow-hidden flex items-center justify-center font-black transition-all duration-200 border border-white/10 shadow-xs relative",
        sizeClass,
        src && !imgError 
          ? "bg-muted" 
          : "bg-gradient-to-br from-primary to-indigo-600 text-primary-foreground text-white"
      )}>
        {src && !imgError ? (
          <img
            src={src}
            alt={displayName}
            onError={() => setImgError(true)}
            className="w-full h-full object-cover transition-transform group-hover:scale-105 duration-300"
          />
        ) : (
          <span className="leading-none tracking-tight font-extrabold">{initials}</span>
        )}

        {/* Editable overlay on hover */}
        {editable && (
          <div 
            onClick={(e) => {
              e.stopPropagation();
              onEditClick && onEditClick();
            }}
            className="absolute inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-white"
            title="Changer la photo"
          >
            <Camera size={size === '2xl' || size === '3xl' ? 24 : 16} />
          </div>
        )}
      </div>

      {/* Online Status Dot */}
      {showOnline && (
        <span 
          className={cn(
            "absolute bottom-0 right-0 rounded-full ring-2 ring-background shrink-0",
            size === 'xs' || size === 'sm' ? "w-2 h-2" : "w-3 h-3",
            isOnline ? "bg-emerald-500" : "bg-slate-400"
          )}
        />
      )}
    </div>
  );
};

export default UserAvatar;
