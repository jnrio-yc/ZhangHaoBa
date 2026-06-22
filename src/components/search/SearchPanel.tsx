import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { clsx } from 'clsx';
import type { SearchResultItem } from '@/types/api';
import { RECORD_TYPE_CONFIG } from '@/types/record';
import type { RecordType } from '@/types/record';

interface SearchPanelProps {
  onClose: () => void;
}

async function mockSearch(_keyword: string): Promise<SearchResultItem[]> {
  return [];
}

const SearchIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
  </svg>
);

const QUICK_COMMANDS = [
  { cmd: 'api', desc: '搜索 API 记录' },
  { cmd: 'test', desc: '搜索测试环境' },
  { cmd: 'site', desc: '搜索网站账号' },
];

export default function SearchPanel({ onClose }: SearchPanelProps) {
  const [keyword, setKeyword] = useState('');
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!keyword.trim()) {
      setResults([]);
      return;
    }
    setLoading(true);
    const timer = setTimeout(async () => {
      const items = await mockSearch(keyword);
      setResults(items);
      setSelectedIndex(0);
      setLoading(false);
    }, 200);
    return () => clearTimeout(timer);
  }, [keyword]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && results[selectedIndex]) {
      navigate(`/records/${results[selectedIndex].recordId}`);
      onClose();
    }
  }, [results, selectedIndex, navigate, onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[16vh]">
      <div
        className="fixed inset-0"
        style={{ background: 'rgba(16, 24, 40, 0.18)' }}
        onClick={onClose}
      />
      <div
        className="relative flex max-h-[68vh] min-h-0 w-[520px] flex-col animate-scale-in overflow-hidden"
        style={{
          background: '#FFFDFC',
          border: '1px solid #EFE8DF',
          borderRadius: '16px',
          boxShadow: '0 20px 48px rgba(31, 41, 55, 0.14)',
        }}
      >
        {/* Input */}
        <div
          className="flex flex-shrink-0 items-center gap-3 px-5 py-4"
          style={{ borderBottom: '1px solid #EFE8DF' }}
        >
          <span style={{ color: '#B6B0A8' }}><SearchIcon /></span>
          <input
            ref={inputRef}
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="搜索记录、URL、账号..."
            className="flex-1 bg-transparent outline-none text-[14px]"
            style={{ color: '#1F2937' }}
          />
          {keyword && (
            <button
              onClick={() => setKeyword('')}
              className="btn-icon w-5 h-5 text-[11px]"
              style={{ color: '#B6B0A8' }}
            >
              ✕
            </button>
          )}
          <kbd
            className="text-[11px] font-mono"
            style={{
              color: '#A8A29B',
              background: '#F4EFE8',
              border: '1px solid #E3DAD0',
              borderRadius: '6px',
              padding: '2px 6px',
            }}
          >
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div className="min-h-0 flex-1 overflow-y-auto">
          {loading && (
            <div className="flex items-center justify-center py-10">
              <div
                className="w-4 h-4 rounded-full animate-spin border-[1.5px]"
                style={{ borderColor: '#EDE7DD', borderTopColor: '#10213B' }}
              />
            </div>
          )}

          {!loading && keyword && results.length === 0 && (
            <div className="py-10 text-center">
              <p className="text-[14px]" style={{ color: '#9CA3AF' }}>没有找到相关记录</p>
              <p className="text-[13px] mt-1" style={{ color: '#C2BDB5' }}>可以换个关键词试试</p>
            </div>
          )}

          {!loading && results.map((item, index) => {
            const typeConfig = RECORD_TYPE_CONFIG[item.type as RecordType];
            return (
              <button
                key={item.recordId}
                onClick={() => { navigate(`/records/${item.recordId}`); onClose(); }}
                className="w-full flex items-center gap-3 px-5 py-3 text-left transition-colors duration-[120ms]"
                style={{
                  background: index === selectedIndex ? '#FAF7F1' : 'transparent',
                  borderBottom: '1px solid #F7F1E8',
                }}
              >
                <div
                  className="w-8 h-8 flex items-center justify-center flex-shrink-0"
                  style={{
                    background: '#FAF7F1',
                    border: '1px solid #EFE8DF',
                    borderRadius: '8px',
                    fontSize: '14px',
                  }}
                >
                  {typeConfig?.icon || '📄'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[14px] font-medium truncate" style={{ color: '#1F2937' }}>
                    {item.title}
                  </div>
                  <div className="text-[12px] truncate mt-0.5" style={{ color: '#9CA3AF' }}>
                    {item.url || item.username || item.platformName || typeConfig?.label}
                  </div>
                </div>
                {item.isFavorite && (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="#F5B53F" stroke="#F5B53F" strokeWidth="1.5">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                  </svg>
                )}
              </button>
            );
          })}

          {/* Quick commands (when empty) */}
          {!keyword && (
            <div className="px-5 py-4">
              <div
                className="text-[12px] font-medium mb-3 pb-2"
                style={{ color: '#B6B0A8', borderBottom: '1px solid #F0EBE3' }}
              >
                快捷命令
              </div>
              <div className="space-y-2">
                {QUICK_COMMANDS.map(({ cmd, desc }) => (
                  <div key={cmd} className="flex items-center gap-3">
                    <code
                      className="text-[12px] px-2 py-[2px] rounded-[6px]"
                      style={{
                        background: '#F1E7DC',
                        color: '#10213B',
                        border: '1px solid #E8DFD4',
                      }}
                    >
                      {cmd}
                    </code>
                    <span className="text-[13px]" style={{ color: '#6B7280' }}>{desc}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
