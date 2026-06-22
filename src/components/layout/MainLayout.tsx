import { useCallback, useEffect, useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { clsx } from 'clsx';
import { useFolderStore } from '@/stores/folderStore';
import { useTagStore } from '@/stores/tagStore';
import { useUIStore } from '@/stores/uiStore';
import SearchPanel from '@/components/search/SearchPanel';
import Dialog from '@/components/common/Dialog';
import { folderService } from '@/services/folderService';
import { recordService } from '@/services/recordService';
import { useToast } from '@/components/common/Toast';
import RecordEditPage from '@/pages/RecordEditPage';
import { PROTECTION_INFO } from '@/constants/protection';

/* ── Inline SVG Icons (14px, matching Frame B design) ── */
const Icons = {
  Logo: () => (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
      <rect x="1.5" y="1.5" width="5" height="5" rx="1.5" fill="white"/>
      <rect x="8.5" y="1.5" width="5" height="5" rx="1.5" fill="white" opacity=".45"/>
      <rect x="1.5" y="8.5" width="5" height="5" rx="1.5" fill="white" opacity=".45"/>
      <rect x="8.5" y="8.5" width="5" height="5" rx="1.5" fill="white"/>
    </svg>
  ),
  Plus: () => (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
      <path d="M6 2V10M2 6H10" stroke="white" strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  ),
  AllRecords: () => (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M1.5 3.5H12.5M1.5 7H12.5M1.5 10.5H8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
    </svg>
  ),
  Clock: () => (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.3"/>
      <path d="M7 4.5V7L9 8.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  Star: () => (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M7 1.5L8.5 5.2H12.3L9.2 7.4L10.3 11.2L7 9L3.7 11.2L4.8 7.4L1.7 5.2H5.5L7 1.5Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
    </svg>
  ),
  Inbox: () => (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <rect x="1.5" y="3" width="11" height="8.5" rx="1.5" stroke="currentColor" strokeWidth="1.3"/>
      <path d="M1.5 7.5H5L6 10H8L9 7.5H12.5" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
    </svg>
  ),
  Settings: () => (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <circle cx="7" cy="7" r="2" stroke="currentColor" strokeWidth="1.3"/>
      <path d="M7 1.5V3M7 11V12.5M1.5 7H3M11 7H12.5M2.9 2.9L3.9 3.9M10.1 10.1L11.1 11.1M2.9 11.1L3.9 10.1M10.1 3.9L11.1 2.9" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
    </svg>
  ),
  BarChart: () => (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <line x1="3" y1="11" x2="3" y2="6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
      <line x1="7" y1="11" x2="7" y2="3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
      <line x1="11" y1="11" x2="11" y2="7" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
    </svg>
  ),
  Trash: () => (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M2.5 4.5H11.5M5.5 4.5V3C5.5 2.45 5.95 2 6.5 2H7.5C8.05 2 8.5 2.45 8.5 3V4.5M4 4.5V11.5C4 12.05 4.45 12.5 5 12.5H9C9.55 12.5 10 12.05 10 11.5V4.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
    </svg>
  ),
  Archive: () => (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <rect x="1.5" y="2" width="11" height="3" rx="1" stroke="currentColor" strokeWidth="1.3"/>
      <path d="M2.5 5V11C2.5 11.55 2.95 12 3.5 12H10.5C11.05 12 11.5 11.55 11.5 11V5" stroke="currentColor" strokeWidth="1.3"/>
      <path d="M5.5 8H8.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
    </svg>
  ),
  FolderPlus: () => (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
      <path d="M6 2.5V9.5M2.5 6H9.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
    </svg>
  ),
};

const NAV_ITEMS = [
  { path: '/records', label: '全部记录', Icon: Icons.AllRecords },
  { path: '/recent', label: '最近使用', Icon: Icons.Clock },
  { path: '/favorites', label: '收藏', Icon: Icons.Star },
  { path: '/pending', label: '待整理箱', Icon: Icons.Inbox },
];

export default function MainLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { folders, setFolders } = useFolderStore();
  const { tags } = useTagStore();
  const {
    searchOpen,
    createRecordOpen,
    editRecordId,
    setSearchOpen,
    setCreateRecordOpen,
    setEditRecordId,
  } = useUIStore();
  const { toast } = useToast();
  const [folderDialogOpen, setFolderDialogOpen] = useState(false);
  const [folderName, setFolderName] = useState('');
  const [folderSaving, setFolderSaving] = useState(false);

  const [totalRecords, setTotalRecords] = useState(0);

  const refreshRecordTotal = useCallback(async () => {
    try {
      const res = await recordService.list({ page: 1, pageSize: 1 });
      if (res.success && res.data) setTotalRecords(res.data.total);
    } catch { /* ignore */ }
  }, []);

  const refreshFolders = async () => {
    try {
      const res = await folderService.list();
      if (res.success && res.data) setFolders(res.data);
    } catch { /* ignore */ }
  };

  useEffect(() => {
    refreshFolders();
    refreshRecordTotal();
  }, []);

  useEffect(() => {
    const handleRecordUpdated = () => {
      refreshRecordTotal();
      refreshFolders();
    };
    window.addEventListener('account-vault-record-updated', handleRecordUpdated);
    return () => window.removeEventListener('account-vault-record-updated', handleRecordUpdated);
  }, [refreshRecordTotal]);

  useEffect(() => {
    if (location.pathname === '/records/new') {
      setCreateRecordOpen(true);
      navigate('/records', { replace: true });
    }
    const editMatch = location.pathname.match(/^\/records\/([^/]+)\/edit$/);
    if (editMatch?.[1]) {
      setEditRecordId(editMatch[1]);
      navigate('/records', { replace: true });
    }
  }, [location.pathname, navigate, setCreateRecordOpen, setEditRecordId]);

  const handleCreateFolder = async () => {
    const name = folderName.trim();
    if (!name) { toast('error', '请输入文件夹名称'); return; }
    setFolderSaving(true);
    try {
      const res = await folderService.create({ name });
      if (res.success) {
        toast('success', '文件夹已创建');
        setFolderDialogOpen(false);
        setFolderName('');
        await refreshFolders();
      } else {
        toast('error', res.error?.message || '创建失败');
      }
    } catch {
      toast('error', '创建失败');
    } finally {
      setFolderSaving(false);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(true);
      }
      if (e.key === 'Escape') setSearchOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setSearchOpen]);

  const isActive = (path: string) =>
    location.pathname === path || (path === '/records' && location.pathname === '/');

  return (
    <div className="flex h-full" style={{ background: '#F4F2EC' }}>
      {/* ── Sidebar ── */}
      <aside
        className="flex flex-col select-none flex-shrink-0 h-full overflow-hidden"
        style={{ width: '220px', background: '#F4F2EC', borderRight: '1px solid #E3DDD4' }}
      >
        {/* Brand + New button */}
        <div style={{ padding: '18px 14px 14px' }}>
          <div className="flex items-center gap-[9px]" style={{ marginBottom: '14px' }}>
            <div
              className="flex items-center justify-center flex-shrink-0"
              style={{ width: '28px', height: '28px', borderRadius: '7px', background: '#EA580C' }}
            >
              <Icons.Logo />
            </div>
            <span style={{ fontSize: '15px', fontWeight: 700, color: '#1C1917', letterSpacing: '-0.2px' }}>
              账号仓
            </span>
          </div>
          <button
            onClick={() => setCreateRecordOpen(true)}
            className="w-full flex items-center justify-center gap-[6px]"
            style={{
              height: '34px', borderRadius: '8px', background: '#EA580C',
              fontSize: '13px', fontWeight: 600, color: 'white',
            }}
          >
            <Icons.Plus />
            新增记录
          </button>
        </div>

        {/* Main nav */}
        <div style={{ padding: '2px 8px 10px', borderBottom: '1px solid #E3DDD4' }}>
          {NAV_ITEMS.map((item) => {
            const active = isActive(item.path);
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={clsx('sidebar-nav-item', active && 'active')}
                style={{ marginBottom: '1px' }}
              >
                <span style={{ color: active ? '#EA580C' : '#A8A09A' }}>
                  <item.Icon />
                </span>
                <span className="flex-1 text-left">{item.label}</span>
                {item.path === '/records' && active && (
                  <span style={{
                    fontSize: '10px', fontWeight: 700, color: '#EA580C',
                    background: 'rgba(234, 88, 12, 0.12)', borderRadius: '9px',
                    padding: '1px 7px',
                  }}>
                    {totalRecords}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Projects / Folders */}
        <div className="flex-1 overflow-y-auto" style={{ padding: '12px 8px' }}>
          <div className="flex items-center justify-between" style={{ padding: '0 9px', marginBottom: '6px' }}>
            <span style={{ fontSize: '10px', fontWeight: 700, color: '#B8B0A6', textTransform: 'uppercase', letterSpacing: '0.9px' }}>
              项目
            </span>
            <button
              onClick={() => setFolderDialogOpen(true)}
              style={{ color: '#B8B0A6' }}
              className="hover:text-[#78716C] transition-colors"
              title="新建项目"
            >
              <Icons.FolderPlus />
            </button>
          </div>
          {folders.map((folder) => {
            const active = location.pathname === `/folder/${folder.id}`;
            return (
              <button
                key={folder.id}
                onClick={() => navigate(`/folder/${folder.id}`)}
                className="w-full flex items-center gap-2 transition-all duration-[120ms]"
                style={{
                  height: '34px', padding: '0 9px', borderRadius: '7px',
                  background: active ? '#FFF2EA' : 'transparent',
                  marginBottom: '1px',
                }}
              >
                <div
                  className="flex-shrink-0"
                  style={{
                    width: '8px', height: '8px', borderRadius: '2px',
                    background: folder.color || '#A8A09A',
                  }}
                />
                <span
                  className="flex-1 text-left truncate"
                  style={{
                    fontSize: '13px', fontWeight: active ? 500 : 400,
                    color: active ? '#EA580C' : '#78716C',
                  }}
                >
                  {folder.name}
                </span>
                <span style={{
                  fontSize: '11px',
                  color: active ? 'rgba(234, 88, 12, 0.5)' : '#B8B0A6',
                }}>
                  {folder.recordCount}
                </span>
              </button>
            );
          })}

          {/* Tags */}
          <div style={{ marginTop: '16px' }}>
            <div style={{ padding: '0 9px', marginBottom: '7px' }}>
              <span style={{ fontSize: '10px', fontWeight: 700, color: '#B8B0A6', textTransform: 'uppercase', letterSpacing: '0.9px' }}>
                标签
              </span>
            </div>
            <div className="flex flex-wrap gap-[5px]" style={{ padding: '0 9px' }}>
              {tags.slice(0, 8).map((tag) => {
                const active = location.pathname === `/tag/${tag.id}`;
                return (
                  <button
                    key={tag.id}
                    onClick={() => navigate(`/tag/${tag.id}`)}
                    className="transition-all duration-[120ms]"
                    style={{
                      fontSize: '11px',
                      fontWeight: active ? 500 : 400,
                      color: active ? tag.color : '#78716C',
                      background: active ? `${tag.color}14` : 'white',
                      border: `1px solid ${active ? `${tag.color}30` : '#E3DDD4'}`,
                      borderRadius: '10px',
                      padding: '2px 9px',
                    }}
                  >
                    {tag.name}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Bottom nav */}
        <div style={{ padding: '8px', borderTop: '1px solid #E3DDD4' }}>
          {[
            { path: '/stats', label: '统计', Icon: Icons.BarChart },
            { path: '/backup', label: '备份导出', Icon: Icons.Archive },
            { path: '/trash', label: '回收站', Icon: Icons.Trash },
            { path: '/settings', label: '设置', Icon: Icons.Settings },
          ].map((item) => {
            const active = location.pathname === item.path;
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={clsx('sidebar-nav-item', active && 'active')}
                style={{ marginBottom: '1px', height: '34px' }}
              >
                <span style={{ color: active ? '#EA580C' : '#B8B0A6' }}>
                  <item.Icon />
                </span>
                <span className="flex-1 text-left" style={{ fontSize: '13px', color: active ? '#EA580C' : '#A8A09A' }}>
                  {item.label}
                </span>
              </button>
            );
          })}
          <div
            title={PROTECTION_INFO.copyright}
            style={{
              margin: '8px 8px 0',
              paddingTop: '8px',
              borderTop: '1px solid rgba(227, 221, 212, 0.65)',
              fontSize: '10px',
              lineHeight: '16px',
              color: '#B8B0A6',
              letterSpacing: '0.2px',
            }}
          >
            © {PROTECTION_INFO.developerId}
          </div>
        </div>
      </aside>

      {/* ── Main content ── */}
      <main className="flex-1 overflow-hidden flex flex-col" style={{ background: '#FFFFFF' }}>
        <Outlet />
      </main>

      {searchOpen && <SearchPanel onClose={() => setSearchOpen(false)} />}

      {createRecordOpen && (
        <RecordEditPage
          presentation="dialog"
          forceCreate
          onClose={() => setCreateRecordOpen(false)}
          onCreated={(recordId) => {
            setCreateRecordOpen(false);
            window.dispatchEvent(new CustomEvent('account-vault-record-updated', { detail: { id: recordId } }));
          }}
        />
      )}

      {editRecordId && (
        <RecordEditPage
          presentation="dialog"
          recordId={editRecordId}
          onClose={() => setEditRecordId(null)}
          onUpdated={(recordId) => {
            setEditRecordId(null);
            window.dispatchEvent(new CustomEvent('account-vault-record-updated', { detail: { id: recordId } }));
          }}
        />
      )}

      <Dialog
        open={folderDialogOpen}
        onClose={() => { setFolderDialogOpen(false); setFolderName(''); }}
        title="新建项目"
        size="sm"
        footer={<>
          <button className="btn-secondary" onClick={() => { setFolderDialogOpen(false); setFolderName(''); }}>取消</button>
          <button className="btn-primary" onClick={handleCreateFolder} disabled={folderSaving}>
            {folderSaving ? '创建中...' : '创建'}
          </button>
        </>}
      >
        <div>
          <label className="label-base">项目名称</label>
          <input
            type="text"
            className="input-field w-full"
            value={folderName}
            onChange={(e) => setFolderName(e.target.value)}
            placeholder="输入项目名称"
            autoFocus
            onKeyDown={(e) => { if (e.key === 'Enter') handleCreateFolder(); }}
          />
        </div>
      </Dialog>
    </div>
  );
}
