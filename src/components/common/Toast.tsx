import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  type: ToastType;
  message: string;
}

interface ToastContextType {
  toast: (type: ToastType, message: string, duration?: number) => void;
}

const ToastContext = createContext<ToastContextType>({ toast: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

const TOAST_STYLES: Record<ToastType, { bg: string; text: string; border: string; icon: string }> = {
  success: { bg: '#EAF7EF', text: '#2F9D62', border: '#CDEBD8', icon: '✓' },
  error:   { bg: '#FFF1F0', text: '#D94B4B', border: '#F8D2D2', icon: '✕' },
  warning: { bg: '#FFF4DF', text: '#D88A16', border: '#F4D7A5', icon: '!' },
  info:    { bg: '#FFFDFC', text: '#374151', border: '#EFE8DF', icon: 'i' },
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((type: ToastType, message: string, duration = 3000) => {
    const id = Date.now().toString();
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, duration);
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed top-5 right-5 flex flex-col gap-2" style={{ zIndex: 9999 }}>
        {toasts.map((t) => {
          const style = TOAST_STYLES[t.type];
          return (
            <div
              key={t.id}
              className="animate-slide-up flex items-center gap-2.5 px-4 py-2.5"
              style={{
                background: style.bg,
                border: `1px solid ${style.border}`,
                borderRadius: '12px',
                boxShadow: '0 8px 24px rgba(31,41,55,0.08)',
                minWidth: '180px',
                maxWidth: '320px',
              }}
            >
              <span
                className="w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-semibold flex-shrink-0"
                style={{ background: `${style.border}`, color: style.text }}
              >
                {style.icon}
              </span>
              <span className="text-[13px] font-medium" style={{ color: style.text }}>
                {t.message}
              </span>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
