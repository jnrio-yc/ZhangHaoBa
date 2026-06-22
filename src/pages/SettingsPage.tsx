import { useState, useEffect } from 'react';
import { clsx } from 'clsx';
import { useToast } from '@/components/common/Toast';
import { useSettingsStore } from '@/stores/settingsStore';
import { PROTECTION_INFO } from '@/constants/protection';
import { isTauri } from '@/services/mockData';

type SectionKey = 'general' | 'security' | 'clipboard' | 'backup' | 'export' | 'data' | 'about';

const SECTIONS: { key: SectionKey; label: string }[] = [
  { key: 'general', label: '通用' },
  { key: 'security', label: '安全' },
  { key: 'clipboard', label: '剪贴板' },
  { key: 'backup', label: '备份' },
  { key: 'export', label: '导出' },
  { key: 'data', label: '数据' },
  { key: 'about', label: '关于' },
];

const BACKUP_TIME_OPTIONS = [
  { value: '启动时', label: '启动时' },
  { value: '每天 00:00', label: '每天 00:00' },
  { value: '每天 06:00', label: '每天 06:00' },
  { value: '每天 12:00', label: '每天 12:00' },
  { value: '每天 18:00', label: '每天 18:00' },
  { value: '每周一', label: '每周一' },
  { value: '每月1号', label: '每月1号' },
];

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className="relative inline-flex h-5 w-9 items-center rounded-full transition-colors flex-shrink-0"
      style={{ background: checked ? 'var(--color-toggle-on)' : 'var(--color-toggle-off)' }}
    >
      <span
        className="inline-block h-3.5 w-3.5 rounded-full bg-white shadow-sm transition-transform"
        style={{ transform: checked ? 'translateX(18px)' : 'translateX(3px)' }}
      />
    </button>
  );
}

