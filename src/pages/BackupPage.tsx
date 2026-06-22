import { useState, useEffect, useCallback } from 'react';
import { save, open } from '@tauri-apps/api/dialog';
import { useToast } from '@/components/common/Toast';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import { backupService } from '@/services/backupService';
import { exportService } from '@/services/exportService';
import type { BackupHistory } from '@/types/api';
import { formatDate, formatFileSize } from '@/utils/format';

function timestamp() {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`;
}

const BACKUP_FILTERS = [
  { name: '账号仓备份', extensions: ['bak', 'db'] },
  { name: '所有文件', extensions: ['*'] },
];

export default function BackupPage() {
  const { toast } = useToast();
  const [backups, setBackups] = useState<BackupHistory[]>([]);
  const [creating, setCreating] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportFormat, setExportFormat] = useState<'excel' | 'csv'>('excel');
  const [includeSensitive, setIncludeSensitive] = useState(false);
  const [restoreTarget, setRestoreTarget] = useState<string | null>(null);

  const fetchHistory = useCallback(async () => {
    try {
      const res = await backupService.listHistory();
      if (res.success && res.data) setBackups(res.data);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  const handleCreateBackup = async () => {
    try {
      const filePath = await save({
        title: '选择备份保存位置',
        defaultPath: `账号仓-备份-${timestamp()}.bak`,
        filters: BACKUP_FILTERS,
      });
      if (!filePath) return;
      setCreating(true);
      const res = await backupService.create(filePath, true);
      if (res.success && res.data) {
        toast('success', `备份已完成（${res.data.recordCount} 条记录）`);
        await fetchHistory();
      } else {
        toast('error', res.error?.message || '备份失败');
      }
    } catch (e) {
      toast('error', '备份失败：' + (e instanceof Error ? e.message : String(e)));
    } finally {
      setCreating(false);
    }
  };

  const handlePickRestoreFile = async () => {
    try {
      const picked = await open({ title: '选择备份文件', multiple: false, filters: BACKUP_FILTERS });
      if (!picked || Array.isArray(picked)) return;
      setRestoreTarget(picked);
    } catch {
      toast('error', '选择文件失败');
    }
  };

  const handleRestore = async () => {
    if (!restoreTarget) return;
    const filePath = restoreTarget;
    try {
      const res = await backupService.restoreOverwrite(filePath);
      if (res.success) {
        toast('success', '已从备份恢复，请重启应用以生效');
      } else {
        toast('error', res.error?.message || '恢复失败');
      }
    } catch (e) {
      toast('error', '恢复失败：' + (e instanceof Error ? e.message : String(e)));
    }
    setRestoreTarget(null);
  };

  const handleExport = async () => {
    try {
      const ext = exportFormat === 'excel' ? 'xlsx' : 'csv';
      const filePath = await save({
        title: '选择导出保存位置',
        defaultPath: `账号仓-导出-${timestamp()}.${ext}`,
        filters: [{ name: exportFormat === 'excel' ? 'Excel 文件' : 'CSV 文件', extensions: [ext] }],
      });
      if (!filePath) return;
      setExporting(true);
      const res = await exportService.records({
        filePath,
        format: exportFormat,
        includeSensitive,
      });
      if (res.success && res.data) {
        toast('success', `已导出 ${res.data.recordCount} 条记录`);
      } else {
        toast('error', res.error?.message || '导出失败');
      }
    } catch (e) {
      toast('error', '导出失败：' + (e instanceof Error ? e.message : String(e)));
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto" style={{ background: 'var(--color-bg-page)' }}>
      <div className="px-12 pt-7 pb-5" style={{ borderBottom: '1px solid var(--color-border-light)' }}>
        <h1 className="text-[22px] font-semibold leading-[30px]" style={{ color: 'var(--color-text-heading)' }}>备份与导出</h1>
      </div>

      <div className="px-12 py-6 space-y-5 max-w-[680px]">
        {/* Backup section */}
        <div className="vault-card p-6">
          <h3 className="text-[16px] font-semibold mb-1.5" style={{ color: 'var(--color-text-primary)' }}>备份</h3>
          <p className="text-[14px] leading-[22px] mb-5" style={{ color: 'var(--color-text-muted)' }}>
            创建加密备份文件到本地，包含所有记录和设置。可在其它机器或重装后恢复。
          </p>
          <div className="flex gap-3 mb-6">
            <button className="btn-primary" onClick={handleCreateBackup} disabled={creating}>
              {creating ? '备份中...' : '创建备份'}
            </button>
            <button className="btn-secondary" onClick={handlePickRestoreFile}>
              从备份恢复
            </button>
          </div>

          {/* Backup history */}
          <div>
            <h4
              className="text-[12px] font-medium uppercase tracking-wider mb-3"
              style={{ color: '#B6B0A8', letterSpacing: '0.06em' }}
            >
              备份历史
            </h4>
            {backups.length === 0 ? (
              <div className="text-[14px] py-4 text-center" style={{ color: '#C2BDB5' }}>暂无备份记录</div>
            ) : (
              <div className="space-y-2">
                {backups.map((b) => (
                  <div
                    key={b.id}
                    className="flex items-center gap-4 py-3 px-4 rounded-[10px]"
                    style={{ background: '#FAF7F1', border: '1px solid #EFE8DF' }}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-[14px]" style={{ color: '#374151' }}>{formatDate(b.createdAt)}</div>
                      <div className="text-[12px] mt-0.5 truncate" style={{ color: 'var(--color-text-muted)' }} title={b.filePath}>
                        {b.fileSize ? formatFileSize(b.fileSize) : '-'} · {b.filePath}
                      </div>
                    </div>
                    <span
                      className="tag-chip"
                      style={{
                        background: b.backupStatus === 'success' ? '#EAF7EF' : '#FFF1F0',
                        color: b.backupStatus === 'success' ? '#2F9D62' : '#D94B4B',
                        border: `1px solid ${b.backupStatus === 'success' ? '#CDEBD8' : '#F8D2D2'}`,
                      }}
                    >
                      {b.backupStatus === 'success' ? '成功' : '失败'}
                    </span>
                    <button className="btn-ghost text-[13px]" onClick={() => setRestoreTarget(b.filePath)}>
                      恢复
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Export section */}
        <div className="vault-card p-6">
          <h3 className="text-[16px] font-semibold mb-1.5" style={{ color: 'var(--color-text-primary)' }}>导出</h3>
          <p className="text-[14px] leading-[22px] mb-5" style={{ color: 'var(--color-text-muted)' }}>
            将记录导出为 Excel 或 CSV 文件到本地路径。
          </p>

          <div className="space-y-5">
            <div>
              <label className="label-base">导出格式</label>
              <div className="flex gap-2">
                {(['excel', 'csv'] as const).map((fmt) => (
                  <button
                    key={fmt}
                    onClick={() => setExportFormat(fmt)}
                    className="px-4 py-2 rounded-[10px] text-[14px] border transition-all duration-[120ms]"
                    style={{
                      border: `1px solid ${exportFormat === fmt ? '#10213B' : '#E8DFD4'}`,
                      background: exportFormat === fmt ? '#F1E7DC' : '#FFFFFF',
                      color: exportFormat === fmt ? '#10213B' : '#374151',
                    }}
                  >
                    {fmt === 'excel' ? 'Excel (.xlsx)' : 'CSV (.csv)'}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeSensitive}
                  onChange={(e) => setIncludeSensitive(e.target.checked)}
                  className="rounded"
                  style={{ accentColor: '#10213B' }}
                />
                <span className="text-[14px]" style={{ color: '#374151' }}>
                  包含敏感字段（密码、API Key、卡密）
                </span>
              </label>
              {includeSensitive && (
                <p className="text-[13px] mt-2 ml-7" style={{ color: '#D94B4B' }}>
                  导出文件将包含明文敏感信息，请注意保管。
                </p>
              )}
            </div>

            <button className="btn-primary" onClick={handleExport} disabled={exporting}>
              {exporting ? '导出中...' : '选择路径并导出'}
            </button>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={!!restoreTarget}
        onClose={() => setRestoreTarget(null)}
        onConfirm={handleRestore}
        title="从备份恢复"
        message="恢复将用备份文件覆盖当前所有数据。完成后需要重启应用才能生效。确定继续吗？"
        confirmText="确认恢复"
        danger
      />
    </div>
  );
}
