import { useState } from 'react';
import { X } from 'lucide-react';

interface ClickableAvatarProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  userName?: string;
}

export function ClickableAvatar({ src, alt = '', userName, className, onClick, ...props }: ClickableAvatarProps) {
  const [open, setOpen] = useState(false);
  const label = userName ?? alt;

  return (
    <>
      <img
        src={src}
        alt={alt}
        className={`cursor-pointer hover:opacity-90 transition-opacity ${className ?? ''}`}
        onClick={(e) => {
          setOpen(true);
          onClick?.(e);
        }}
        {...props}
      />
      {open && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-150"
          onClick={() => setOpen(false)}
        >
          <div className="relative flex flex-col items-center gap-3" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="absolute -top-3 -right-3 w-7 h-7 rounded-full bg-white shadow-md flex items-center justify-center z-10 hover:bg-gray-100 transition-colors"
            >
              <X size={14} className="text-gray-600" />
            </button>
            <img
              src={src}
              alt={alt}
              className="w-64 h-64 rounded-2xl shadow-2xl object-cover"
            />
            {label && (
              <p className="text-sm font-semibold text-white drop-shadow">{label}</p>
            )}
          </div>
        </div>
      )}
    </>
  );
}