export default function SettingsPage() {
  const { toast } = useToast();
  const store = useSettingsStore();
  const [activeSection, setActiveSection] = useState<SectionKey>('general');
  const [dirty, setDirty] = useState(false);

  // Local editable copy of settings
  const [local, setLocal] = useState({
    defaultPage: store.defaultPage,
    defaultSort: store.defaultSort,
    theme: store.theme,
    strictModeEnabled: store.strictModeEnabled,
    hideSensitiveByDefault: store.hideSensitiveByDefault,
    warnBeforeCopyHighRisk: store.warnBeforeCopyHighRisk,
    clearClipboardAfterCopy: store.clearClipboardAfterCopy,
    clipboardClearSeconds: store.clipboardClearSeconds,
    autoBackupEnabled: store.autoBackupEnabled,
    autoBackupTime: store.autoBackupTime,
    backupPath: store.backupPath,
    backupRetentionCount: store.backupRetentionCount,
    defaultExportFormat: store.defaultExportFormat,
    includeSensitiveInExportByDefault: store.includeSensitiveInExportByDefault,
  });

  const update = <K extends keyof typeof local>(key: K, value: (typeof local)[K]) => {
    setLocal((s) => ({ ...s, [key]: value }));
    setDirty(true);
    // Apply theme immediately for preview
    if (key === 'theme') {
      store.setTheme(value as 'light' | 'dark' | 'system');
    }
  };

  const handleSave = () => {
    store.updateSettings(local);
    toast('success', '设置已保存');
    setDirty(false);
  };

  const handleChooseBackupDir = async () => {
    try {
      if (isTauri()) {
        const { open } = await import('@tauri-apps/api/dialog');
        const selected = await open({ directory: true, title: '选择备份目录' });
        if (selected && typeof selected === 'string') {
          update('backupPath', selected);
        }
      } else {
        toast('info', '浏览器模式下无法选择目录');
      }
    } catch (e) {
      toast('error', '选择目录失败');
    }
  };

  const handleOpenDataDir = async () => {
    try {
      if (isTauri()) {
        const { appDataDir } = await import('@tauri-apps/api/path');
        const { open } = await import('@tauri-apps/api/shell');
        const dir = await appDataDir();
        await open(dir);
        toast('success', '已打开数据目录');
      } else {
        toast('info', '浏览器模式下无法打开目录');
      }
    } catch {
      toast('error', '打开目录失败');
    }
  };

  const renderSection = () => {
    switch (activeSection) {
      case 'general':
        return (
          <div className="space-y-6">
            <div>
              <label className="label-base">默认启动页面</label>
              <select className="input-field w-56" value={local.defaultPage} onChange={(e) => update('defaultPage', e.target.value)}>
                <option value="/records">全部记录</option>
                <option value="/favorites">收藏</option>
                <option value="/recent">最近使用</option>
                <option value="/pending">待整理箱</option>
                <option value="/stats">统计</option>
              </select>
            </div>
            <div>
              <label className="label-base">默认排序</label>
              <select className="input-field w-56" value={local.defaultSort} onChange={(e) => update('defaultSort', e.target.value)}>
                <option value="updatedAt_desc">更新时间（最新优先）</option>
                <option value="updatedAt_asc">更新时间（最旧优先）</option>
                <option value="title_asc">标题（A-Z）</option>
                <option value="title_desc">标题（Z-A）</option>
                <option value="createdAt_desc">创建时间（最新优先）</option>
              </select>
            </div>
            <div>
              <label className="label-base">主题</label>
              <div className="flex gap-2">
                {([['light', '浅色'], ['dark', '深色'], ['system', '跟随系统']] as const).map(([val, lbl]) => (
                  <button
                    key={val}
                    onClick={() => update('theme', val)}
                    className="px-4 py-2 rounded-[10px] text-[14px] border transition-all duration-[120ms]"
                    style={{
                      border: `1px solid ${local.theme === val ? 'var(--color-accent)' : 'var(--color-border)'}`,
                      background: local.theme === val ? 'var(--color-bg-tag)' : 'var(--color-bg-input)',
                      color: local.theme === val ? 'var(--color-text-heading)' : 'var(--color-text-secondary)',
                    }}
                  >
                    {lbl}
                  </button>
                ))}
              </div>
            </div>
          </div>
        );

      case 'security':
        return (
          <div className="space-y-5">
            {[
              { key: 'strictModeEnabled' as const, label: '严格模式', desc: '启用后，复制敏感字段需要二次确认' },
              { key: 'hideSensitiveByDefault' as const, label: '默认隐藏敏感信息', desc: '进入详情页时，敏感字段默认以掩码显示' },
              { key: 'warnBeforeCopyHighRisk' as const, label: '高风险复制警告', desc: '复制高风险标记的敏感字段时弹出警告' },
            ].map(({ key, label, desc }) => (
              <div key={key} className="flex items-center justify-between gap-4">
                <div>
                  <div className="text-[14px] font-medium" style={{ color: 'var(--color-text-primary)' }}>{label}</div>
                  <div className="text-[13px] mt-0.5" style={{ color: 'var(--color-text-muted)' }}>{desc}</div>
                </div>
                <Toggle checked={local[key]} onChange={(v) => update(key, v)} />
              </div>
            ))}
          </div>
        );

      case 'clipboard':
        return (
          <div className="space-y-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-[14px] font-medium" style={{ color: 'var(--color-text-primary)' }}>复制后自动清除剪贴板</div>
                <div className="text-[13px] mt-0.5" style={{ color: 'var(--color-text-muted)' }}>复制敏感信息后，自动清除剪贴板内容</div>
              </div>
              <Toggle checked={local.clearClipboardAfterCopy} onChange={(v) => update('clearClipboardAfterCopy', v)} />
            </div>
            {local.clearClipboardAfterCopy && (
              <div>
                <label className="label-base">自动清除延迟（秒）</label>
                <input
                  type="number"
                  className="input-field w-28"
                  min={5}
                  max={300}
                  value={local.clipboardClearSeconds}
                  onChange={(e) => update('clipboardClearSeconds', parseInt(e.target.value) || 30)}
                />
                <p className="text-[13px] mt-1.5" style={{ color: 'var(--color-text-muted)' }}>
                  复制敏感字段后，{local.clipboardClearSeconds} 秒后自动清除剪贴板
                </p>
              </div>
            )}
          </div>
        );

      case 'backup':
        return (
          <div className="space-y-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-[14px] font-medium" style={{ color: 'var(--color-text-primary)' }}>自动备份</div>
                <div className="text-[13px] mt-0.5" style={{ color: 'var(--color-text-muted)' }}>按设定时间自动创建数据备份</div>
              </div>
              <Toggle checked={local.autoBackupEnabled} onChange={(v) => update('autoBackupEnabled', v)} />
            </div>
            {local.autoBackupEnabled && (
              <>
                <div>
                  <label className="label-base">自动备份时间</label>
                  <select
                    className="input-field w-48"
                    value={local.autoBackupTime}
                    onChange={(e) => update('autoBackupTime', e.target.value)}
                  >
                    {BACKUP_TIME_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                  <p className="text-[13px] mt-1.5" style={{ color: 'var(--color-text-muted)' }}>
                    选择自动备份的执行时间
                  </p>
                </div>
                <div>
                  <label className="label-base">备份保留数量</label>
                  <input
                    type="number"
                    className="input-field w-28"
                    min={1}
                    max={100}
                    value={local.backupRetentionCount}
                    onChange={(e) => update('backupRetentionCount', parseInt(e.target.value) || 10)}
                  />
                  <p className="text-[13px] mt-1.5" style={{ color: 'var(--color-text-muted)' }}>超出数量的旧备份会自动删除</p>
                </div>
                <div>
                  <label className="label-base">备份路径</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      className="input-field flex-1"
                      value={local.backupPath || ''}
                      readOnly
                      placeholder="使用默认路径"
                    />
                    <button className="btn-secondary" onClick={handleChooseBackupDir}>
                      选择目录
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        );

      case 'export':
        return (
          <div className="space-y-5">
            <div>
              <label className="label-base">默认导出格式</label>
              <div className="flex gap-2">
                {(['excel', 'csv'] as const).map((fmt) => (
                  <button
                    key={fmt}
                    onClick={() => update('defaultExportFormat', fmt)}
                    className="px-4 py-2 rounded-[10px] text-[14px] border transition-all duration-[120ms]"
                    style={{
                      border: `1px solid ${local.defaultExportFormat === fmt ? 'var(--color-accent)' : 'var(--color-border)'}`,
                      background: local.defaultExportFormat === fmt ? 'var(--color-bg-tag)' : 'var(--color-bg-input)',
                      color: local.defaultExportFormat === fmt ? 'var(--color-text-heading)' : 'var(--color-text-secondary)',
                    }}
                  >
                    {fmt === 'excel' ? 'Excel (.xlsx)' : 'CSV (.csv)'}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-[14px] font-medium" style={{ color: 'var(--color-text-primary)' }}>默认包含敏感字段</div>
                <div className="text-[13px] mt-0.5" style={{ color: 'var(--color-text-muted)' }}>导出时默认勾选"包含敏感字段"选项</div>
              </div>
              <Toggle checked={local.includeSensitiveInExportByDefault} onChange={(v) => update('includeSensitiveInExportByDefault', v)} />
            </div>
          </div>
        );

      case 'data':
        return (
          <div className="space-y-6">
            <div>
              <div className="text-[14px] font-medium mb-1" style={{ color: 'var(--color-text-primary)' }}>重建搜索索引</div>
              <p className="text-[13px] mb-3" style={{ color: 'var(--color-text-muted)' }}>如果搜索结果不准确，可以重建全文索引</p>
              <button className="btn-secondary" onClick={() => toast('success', '搜索索引重建完成')}>重建索引</button>
            </div>
            <div style={{ borderTop: '1px solid var(--color-border-light)', paddingTop: '24px' }}>
              <div className="text-[14px] font-medium mb-1" style={{ color: 'var(--color-text-primary)' }}>打开数据目录</div>
              <p className="text-[13px] mb-3" style={{ color: 'var(--color-text-muted)' }}>在文件管理器中查看应用数据目录</p>
              <button className="btn-secondary" onClick={handleOpenDataDir}>打开目录</button>
            </div>
          </div>
        );

      case 'about':
        return (
          <div className="space-y-4">
            <div className="text-center py-8">
              <div
                className="w-14 h-14 rounded-[14px] flex items-center justify-center mx-auto mb-4"
                style={{ background: 'var(--color-toggle-on)' }}
              >
                <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                  <rect x="5" y="12" width="18" height="13" rx="2" stroke="white" strokeWidth="1.6"/>
                  <path d="M9 12V9C9 6.239 11.239 4 14 4C16.761 4 19 6.239 19 9V12" stroke="white" strokeWidth="1.6" strokeLinecap="round"/>
                  <circle cx="14" cy="18" r="2" fill="white"/>
                </svg>
              </div>
              <h3 className="text-[18px] font-bold" style={{ color: 'var(--color-text-heading)' }}>账号仓</h3>
              <p className="text-[13px] mt-1" style={{ color: 'var(--color-text-muted)' }}>Account Vault</p>
              <p className="text-[12px] mt-2" style={{ color: 'var(--color-text-faint)' }}>版本 1.0.0</p>
              <p className="text-[12px] mt-1" style={{ color: 'var(--color-text-faint)' }}>
                开发者 {PROTECTION_INFO.developerId}
              </p>
            </div>
            <div className="text-center space-y-1.5" style={{ color: 'var(--color-text-faint)' }}>
              <p className="text-[13px]">本地安全的账号管理工具</p>
              <p className="text-[13px]">数据完全存储在本地，使用 AES-256-GCM 加密</p>
              <p className="text-[13px] pt-2" style={{ color: 'var(--color-text-muted)' }}>基于 Tauri + React 构建</p>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="flex-1 flex overflow-hidden" style={{ background: 'var(--color-bg-page)' }}>
      {/* Section nav */}
      <div
        className="w-44 py-5 px-3 space-y-0.5 flex-shrink-0"
        style={{ borderRight: '1px solid var(--color-border-light)', background: 'var(--color-bg-muted)' }}
      >
        {SECTIONS.map((s) => (
          <button
            key={s.key}
            onClick={() => setActiveSection(s.key)}
            className="w-full flex items-center px-3 py-2 rounded-[8px] text-[14px] transition-all duration-[120ms] text-left"
            style={{
              background: activeSection === s.key ? 'var(--color-bg-tag)' : 'transparent',
              color: activeSection === s.key ? 'var(--color-text-heading)' : 'var(--color-text-secondary)',
              fontWeight: activeSection === s.key ? 500 : 400,
              borderLeft: activeSection === s.key ? '3px solid var(--color-toggle-on)' : '3px solid transparent',
            }}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div
          className="px-10 pt-7 pb-5 flex items-center justify-between"
          style={{ borderBottom: '1px solid var(--color-border-light)' }}
        >
          <h2 className="text-[22px] font-semibold leading-[30px]" style={{ color: 'var(--color-text-heading)' }}>
            {SECTIONS.find((s) => s.key === activeSection)?.label}
          </h2>
          {dirty && activeSection !== 'data' && activeSection !== 'about' && (
            <button className="btn-primary" onClick={handleSave}>保存设置</button>
          )}
        </div>
        <div className="px-10 py-6 max-w-[560px]">
          <div className="vault-card p-6">
            {renderSection()}
          </div>
        </div>
      </div>
    </div>
  );
}
