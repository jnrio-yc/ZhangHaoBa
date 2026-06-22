import { useEffect, useState, type ReactNode } from 'react';
import { useUIStore } from '@/stores/uiStore';
import RecordCard from '@/components/record/RecordCard';
import RecordDetailPage from '@/pages/RecordDetailPage';
import EmptyState from '@/components/common/EmptyState';
import Loading from '@/components/common/Loading';
import type { RecordListItem } from '@/types/record';

const VIEW_KEY = 'account-vault-record-view-mode';

interface RecordMasterDetailProps {
  title: string;
  count: number;
  items: RecordListItem[];
  loading: boolean;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onToggleFavorite: (record: RecordListItem) => void;
  onEdit: (record: RecordListItem) => void;
  onDelete: (record: RecordListItem) => void;
  onRefresh: () => void;
  emptyTitle: string;
  emptyDescription: string;
  emptyActionLabel?: string;
  onEmptyAction?: () => void;
  headerExtra?: ReactNode;
}

export default function RecordMasterDetail({
  title, count, items, loading, selectedId, onSelect,
  onToggleFavorite, onEdit, onDelete, onRefresh,
  emptyTitle, emptyDescription, emptyActionLabel, onEmptyAction,
  headerExtra,
}: RecordMasterDetailProps) {
  const { setSearchOpen } = useUIStore();
  const [viewMode, setViewMode] = useState<'rich' | 'compact'>(() =>
    window.localStorage.getItem(VIEW_KEY) === 'compact' ? 'compact' : 'rich'
  );

  const updateViewMode = (mode: 'rich' | 'compact') => {
    setViewMode(mode);
    window.localStorage.setItem(VIEW_KEY, mode);
  };

  // Clear selection if the selected record is no longer in the list
  useEffect(() => {
    if (selectedId && !items.some((item) => item.id === selectedId)) {
      onSelect(null);
    }
  }, [items, selectedId, onSelect]);

  return (
    <div className="flex-1 flex h-full min-w-0" style={{ background: '#FFFFFF' }}>
      <section className="flex min-w-[360px] flex-1 flex-col h-full">
        {/* Header */}
        <div style={{ padding: '12px 16px', borderBottom: '1px solid #E8E3DC', flexShrink: 0 }}>
          <div className="flex items-center gap-2" style={{ marginBottom: '8px' }}>
            <h2 style={{ fontSize: '15px', fontWeight: 700, color: '#1C1917', letterSpacing: '-0.3px' }}>
              {title}
            </h2>
            <span style={{
              fontSize: '10px', fontWeight: 700, color: '#A8A09A',
              background: '#F4F2EC', borderRadius: '6px', padding: '2px 8px',
            }}>
              {count}
            </span>

            <button
              onClick={() => setSearchOpen(true)}
              className="flex items-center gap-[5px] transition-colors duration-[120ms]"
              style={{
                height: '30px', background: '#F9F8F4', border: '1px solid #E8E3DC',
                borderRadius: '8px', padding: '0 10px', marginLeft: 'auto', width: '180px',
              }}
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <circle cx="5.5" cy="5.5" r="3.5" stroke="#B8B0A6" strokeWidth="1.3"/>
                <path d="M8.5 8.5L10.5 10.5" stroke="#B8B0A6" strokeWidth="1.3" strokeLinecap="round"/>
              </svg>
              <span style={{ fontSize: '12px', color: '#C0B8B0' }}>搜索...</span>
            </button>
          </div>

          <div className="flex gap-[5px] items-center">
            {headerExtra}
            <div className="record-view-switch ml-auto" aria-label="视图模式">
              <button
                type="button"
                className={viewMode === 'rich' ? 'active' : ''}
                onClick={() => updateViewMode('rich')}
                title="视图模式"
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <rect x="1.5" y="2" width="9" height="3" rx="1" stroke="currentColor" strokeWidth="1.2"/>
                  <rect x="1.5" y="7" width="9" height="3" rx="1" stroke="currentColor" strokeWidth="1.2"/>
                </svg>
              </button>
              <button
                type="button"
                className={viewMode === 'compact' ? 'active' : ''}
                onClick={() => updateViewMode('compact')}
                title="列表模式"
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M2 3h8M2 6h8M2 9h8" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round"/>
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Record list */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <Loading />
          ) : items.length === 0 ? (
            <EmptyState
              title={emptyTitle}
              description={emptyDescription}
              action={emptyActionLabel && onEmptyAction ? { label: emptyActionLabel, onClick: onEmptyAction } : undefined}
            />
          ) : (
            <div>
              {items.map((record, idx) => (
                <div key={record.id}>
                  <RecordCard
                    record={record}
                    selected={record.id === selectedId}
                    density={viewMode}
                    onClick={() => onSelect(record.id)}
                    onToggleFavorite={() => onToggleFavorite(record)}
                    onEdit={() => onEdit(record)}
                    onDelete={() => onDelete(record)}
                  />
                  {idx < items.length - 1 && (
                    <div style={{ height: '1px', background: '#F4F2EC', margin: '0 14px' }} />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <aside
        className="flex h-full w-[360px] flex-shrink-0 border-l 2xl:w-[420px]"
        style={{ borderColor: '#E8E3DC', background: '#FAFAF7' }}
      >
        {selectedId ? (
          <RecordDetailPage
            recordId={selectedId}
            embedded
            onDeleted={() => {
              onSelect(null);
              onRefresh();
            }}
          />
        ) : (
          <div className="flex flex-1 items-center justify-center px-8 text-center">
            <div>
              <div
                className="mx-auto mb-3 flex items-center justify-center"
                style={{ width: 42, height: 42, borderRadius: 12, background: '#F4F2EC', color: '#A8A09A' }}
              >
                <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="4" y="4" width="16" height="16" rx="3"/>
                  <path d="M8 9h8M8 13h5M8 17h7"/>
                </svg>
              </div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#57534E', marginBottom: 6 }}>选择一条记录</div>
              <div style={{ fontSize: 12, color: '#A8A09A', lineHeight: 1.6 }}>账号详情、复制操作和敏感字段会显示在这里。</div>
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}
