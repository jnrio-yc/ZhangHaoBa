import { type ReactNode } from 'react';
import { clsx } from 'clsx';

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg';
}

const CloseIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);

export default function Dialog({ open, onClose, title, children, footer, size = 'md' }: DialogProps) {
  if (!open) return null;

  const widths = { sm: '360px', md: '460px', lg: '600px' };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="fixed inset-0"
        style={{ background: 'rgba(16, 24, 40, 0.18)' }}
        onClick={onClose}
      />
      <div
        className="relative flex min-h-0 flex-col overflow-hidden animate-scale-in"
        style={{
          background: '#FFFDFC',
          border: '1px solid #EFE8DF',
          borderRadius: '16px',
          boxShadow: '0 20px 48px rgba(31, 41, 55, 0.12)',
          width: widths[size],
          maxHeight: '80vh',
        }}
      >
        {/* Header */}
        <div
          className="flex flex-shrink-0 items-center justify-between px-6 py-4"
          style={{ borderBottom: '1px solid #EFE8DF' }}
        >
          <h3 className="text-[16px] font-semibold" style={{ color: '#162033' }}>{title}</h3>
          <button
            onClick={onClose}
            className="btn-icon"
          >
            <CloseIcon />
          </button>
        </div>

        {/* Body */}
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div
            className="flex flex-shrink-0 items-center justify-end gap-3 px-6 py-4"
            style={{ borderTop: '1px solid #EFE8DF' }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
