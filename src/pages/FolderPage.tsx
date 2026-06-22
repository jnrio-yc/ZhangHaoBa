import { useState, useEffect, useCallback } from 'react';
import { useFolderStore } from '@/stores/folderStore';
import { folderService } from '@/services/folderService';
import { useToast } from '@/components/common/Toast';
import Dialog from '@/components/common/Dialog';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import EmptyState from '@/components/common/EmptyState';
import Loading from '@/components/common/Loading';
import type { FolderTreeItem } from '@/types/folder';

interface FolderFormState {
  name: string;
  parentId?: string;
}

function FolderIcon({ hasChildren }: { hasChildren: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ color: '#9CA3AF' }}>
      {hasChildren ? (
        <path d="M1.5 12V4.5C1.5 3.948 1.948 3.5 2.5 3.5H6.586L7.793 4.707A1 1 0 008.5 5H13.5C14.052 5 14.5 5.448 14.5 6V12C14.5 12.552 14.052 13 13.5 13H2.5C1.948 13 1.5 12.552 1.5 12Z" stroke="currentColor" strokeWidth="1.2" fill="none"/>
      ) : (
        <>
          <path d="M1.5 12V5C1.5 4.448 1.948 4 2.5 4H6.086L7.293 5.207A1 1 0 008 5.5H13.5C14.052 5.5 14.5 5.948 14.5 6.5V12C14.5 12.552 14.052 13 13.5 13H2.5C1.948 13 1.5 12.552 1.5 12Z" stroke="currentColor" strokeWidth="1.2" fill="none"/>
        </>
      )}
    </svg>
  );
}

export default function FolderPage() {
  const { toast } = useToast();
  const { folders, loading, setFolders, setLoading } = useFolderStore();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingFolder, setEditingFolder] = useState<FolderTreeItem | null>(null);
  const [form, setForm] = useState<FolderFormState>({ name: '' });
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<FolderTreeItem | null>(null);

  const fetchFolders = useCallback(async () => {
    setLoading(true);
    try {
      const res = await folderService.list();
      if (res.success && res.data) {
        setFolders(res.data);
      } else {
        toast('error', res.error?.message || '加载文件夹失败');
      }
    } catch {
      toast('error', '加载文件夹失败');
    } finally {
      setLoading(false);
    }
  }, [setLoading, setFolders, toast]);

  useEffect(() => { fetchFolders(); }, [fetchFolders]);

  function openCreateDialog(parentId?: string) {
    setEditingFolder(null);
    setForm({ name: '', parentId });
    setDialogOpen(true);
  }

  function openEditDialog(folder: FolderTreeItem) {
    setEditingFolder(folder);
    setForm({ name: folder.name, parentId: folder.parentId });
    setDialogOpen(true);
  }

  function closeDialog() {
    setDialogOpen(false);
    setEditingFolder(null);
    setForm({ name: '' });
  }

  async function handleSave() {
    const trimmedName = form.name.trim();
    if (!trimmedName) { toast('warning', '请输入文件夹名称'); return; }
    setSaving(true);
    try {
      if (editingFolder) {
        const res = await folderService.update({ id: editingFolder.id, name: trimmedName });
        if (res.success) { toast('success', '文件夹已更新'); }
        else { toast('error', res.error?.message || '更新失败'); setSaving(false); return; }
      } else {
        const res = await folderService.create({ name: trimmedName, parentId: form.parentId });
        if (res.success) { toast('success', '文件夹已创建'); }
        else { toast('error', res.error?.message || '创建失败'); setSaving(false); return; }
      }
      closeDialog();
      await fetchFolders();
    } catch {
      toast('error', editingFolder ? '更新失败' : '创建失败');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      const res = await folderService.delete({ id: deleteTarget.id, recordHandling: 'move_to_pending' });
      if (res.success) {
        toast('success', '文件夹已删除');
        setDeleteTarget(null);
        await fetchFolders();
      } else {
        toast('error', res.error?.message || '删除失败');
      }
    } catch {
      toast('error', '删除失败');
    }
  }

  function countTotal(folder: FolderTreeItem): number {
    return folder.recordCount + (folder.children ?? []).reduce((sum, c) => sum + countTotal(c), 0);
  }

  function renderFolderRow(folder: FolderTreeItem, depth: number) {
    const totalCount = countTotal(folder);
    const children = folder.children ?? [];
    return (
      <div key={folder.id}>
        <div
          className="flex items-center gap-3 py-3 group transition-colors duration-[120ms]"
          style={{
            paddingLeft: `${48 + depth * 24}px`,
            paddingRight: '48px',
            borderBottom: '1px solid #F4EFE8',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = '#FAF7F1')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
        >
          <div className="flex-shrink-0" style={{ color: '#9CA3AF' }}>
            <FolderIcon hasChildren={children.length > 0} />
          </div>
          <div className="flex-1 min-w-0 flex items-center gap-2">
            <span className="text-[14px] font-medium truncate" style={{ color: '#1F2937' }}>
              {folder.name}
            </span>
            {folder.isArchived && (
              <span
                className="tag-chip flex-shrink-0"
                style={{ background: '#F4EFE8', color: '#9CA3AF', border: '1px solid #EFE8DF' }}
              >
                已归档
              </span>
            )}
          </div>
          <span className="text-[13px] flex-shrink-0 mr-4" style={{ color: '#C2BDB5' }}>
            {totalCount} 条记录
          </span>
          <div className="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              className="btn-ghost text-[13px]"
              onClick={(e) => { e.stopPropagation(); openEditDialog(folder); }}
            >
              编辑
            </button>
            <button
              className="btn-ghost text-[13px]"
              style={{ color: '#D94B4B' }}
              onClick={(e) => { e.stopPropagation(); setDeleteTarget(folder); }}
            >
              删除
            </button>
          </div>
        </div>
        {children.map((child) => renderFolderRow(child, depth + 1))}
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full" style={{ background: '#FFFDFC' }}>
      <div
        className="flex-shrink-0 px-12 pt-7 pb-5 flex items-center justify-between"
        style={{ borderBottom: '1px solid #EFE8DF' }}
      >
        <div className="flex items-center gap-3">
          <h1 className="text-[22px] font-semibold leading-[30px]" style={{ color: '#162033' }}>文件夹管理</h1>
          <span className="text-[14px]" style={{ color: '#9CA3AF' }}>{folders.length} 个文件夹</span>
        </div>
        <button className="btn-primary" onClick={() => openCreateDialog()}>+ 新建文件夹</button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <Loading />
        ) : folders.length === 0 ? (
          <EmptyState
            title="暂无文件夹"
            description="创建文件夹来整理你的记录"
            action={{ label: '新建文件夹', onClick: () => openCreateDialog() }}
          />
        ) : (
          <div>{folders.map((folder) => renderFolderRow(folder, 0))}</div>
        )}
      </div>

      <Dialog
        open={dialogOpen}
        onClose={closeDialog}
        title={editingFolder ? '编辑文件夹' : '新建文件夹'}
        size="sm"
        footer={
          <>
            <button className="btn-secondary" onClick={closeDialog}>取消</button>
            <button className="btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? '保存中...' : '保存'}
            </button>
          </>
        }
      >
        <div>
          <label className="label-base">文件夹名称</label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
            placeholder="输入文件夹名称"
            className="input-field w-full"
            autoFocus
            onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); }}
          />
        </div>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="删除文件夹"
        message={deleteTarget ? `确定删除文件夹"${deleteTarget.name}"吗？文件夹内的记录将保留，并变为未分类。` : ''}
        confirmText="删除"
        danger
      />
    </div>
  );
}
