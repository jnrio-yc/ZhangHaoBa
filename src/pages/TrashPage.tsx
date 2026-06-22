import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/components/common/Toast';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import EmptyState from '@/components/common/EmptyState';
import Loading from '@/components/common/Loading';
import Badge from '@/components/common/Badge';
import TypeBadge from '@/components/common/TypeBadge';
import { RECORD_TYPE_CONFIG } from '@/types/record';
import type { RecordType, RecordListItem } from '@/types/record';
import { formatDate, formatRelativeTime } from '@/utils/format';

export default function TrashPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [items, setItems] = useState<RecordListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [emptyConfirm, setEmptyConfirm] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    // trashService.list().then(res => { if (res.success) setItems(res.data.items); })
  }, []);

  const handleRestore = (id: string) => {
    // recordService.restore({ id })
    setItems(items.filter((i) => i.id !== id));
    toast('success', '已恢复');
  };

  const handlePermanentDelete = () => {
    if (!deletingId) return;
    // recordService.permanentDelete(deletingId)
    setItems(items.filter((i) => i.id !== deletingId));
    toast('success', '已彻底删除');
    setDeleteConfirm(false);
  };

  const handleEmptyTrash = () => {
    // trashService.empty('清空回收站')
    setItems([]);
    toast('success', '回收站已清空');
    setEmptyConfirm(false);
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden" style={{ background: '#FFFDFC' }}>
      <div
        className="px-12 pt-7 pb-5 flex items-center justify-between flex-shrink-0"
        style={{ borderBottom: '1px solid #EFE8DF' }}
      >
        <div className="flex items-center gap-3">
          <h1 className="text-[22px] font-semibold leading-[30px]" style={{ color: '#162033' }}>回收站</h1>
          <span className="text-[14px]" style={{ color: '#9CA3AF' }}>{items.length} 条已删除记录</span>
        </div>
        {items.length > 0 && (
          <button className="btn-danger" onClick={() => setEmptyConfirm(true)}>
            清空回收站
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto py-3">
        {loading ? <Loading /> : items.length === 0 ? (
          <EmptyState title="回收站为空" description="删除的记录会保留在这里，可随时恢复" />
        ) : (
          <div className="space-y-2 pb-4">
            {items.map((item) => {
              const config = RECORD_TYPE_CONFIG[item.type as RecordType];
              return (
                <div
                  key={item.id}
                  className="vault-card mx-4 px-5 py-4 transition-colors duration-[120ms]"
                >
                  <div className="flex items-start gap-4">
                    <div
                      className="w-9 h-9 flex items-center justify-center flex-shrink-0 rounded-[10px]"
                      style={{ background: '#FAF7F1', border: '1px solid #EFE8DF', opacity: 0.5 }}
                    >
                      <span className="text-[16px]">{config?.icon || '📄'}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div
                        className="text-[15px] font-medium truncate line-through"
                        style={{ color: '#9CA3AF' }}
                      >
                        {item.title}
                      </div>
                      <div className="flex items-center gap-2 mt-1.5">
                        <TypeBadge type={item.type} />
                        {item.url && (
                          <span className="text-[12px] truncate max-w-[200px]" style={{ color: '#C2BDB5' }}>
                            {item.url}
                          </span>
                        )}
                        <span className="text-[12px] ml-auto" style={{ color: '#C2BDB5' }}>
                          {formatRelativeTime(item.updatedAt)}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      <button className="btn-ghost" onClick={() => handleRestore(item.id)}>恢复</button>
                      <button
                        className="btn-ghost"
                        style={{ color: '#D94B4B' }}
                        onClick={() => { setDeletingId(item.id); setDeleteConfirm(true); }}
                      >
                        彻底删除
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={emptyConfirm}
        onClose={() => setEmptyConfirm(false)}
        onConfirm={handleEmptyTrash}
        title="清空回收站"
        message="此操作将彻底删除回收站中的所有记录，包括其中的敏感信息。此操作不可恢复！"
        confirmText="清空回收站"
        danger
      />

      <ConfirmDialog
        open={deleteConfirm}
        onClose={() => setDeleteConfirm(false)}
        onConfirm={handlePermanentDelete}
        title="彻底删除"
        message="此记录将被永久删除，无法恢复。确定要继续吗？"
        confirmText="彻底删除"
        danger
      />
    </div>
  );
}
