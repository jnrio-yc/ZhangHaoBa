import { useEffect, useCallback, useState } from 'react';
import { useRecordStore } from '@/stores/recordStore';
import { recordService } from '@/services/recordService';
import { useToast } from '@/components/common/Toast';
import { useUIStore } from '@/stores/uiStore';
import RecordMasterDetail from '@/components/record/RecordMasterDetail';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import type { RecordListItem } from '@/types/record';

export default function FavoritesPage() {
  const { toast } = useToast();
  const { setEditRecordId } = useUIStore();
  const { items, total, loading, selectedId, setItems, setLoading, setSelectedId } = useRecordStore();
  const [deleteTarget, setDeleteTarget] = useState<RecordListItem | null>(null);

  const fetchFavorites = useCallback(async () => {
    setLoading(true);
    try {
      const res = await recordService.list({
        isFavorite: true,
        sort: 'updated_desc',
        page: 1,
        pageSize: 200,
      });
      if (res.success && res.data) {
        setItems(res.data.items, res.data.total);
      } else {
        toast('error', res.error?.message || '加载收藏失败');
      }
    } catch {
      toast('error', '加载收藏失败');
    } finally {
      setLoading(false);
    }
  }, [setLoading, setItems, toast]);

  useEffect(() => {
    fetchFavorites();
    setSelectedId(null);
  }, [fetchFavorites, setSelectedId]);

  useEffect(() => {
    const handler = () => fetchFavorites();
    window.addEventListener('account-vault-record-updated', handler);
    return () => window.removeEventListener('account-vault-record-updated', handler);
  }, [fetchFavorites]);

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
        fetchFavorites();
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
        title="收藏"
        count={total}
        items={items}
        loading={loading}
        selectedId={selectedId}
        onSelect={setSelectedId}
        onToggleFavorite={handleToggleFavorite}
        onEdit={(r) => setEditRecordId(r.id)}
        onDelete={(r) => setDeleteTarget(r)}
        onRefresh={fetchFavorites}
        emptyTitle="暂无收藏"
        emptyDescription="点击记录详情中的星标按钮将其加入收藏"
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
