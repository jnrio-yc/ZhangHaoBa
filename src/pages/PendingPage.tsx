import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/components/common/Toast';
import Dialog from '@/components/common/Dialog';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import EmptyState from '@/components/common/EmptyState';
import Loading from '@/components/common/Loading';
import Badge from '@/components/common/Badge';
import { RECORD_TYPE_CONFIG } from '@/types/record';
import type { RecordType } from '@/types/record';
import type { PendingItem } from '@/types/api';
import { formatRelativeTime } from '@/utils/format';
import { clsx } from 'clsx';

export default function PendingPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [items, setItems] = useState<PendingItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [addDialog, setAddDialog] = useState(false);
  const [rawText, setRawText] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleAdd = () => {
    if (!rawText.trim()) { toast('error', '请输入内容'); return; }
    // pendingService.create({ rawText, source: 'manual' })
    toast('success', '已添加到待整理箱');
    setRawText('');
    setAddDialog(false);
  };

  const handleResolve = (item: PendingItem) => {
    navigate('/records/new', { state: { fromPending: item.id, rawText: item.rawText } });
  };

  const handleDelete = () => {
    if (!deletingId) return;
    // pendingService.delete(deletingId)
    setItems(items.filter((i) => i.id !== deletingId));
    toast('success', '已删除');
    setDeleteDialog(false);
  };

  const handleIgnore = (id: string) => {
    // pendingService.update({ id, status: 'ignored' })
    toast('success', '已忽略');
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden" style={{ background: '#FFFDFC' }}>
      <div
        className="px-12 pt-7 pb-5 flex items-center justify-between flex-shrink-0"
        style={{ borderBottom: '1px solid #EFE8DF' }}
      >
        <div className="flex items-center gap-3">
          <h1 className="text-[22px] font-semibold leading-[30px]" style={{ color: '#162033' }}>待整理箱</h1>
          <span className="text-[14px]" style={{ color: '#9CA3AF' }}>{items.length} 条待整理</span>
        </div>
        <button className="btn-primary" onClick={() => setAddDialog(true)}>+ 手动添加</button>
      </div>

      <div className="flex-1 overflow-y-auto py-3">
        {loading ? <Loading /> : items.length === 0 ? (
          <EmptyState
            title="待整理箱是空的"
            description="从微信或文档复制一段账号信息，可以先保存到这里，之后再慢慢整理。"
            action={{ label: '粘贴内容整理', onClick: () => setAddDialog(true) }}
          />
        ) : (
          <div className="space-y-2 px-4 pb-4">
            {items.map((item) => (
              <div
                key={item.id}
                className="vault-card px-5 py-4 transition-colors duration-[120ms]"
                style={{ margin: '0 8px' }}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div
                      className="text-[14px] cursor-pointer leading-[22px]"
                      style={{ color: '#374151' }}
                      onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}
                    >
                      <span className={clsx('block', expandedId !== item.id && 'truncate')}>
                        {item.rawText}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      {item.source && (
                        <span className="tag-chip" style={{ background: '#FAF7F1', color: '#9CA3AF', border: '1px solid #EFE8DF' }}>
                          {item.source}
                        </span>
                      )}
                      <span
                        className="tag-chip"
                        style={{
                          background: item.status === 'pending' ? '#FFF4DF' : item.status === 'parsed' ? '#EAF2FF' : '#EAF7EF',
                          color: item.status === 'pending' ? '#D88A16' : item.status === 'parsed' ? '#2563EB' : '#2F9D62',
                          border: `1px solid ${item.status === 'pending' ? '#F4D7A5' : item.status === 'parsed' ? '#D7E5FF' : '#CDEBD8'}`,
                        }}
                      >
                        {item.status === 'pending' ? '待处理' : item.status === 'parsed' ? '已解析' : '已处理'}
                      </span>
                      <span className="text-[12px] ml-auto" style={{ color: '#C2BDB5' }}>
                        {formatRelativeTime(item.createdAt)}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-1 flex-shrink-0 mt-0.5">
                    <button className="btn-ghost" onClick={() => handleResolve(item)}>整理</button>
                    <button className="btn-ghost" onClick={() => handleIgnore(item.id)}>忽略</button>
                    <button
                      className="btn-ghost"
                      style={{ color: '#D94B4B' }}
                      onClick={() => { setDeletingId(item.id); setDeleteDialog(true); }}
                    >删除</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={addDialog} onClose={() => setAddDialog(false)} title="粘贴内容整理" size="md"
        footer={<>
          <button className="btn-secondary" onClick={() => setAddDialog(false)}>取消</button>
          <button className="btn-primary" onClick={handleAdd}>添加</button>
        </>}
      >
        <div>
          <label className="label-base">粘贴或输入内容</label>
          <textarea
            className="input-field resize-y font-mono"
            style={{ minHeight: '160px', fontSize: '13px' }}
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            placeholder="粘贴账号信息、API Key、环境配置等..."
            autoFocus
          />
        </div>
      </Dialog>

      <ConfirmDialog
        open={deleteDialog}
        onClose={() => setDeleteDialog(false)}
        onConfirm={handleDelete}
        title="删除待整理内容"
        message="确定要删除吗？此操作不可恢复。"
        danger
      />
    </div>
  );
}
