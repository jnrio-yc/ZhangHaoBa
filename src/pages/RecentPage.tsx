import { useEffect, useCallback, useMemo, useState } from 'react';
import { useRecordStore } from '@/stores/recordStore';
import { recordService } from '@/services/recordService';
import { useToast } from '@/components/common/Toast';
import { useUIStore } from '@/stores/uiStore';
import RecordMasterDetail from '@/components/record/RecordMasterDetail';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import type { RecordListItem } from '@/types/record';

const RECENT_LIMIT = 50;

export default function RecentPage() {
  const { toast } = useToast();
  const { setEditRecordId } = useUIStore();
  const { items, loading, selectedId, setItems, setLoading, setSelectedId } = useRecordStore();
  const [deleteTarget, setDeleteTarget] = useState<RecordListItem | null>(null);

  const fetchRecent = useCallback(async () => {
    setLoading(true);
    try {
      const res = await recordService.list({
        sort: 'last_used_desc',
        page: 1,
        pageSize: RECENT_LIMIT,
      });
      if (res.success && res.data) {
        setItems(res.data.items, res.data.total);
      } else {
        toast('error', res.error?.message || '加载最近使用失败');
      }
    } catch {
      toast('error', '加载最近使用失败');
    } finally {
      setLoading(false);
    }
  }, [setLoading, setItems, toast]);

  useEffect(() => {
    fetchRecent();
    setSelectedId(null);
  }, [fetchRecent, setSelectedId]);

  useEffect(() => {
    const handler = () => fetchRecent();
    window.addEventListener('account-vault-record-updated', handler);
    return () => window.removeEventListener('account-vault-record-updated', handler);
  }, [fetchRecent]);

  // Client-side secondary sort: lastUsedAt desc, then updatedAt desc
  const displayItems = useMemo(() => {
    return [...items]
      .sort((a, b) => {
        const aUsed = a.lastUsedAt || '';
        const bUsed = b.lastUsedAt || '';
        if (bUsed !== aUsed) return bUsed.localeCompare(aUsed);
        return b.updatedAt.localeCompare(a.updatedAt);
      })
      .slice(0, RECENT_LIMIT);
  }, [items]);

  const handleToggleFavorite = async (record: RecordListItem) => {
    try {
      const res = await recordService.toggleFavorite(record.id, !record.isFavorite);
      if (res.success) {
        toast('success', record.isFavorite ? '已取消收藏' : '已收藏');
        window.dispatchEvent(new CustomEvent('account-vault-record-updated', { detail: { id: record.id } }));
      } else {
        toast('error', res.error?.message || '操作失败');
      }
    } catch {
      toast('error', '操作失败');
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      const res = await recordService.delete(deleteTarget.id);
      if (res.success) {
        toast('success', '已移至回收站');
        setDeleteTarget(null);
        fetchRecent();
      } else {
        toast('error', res.error?.message || '删除失败');
      }
    } catch {
      toast('error', '删除失败');
    }
  };

  return (
    <>
      <RecordMasterDetail
        title="最近使用"
        count={displayItems.length}
        items={displayItems}
        loading={loading}
        selectedId={selectedId}
        onSelect={setSelectedId}
        onToggleFavorite={handleToggleFavorite}
        onEdit={(r) => setEditRecordId(r.id)}
        onDelete={(r) => setDeleteTarget(r)}
        onRefresh={fetchRecent}
        emptyTitle="暂无最近使用记录"
        emptyDescription="使用过的记录会显示在这里"
      />
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="删除记录"
        message={deleteTarget ? `确定删除"${deleteTarget.title}"吗？记录将移至回收站。` : ''}
        confirmText="删除"
        danger
      />
    </>
  );
}
