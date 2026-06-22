import { useEffect, useMemo, useCallback, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useRecordStore } from '@/stores/recordStore';
import { useFolderStore } from '@/stores/folderStore';
import { useTagStore } from '@/stores/tagStore';
import { useUIStore } from '@/stores/uiStore';
import { recordService } from '@/services/recordService';
import { useToast } from '@/components/common/Toast';
import RecordCard from '@/components/record/RecordCard';
import EmptyState from '@/components/common/EmptyState';
import Loading from '@/components/common/Loading';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import RecordDetailPage from '@/pages/RecordDetailPage';
import type { RecordType, RecordListItem } from '@/types/record';
import type { FolderTreeItem } from '@/types/folder';

const TYPE_TABS: { key: RecordType | 'all'; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'api_relay', label: 'API中转' },
  { key: 'api_official', label: '官方Key' },
  { key: 'test_environment', label: '测试环境' },
  { key: 'website_account', label: '网站' },
  { key: 'license_key', label: '卡密' },
  { key: 'common_link', label: '链接' },
];

function flattenFolders(folders: FolderTreeItem[]): FolderTreeItem[] {
  const result: FolderTreeItem[] = [];
  for (const f of folders) {
    result.push(f);
    if ((f.children ?? []).length > 0) result.push(...flattenFolders(f.children ?? []));
  }
  return result;
}

