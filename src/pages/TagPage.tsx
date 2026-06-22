import { useState, useEffect, useCallback, useMemo } from 'react';
import { clsx } from 'clsx';
import { useTagStore } from '@/stores/tagStore';
import { tagService } from '@/services/tagService';
import { useToast } from '@/components/common/Toast';
import Dialog from '@/components/common/Dialog';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import EmptyState from '@/components/common/EmptyState';
import Loading from '@/components/common/Loading';
import type { TagView, TagGroupKey } from '@/types/tag';
import { TAG_GROUP_CONFIG } from '@/types/tag';

const PRESET_COLORS = [
  '#7C3AED', '#2563EB', '#0EA5E9',
  '#16A34A', '#84CC16', '#F59E0B',
  '#F97316', '#DC2626', '#EC4899',
];

const GROUP_KEYS = Object.keys(TAG_GROUP_CONFIG) as TagGroupKey[];

interface TagFormState {
  name: string;
  color: string;
  groupKey: TagGroupKey;
}

const defaultForm: TagFormState = { name: '', color: PRESET_COLORS[0], groupKey: 'custom' };

export default function TagPage() {
  const { toast } = useToast();
  const { tags, loading, setTags, setLoading } = useTagStore();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTag, setEditingTag] = useState<TagView | null>(null);
  const [form, setForm] = useState<TagFormState>({ ...defaultForm });
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<TagView | null>(null);

  const fetchTags = useCallback(async () => {
    setLoading(true);
    try {
      const res = await tagService.list();
      if (res.success && res.data) { setTags(res.data); }
      else { toast('error', res.error?.message || '加载标签失败'); }
    } catch {
      toast('error', '加载标签失败');
    } finally {
      setLoading(false);
    }
  }, [setLoading, setTags, toast]);

  useEffect(() => { fetchTags(); }, [fetchTags]);

  const groupedTags = useMemo(() => {
    const groups: Record<TagGroupKey, TagView[]> = {
      platform: [], status: [], usage: [], risk: [], project: [], custom: [],
    };
    for (const tag of tags) {
      const key = tag.groupKey as TagGroupKey;
      (groups[key] ?? groups.custom).push(tag);
    }
    return groups;
  }, [tags]);

  function openCreateDialog() {
    setEditingTag(null);
    setForm({ ...defaultForm });
    setDialogOpen(true);
  }

  function openEditDialog(tag: TagView) {
    setEditingTag(tag);
    setForm({ name: tag.name, color: tag.color || PRESET_COLORS[0], groupKey: tag.groupKey });
    setDialogOpen(true);
  }

  function closeDialog() {
    setDialogOpen(false);
    setEditingTag(null);
    setForm({ ...defaultForm });
  }

  async function handleSave() {
    const trimmedName = form.name.trim();
    if (!trimmedName) { toast('warning', '请输入标签名称'); return; }
    setSaving(true);
    try {
      if (editingTag) {
        const res = await tagService.update({ id: editingTag.id, name: trimmedName, color: form.color, groupKey: form.groupKey });
        if (res.success) { toast('success', '标签已更新'); }
        else { toast('error', res.error?.message || '更新失败'); setSaving(false); return; }
      } else {
        const res = await tagService.create({ name: trimmedName, color: form.color, groupKey: form.groupKey });
        if (res.success) { toast('success', '标签已创建'); }
        else { toast('error', res.error?.message || '创建失败'); setSaving(false); return; }
      }
      closeDialog();
      await fetchTags();
    } catch {
      toast('error', editingTag ? '更新失败' : '创建失败');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      const res = await tagService.delete(deleteTarget.id);
      if (res.success) {
        toast('success', '标签已删除');
        setDeleteTarget(null);
        await fetchTags();
      } else {
        toast('error', res.error?.message || '删除失败');
      }
    } catch {
      toast('error', '删除失败');
    }
  }

  return (
    <div className="flex-1 flex flex-col h-full" style={{ background: '#FFFDFC' }}>
      <div
        className="flex-shrink-0 px-12 pt-7 pb-5 flex items-center justify-between"
        style={{ borderBottom: '1px solid #EFE8DF' }}
      >
        <div className="flex items-center gap-3">
          <h1 className="text-[22px] font-semibold leading-[30px]" style={{ color: '#162033' }}>标签管理</h1>
          <span className="text-[14px]" style={{ color: '#9CA3AF' }}>{tags.length} 个标签</span>
        </div>
        <button className="btn-primary" onClick={openCreateDialog}>+ 新建标签</button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <Loading />
        ) : tags.length === 0 ? (
          <EmptyState
            title="暂无标签"
            description="创建标签来分类你的记录"
            action={{ label: '新建标签', onClick: openCreateDialog }}
          />
        ) : (
          <div className="px-12 py-6 space-y-7">
            {GROUP_KEYS.map((groupKey) => {
              const groupTags = groupedTags[groupKey];
              if (groupTags.length === 0) return null;
              const config = TAG_GROUP_CONFIG[groupKey];
              return (
                <div key={groupKey}>
                  <div className="flex items-center gap-2 mb-3">
                    <span
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ background: config.color }}
                    />
                    <span
                      className="text-[12px] font-medium uppercase tracking-wider"
                      style={{ color: '#B6B0A8', letterSpacing: '0.06em' }}
                    >
                      {config.label}
                    </span>
                    <span className="text-[12px]" style={{ color: '#C2BDB5' }}>
                      {groupTags.length}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {groupTags.map((tag) => (
                      <div
                        key={tag.id}
                        onClick={() => openEditDialog(tag)}
                        className={clsx(
                          'inline-flex items-center gap-2 pl-3 pr-2.5 rounded-full border transition-all duration-[120ms] group/tag cursor-pointer'
                        )}
                        style={{
                          height: '28px',
                          background: '#FFFFFF',
                          borderColor: '#EFE8DF',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.borderColor = '#DED6C9';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor = '#EFE8DF';
                        }}
                      >
                        <span
                          className="w-2 h-2 rounded-full flex-shrink-0"
                          style={{ background: tag.color || config.color }}
                        />
                        <span className="text-[13px]" style={{ color: '#374151' }}>{tag.name}</span>
                        <span className="text-[12px]" style={{ color: '#C2BDB5' }}>{tag.usageCount}</span>
                        <button
                          onClick={(e) => { e.stopPropagation(); setDeleteTarget(tag); }}
                          className="w-4 h-4 flex items-center justify-center rounded-full opacity-0 group-hover/tag:opacity-100 transition-opacity flex-shrink-0"
                          style={{ color: '#C2BDB5' }}
                          onMouseEnter={(e) => {
                            (e.currentTarget as HTMLElement).style.background = '#FFF1F0';
                            (e.currentTarget as HTMLElement).style.color = '#D94B4B';
                          }}
                          onMouseLeave={(e) => {
                            (e.currentTarget as HTMLElement).style.background = 'transparent';
                            (e.currentTarget as HTMLElement).style.color = '#C2BDB5';
                          }}
                          title="删除标签"
                        >
                          <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                            <path d="M1 1L7 7M7 1L1 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Dialog
        open={dialogOpen}
        onClose={closeDialog}
        title={editingTag ? '编辑标签' : '新建标签'}
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
        <div className="space-y-4">
          <div>
            <label className="label-base">标签名称</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="输入标签名称"
              className="input-field w-full"
              autoFocus
              onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); }}
            />
          </div>
          <div>
            <label className="label-base">标签颜色</label>
            <div className="flex items-center gap-2 flex-wrap">
              {PRESET_COLORS.map((color) => (
                <button
                  key={color}
                  onClick={() => setForm((prev) => ({ ...prev, color }))}
                  className="w-7 h-7 rounded-full transition-all flex items-center justify-center flex-shrink-0"
                  style={{
                    background: color,
                    outline: form.color === color ? `2px solid ${color}` : 'none',
                    outlineOffset: '2px',
                    transform: form.color === color ? 'scale(1.1)' : 'scale(1)',
                  }}
                >
                  {form.color === color && (
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                      <path d="M2 5L4.2 7.2L8 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="label-base">标签分组</label>
            <select
              value={form.groupKey}
              onChange={(e) => setForm((prev) => ({ ...prev, groupKey: e.target.value as TagGroupKey }))}
              className="input-field w-full"
            >
              {GROUP_KEYS.map((key) => (
                <option key={key} value={key}>{TAG_GROUP_CONFIG[key].label}</option>
              ))}
            </select>
          </div>
        </div>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="删除标签"
        message={deleteTarget ? `确定删除标签"${deleteTarget.name}"吗？已关联此标签的记录不会被删除。` : ''}
        confirmText="删除"
        danger
      />
    </div>
  );
}
