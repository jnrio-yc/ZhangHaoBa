import { useState, useEffect, useCallback } from 'react';
import { clsx } from 'clsx';
import { useToast } from './Toast';

interface SecretFieldProps {
  label: string;
  maskedValue?: string;
  fieldKey: string;
  recordId: string;
  onCopy: () => void;
  onReveal: () => Promise<{ value: string; expiresInSeconds: number } | null>;
  isHighRisk?: boolean;
}

const EyeIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
  </svg>
);

const EyeOffIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
    <line x1="1" y1="1" x2="23" y2="23"/>
  </svg>
);

const CopyIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
  </svg>
);

export default function SecretField({
  label, maskedValue, onCopy, onReveal, isHighRisk,
}: SecretFieldProps) {
  const [revealed, setRevealed] = useState(false);
  const [revealedValue, setRevealedValue] = useState('');
  const [timer, setTimer] = useState(0);
  const { toast } = useToast();

  useEffect(() => {
    if (timer <= 0) {
      setRevealed(false);
      setRevealedValue('');
      return;
    }
    const interval = setInterval(() => setTimer((t) => t - 1), 1000);
    return () => clearInterval(interval);
  }, [timer]);

  const handleReveal = useCallback(async () => {
    if (revealed) {
      setRevealed(false);
      setRevealedValue('');
      setTimer(0);
      return;
    }
    try {
      const result = await onReveal();
      if (result) {
        setRevealedValue(result.value);
        setRevealed(true);
        setTimer(result.expiresInSeconds);
      }
    } catch {
      toast('error', '获取失败');
    }
  }, [revealed, onReveal, toast]);

  if (!maskedValue) return null;

  return (
    <div className="flex items-center gap-3">
      <span
        className="text-[13px] w-20 flex-shrink-0"
        style={{ color: '#6B7280' }}
      >
        {label}
      </span>
      <span
        className="flex-1 text-[13px] font-mono px-3 py-1.5 rounded-[8px] truncate tracking-wider"
        style={{
          background: isHighRisk ? '#FFF1F0' : '#FAF7F1',
          border: `1px solid ${isHighRisk ? '#F8D2D2' : '#EFE8DF'}`,
          color: '#374151',
        }}
      >
        {revealed ? revealedValue : maskedValue}
        {revealed && timer > 0 && (
          <span className="text-[11px] ml-2" style={{ color: '#B6B0A8' }}>{timer}s</span>
        )}
      </span>
      <button
        onClick={handleReveal}
        className="btn-icon"
        title={revealed ? '隐藏' : '显示'}
      >
        {revealed ? <EyeOffIcon /> : <EyeIcon />}
      </button>
      <button
        onClick={onCopy}
        className="btn-icon"
        title="复制"
      >
        <CopyIcon />
      </button>
    </div>
  );
}