export default function AllRecordsPage() {
  const { folderId, tagId } = useParams<{ folderId?: string; tagId?: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { setSearchOpen, setCreateRecordOpen, setEditRecordId } = useUIStore();

  const {
    items, total, loading, filters, selectedId, page, pageSize,
    setFilters, setLoading, setItems, setSelectedId, setPage,
  } = useRecordStore();
  const { folders } = useFolderStore();
  const { tags } = useTagStore();

  const [deleteTarget, setDeleteTarget] = useState<RecordListItem | null>(null);
  const [viewMode, setViewMode] = useState<'rich' | 'compact'>(() =>
    window.localStorage.getItem('account-vault-record-view-mode') === 'compact' ? 'compact' : 'rich'
  );

  const pageTitle = useMemo(() => {
    if (folderId) {
      const all = flattenFolders(folders);
      const folder = all.find((f) => f.id === folderId);
      return folder ? folder.name : '文件夹';
    }
    if (tagId) {
      const tag = tags.find((t) => t.id === tagId);
      return tag ? tag.name : '标签';
    }
    return '全部记录';
  }, [folderId, tagId, folders, tags]);

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    try {
      const params = { ...filters, folderId: folderId || undefined, tagId: tagId || undefined };
      const res = await recordService.list(params);
      if (res.success && res.data) {
        setItems(res.data.items, res.data.total);
        setPage(res.data.page);
      } else {
        toast('error', res.error?.message || '加载记录失败');
      }
    } catch {
      toast('error', '加载记录失败');
    } finally {
      setLoading(false);
    }
  }, [filters, folderId, tagId, setLoading, setItems, setPage, toast]);

  useEffect(() => { fetchRecords(); }, [fetchRecords]);

  useEffect(() => {
    const handleRecordUpdated = (event: Event) => {
      const recordId = (event as CustomEvent<{ id?: string }>).detail?.id;
      fetchRecords();
      if (recordId) setSelectedId(recordId);
    };
    window.addEventListener('account-vault-record-updated', handleRecordUpdated);
    return () => window.removeEventListener('account-vault-record-updated', handleRecordUpdated);
  }, [fetchRecords, setSelectedId]);

  useEffect(() => {
    setFilters({ type: undefined, page: 1 });
    setSelectedId(null);
  }, [folderId, tagId, setFilters, setSelectedId]);

  useEffect(() => {
    if (selectedId && !items.some((item) => item.id === selectedId)) {
      setSelectedId(null);
    }
  }, [items, selectedId, setSelectedId]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      const res = await recordService.delete(deleteTarget.id);
      if (res.success) {
        toast('success', '已移入回收站');
        setDeleteTarget(null);
        fetchRecords();
      } else {
        toast('error', res.error?.message || '删除失败');
      }
    } catch { toast('error', '删除失败'); }
  };

  const handleToggleFavorite = async (record: RecordListItem) => {
    try {
      const res = await recordService.toggleFavorite(record.id, !record.isFavorite);
      if (res.success) {
        toast('success', record.isFavorite ? '已取消收藏' : '已收藏');
        window.dispatchEvent(new CustomEvent('account-vault-record-updated', {
          detail: { id: record.id },
        }));
      } else {
        toast('error', res.error?.message || '操作失败');
      }
    } catch {
      toast('error', '操作失败');
    }
  };

  const activeType = filters.type || 'all';

  const updateViewMode = (mode: 'rich' | 'compact') => {
    setViewMode(mode);
    window.localStorage.setItem('account-vault-record-view-mode', mode);
  };

  return (
    <div className="flex-1 flex h-full min-w-0" style={{ background: '#FFFFFF' }}>
      <section className="flex min-w-[360px] flex-1 flex-col h-full">
        {/* 鈹€鈹€ Header 鈹€鈹€ */}
        <div style={{ padding: '12px 16px', borderBottom: '1px solid #E8E3DC', flexShrink: 0 }}>
          {/* Title row */}
          <div className="flex items-center gap-2" style={{ marginBottom: '8px' }}>
            <h2 style={{ fontSize: '15px', fontWeight: 700, color: '#1C1917', letterSpacing: '-0.3px' }}>
              {pageTitle}
            </h2>
            <span style={{
              fontSize: '10px', fontWeight: 700, color: '#A8A09A',
              background: '#F4F2EC', borderRadius: '6px', padding: '2px 8px',
            }}>
              {total}
            </span>

            {/* Search box */}
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

          {/* Type filter chips */}
          <div className="flex gap-[5px]">
            {TYPE_TABS.map((tab) => {
              const active = activeType === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setFilters({ type: tab.key === 'all' ? undefined : tab.key as RecordType, page: 1 })}
                  className="flex items-center gap-1 transition-all duration-[120ms]"
                  style={{
                    height: '22px', padding: '0 8px', borderRadius: '11px',
                    background: active ? '#EBF3FF' : '#F4F2EC',
                    fontSize: '11px', fontWeight: active ? 500 : 400,
                    color: active ? '#2563EB' : '#A8A09A',
                  }}
                >
                  {active && tab.key !== 'all' && (
                    <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#3B82F6' }} />
                  )}
                  {tab.label}
                  {active && tab.key !== 'all' && (
                    <svg width="8" height="8" viewBox="0 0 8 8" fill="none" style={{ marginLeft: '2px' }}
                      onClick={(e) => { e.stopPropagation(); setFilters({ type: undefined, page: 1 }); }}>
                      <path d="M2 2L6 6M6 2L2 6" stroke="#2563EB" strokeWidth="1.2" strokeLinecap="round"/>
                    </svg>
                  )}
                </button>
              );
            })}
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

        {/* 鈹€鈹€ Record list 鈹€鈹€ */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <Loading />
          ) : items.length === 0 ? (
            <EmptyState
              title="还没有任何记录"
              description="你可以先添加一个 API Key、测试环境、网站账号或常用链接。"
              action={{ label: '新增记录', onClick: () => setCreateRecordOpen(true) }}
            />
          ) : (
            <div>
              {items.map((record, idx) => (
                <div key={record.id}>
                  <RecordCard
                    record={record}
                    selected={record.id === selectedId}
                    density={viewMode}
                    onClick={() => setSelectedId(record.id)}
                    onToggleFavorite={() => handleToggleFavorite(record)}
                    onEdit={() => setEditRecordId(record.id)}
                    onDelete={() => setDeleteTarget(record)}
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
              setSelectedId(null);
              fetchRecords();
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

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="删除记录"
        message={deleteTarget ? `确定删除"${deleteTarget.title}"吗？记录将移至回收站。` : ''}
        confirmText="删除"
        danger
      />
    </div>
  );
}


