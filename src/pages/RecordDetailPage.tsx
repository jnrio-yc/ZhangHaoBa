import { useEffect, useCallback, useState, type CSSProperties, type ReactNode } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useRecordStore } from '@/stores/recordStore';
import { recordService } from '@/services/recordService';
import { securityService } from '@/services/securityService';
import { copyService } from '@/services/copyService';
import { useUIStore } from '@/stores/uiStore';
import { useToast } from '@/components/common/Toast';
import Loading from '@/components/common/Loading';
import EmptyState from '@/components/common/EmptyState';
import SecretField from '@/components/common/SecretField';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import { formatDate, formatRelativeTime, isExpired, isExpiringSoon } from '@/utils/format';

/* Type badge mapping */
const TYPE_BADGE: Record<string, { label: string; bg: string; color: string }> = {
  api_relay: { label: 'API中转站', bg: '#EBF3FF', color: '#2563EB' },
  api_official: { label: '官方Key', bg: '#F0ECFF', color: '#6D28D9' },
  test_environment: { label: '测试环境', bg: '#ECFDF5', color: '#059669' },
  website_account: { label: '网站账号', bg: '#F1F5F9', color: '#64748B' },
  license_key: { label: '卡密', bg: '#FFFBEB', color: '#D97706' },
  common_link: { label: '常用链接', bg: '#EEF2FF', color: '#4F46E5' },
};

/* 鈹€鈹€ Inline icons 鈹€鈹€ */
const CopyIcon = () => (
  <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
    <rect x="3" y="1" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.1"/>
    <path d="M1 4v5.5c0 .7.6 1.5 1.5 1.5H8" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round"/>
  </svg>
);

const EyeIcon = () => (
  <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
    <path d="M1 5.5c0-2.2 2-4 4.5-4s4.5 1.8 4.5 4-2 4-4.5 4-4.5-1.8-4.5-4Z" stroke="currentColor" strokeWidth="1.1"/>
    <circle cx="5.5" cy="5.5" r="1.5" fill="currentColor"/>
  </svg>
);

const FavoriteIcon = ({ filled }: { filled: boolean }) => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="m12 2 3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01Z"/>
  </svg>
);

const TrashIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 6h18"/>
    <path d="M8 6V4h8v2"/>
    <path d="M19 6l-1 14H6L5 6"/>
    <path d="M10 11v5M14 11v5"/>
  </svg>
);

interface RecordDetailPageProps {
  recordId?: string | null;
  embedded?: boolean;
  onDeleted?: () => void;
}

export default function RecordDetailPage({ recordId, embedded = false, onDeleted }: RecordDetailPageProps = {}) {
  const { id: routeId } = useParams<{ id: string }>();
  const id = recordId || routeId;
  const navigate = useNavigate();
  const { toast } = useToast();
  const { setEditRecordId } = useUIStore();
  const { detail, detailLoading, setDetail, setDetailLoading } = useRecordStore();
  const [deleteOpen, setDeleteOpen] = useState(false);

  const fetchDetail = useCallback(async () => {
    if (!id) return;
    setDetailLoading(true);
    try {
      const res = await recordService.getDetail(id);
      if (res.success && res.data) setDetail(res.data);
      else toast('error', res.error?.message || '加载详情失败');
    } catch { toast('error', '加载详情失败'); }
    finally { setDetailLoading(false); }
  }, [id, setDetail, setDetailLoading, toast]);

  useEffect(() => { fetchDetail(); return () => setDetail(null); }, [fetchDetail, setDetail]);

  useEffect(() => {
    const handleRecordUpdated = (event: Event) => {
      const updatedId = (event as CustomEvent<{ id?: string }>).detail?.id;
      if (!updatedId || updatedId === id) fetchDetail();
    };
    window.addEventListener('account-vault-record-updated', handleRecordUpdated);
    return () => window.removeEventListener('account-vault-record-updated', handleRecordUpdated);
  }, [fetchDetail, id]);

  const handleToggleFavorite = useCallback(async () => {
    if (!detail) return;
    try {
      const res = await recordService.toggleFavorite(detail.id, !detail.isFavorite);
      if (res.success && typeof res.data === 'boolean') {
        setDetail({ ...detail, isFavorite: res.data });
        toast('success', res.data ? '已收藏' : '已取消收藏');
        window.dispatchEvent(new CustomEvent('account-vault-record-updated', { detail: { id: detail.id } }));
      }
    } catch { toast('error', '操作失败'); }
  }, [detail, setDetail, toast]);

  const handleDelete = useCallback(async () => {
    if (!detail) return;
    try {
      const res = await recordService.delete(detail.id);
      if (res.success) {
        toast('success', '已移入回收站');
        if (embedded) onDeleted?.();
        else navigate(-1);
      }
      else toast('error', res.error?.message || '删除失败');
    } catch { toast('error', '删除失败'); }
    finally { setDeleteOpen(false); }
  }, [detail, embedded, navigate, onDeleted, toast]);

  const handleCopy = useCallback(async (fieldKey: string, entryId?: string, customFieldId?: string) => {
    if (!detail) return;
    try {
      const res = await copyService.copyField({ recordId: detail.id, fieldKey, entryId, customFieldId });
      if (res.success) toast('success', '已复制');
      else toast('error', res.error?.message || '复制失败');
    } catch { toast('error', '复制失败'); }
  }, [detail, toast]);

  const handleReveal = useCallback(async (fieldKey: string, entryId?: string) => {
    if (!detail) return null;
    const res = await securityService.revealSecret({ recordId: detail.id, fieldKey, entryId });
    if (res.success && res.data) return res.data;
    toast('error', '获取失败');
    return null;
  }, [detail, toast]);

  if (detailLoading) return <Loading />;
  if (!detail) return <EmptyState title="未选择记录" description="从左侧列表选择一条记录查看详情。" />;

  const typeBadge = TYPE_BADGE[detail.type] || TYPE_BADGE.common_link;
  const expired = isExpired(detail.expireAt);
  const expiringSoon = isExpiringSoon(detail.expireAt);
  const isApiType = detail.type === 'api_relay' || detail.type === 'api_official';
  const detailModelNames = Array.from(new Set([
    ...detail.models.map((model) => model.modelName).filter(Boolean),
    ...detail.apiKeyGroups.flatMap((group) => group.models).filter(Boolean),
  ]));

  return (
    <div className="flex-1 overflow-y-auto" style={{ background: '#FAFAF7' }}>
      {/* 鈹€鈹€ Header 鈹€鈹€ */}
      <div style={{ padding: '16px 16px 14px', borderBottom: '1px solid #E8E3DC' }}>
        <div className="flex items-start justify-between gap-2" style={{ marginBottom: '10px' }}>
          <div className="flex-1 min-w-0">
            <h3 style={{ fontSize: '17px', fontWeight: 700, color: '#1C1917', letterSpacing: '-0.3px', lineHeight: '1.25', marginBottom: '6px' }}>
              {detail.title}
            </h3>
            <div className="flex items-center gap-[6px]">
              <span style={{
                fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '10px',
                background: typeBadge.bg, color: typeBadge.color,
              }}>
                {typeBadge.label}
              </span>
              {detail.isVerified && (
                <div className="flex items-center gap-1">
                  <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#059669' }} />
                  <span style={{ fontSize: '11px', color: '#059669' }}>已验证</span>
                </div>
              )}
            </div>
          </div>
          <div className="flex gap-[5px] flex-shrink-0">
            <button
              onClick={handleToggleFavorite}
              className="btn-icon"
              style={{ color: detail.isFavorite ? '#F5B53F' : '#B8B0A6' }}
              title={detail.isFavorite ? '取消收藏' : '加入收藏'}
            >
              <FavoriteIcon filled={detail.isFavorite} />
            </button>
            <button
              onClick={() => setEditRecordId(detail.id)}
              className="btn-icon"
              title="编辑"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#B8B0A6" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 20h9"/>
                <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/>
              </svg>
            </button>
            <button
              onClick={() => setDeleteOpen(true)}
              className="btn-icon preview-delete-button"
              title="删除"
            >
              <TrashIcon />
            </button>
          </div>
        </div>

        {/* Meta tags */}
        <div className="flex items-center gap-[5px] flex-wrap">
          {detail.folderName && (
            <>
              <span style={{ fontSize: '10px', color: '#A8A09A' }}>项目:</span>
              <span style={{ fontSize: '10px', fontWeight: 600, color: '#EA580C' }}>{detail.folderName}</span>
              <span style={{ fontSize: '10px', color: '#D0C8C0' }}>·</span>
            </>
          )}
          {detail.tags.map((tag) => (
            <span
              key={tag.id}
              style={{
                fontSize: '10px', fontWeight: 500, padding: '1px 7px', borderRadius: '8px',
                background: `${tag.color}18`, color: tag.color,
              }}
            >
              {tag.name}
            </span>
          ))}
        </div>
      </div>

      {/* 鈹€鈹€ Quick Actions (2x2 grid) 鈹€鈹€ */}
      <div style={{ padding: '14px', borderBottom: '1px solid #E8E3DC' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '7px' }}>
          {/* Primary action */}
          <button
            onClick={() => handleCopy(isApiType ? 'apiKey' : detail.passwordMasked ? 'password' : 'licenseKey')}
            className="flex items-center gap-[7px] transition-all duration-[120ms]"
            style={{
              height: '40px', padding: '0 14px', borderRadius: '10px',
              background: '#EA580C', boxShadow: '0 2px 6px rgba(234,88,12,0.25)',
            }}
          >
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
              <circle cx="4.5" cy="8.5" r="2.5" stroke="white" strokeWidth="1.3"/>
              <path d="M6.8 8.5H11.5M10 7V8.5" stroke="white" strokeWidth="1.3" strokeLinecap="round"/>
            </svg>
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'white', whiteSpace: 'nowrap' }}>
              {isApiType ? '复制 API Key' : detail.passwordMasked ? '复制密码' : '复制 Key'}
            </span>
          </button>

          {/* Copy URL */}
          <button
            onClick={() => handleCopy(detail.baseUrl ? 'baseUrl' : 'url')}
            className="flex items-center gap-[7px] transition-all duration-[120ms]"
            style={{
              height: '40px', padding: '0 14px', borderRadius: '10px',
              background: 'white', border: '1.5px solid #E8E3DC',
            }}
          >
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
              <path d="M5.5 9a3 3 0 0 0 4.24 0l1-1A3 3 0 0 0 6.5 3.76l-.75.75" stroke="#A8A09A" strokeWidth="1.3" strokeLinecap="round"/>
              <path d="M7.5 4a3 3 0 0 0-4.24 0l-1 1A3 3 0 0 0 6.5 9.24l.75-.75" stroke="#A8A09A" strokeWidth="1.3" strokeLinecap="round"/>
            </svg>
            <span style={{ fontSize: '12px', fontWeight: 500, color: '#78716C', whiteSpace: 'nowrap' }}>复制 URL</span>
          </button>

          {/* Copy .env */}
          <button
            onClick={() => handleCopy('env')}
            className="flex items-center gap-[7px] transition-all duration-[120ms]"
            style={{
              height: '40px', padding: '0 14px', borderRadius: '10px',
              background: 'white', border: '1.5px solid #E8E3DC',
            }}
          >
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
              <rect x="1.5" y="1.5" width="10" height="10" rx="1.5" stroke="#A8A09A" strokeWidth="1.2"/>
              <path d="M4 4.5L2.5 6 4 7.5M9 4.5L10.5 6 9 7.5M7 3L5.5 9" stroke="#A8A09A" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span style={{ fontSize: '12px', fontWeight: 500, color: '#78716C', whiteSpace: 'nowrap' }}>复制 .env</span>
          </button>

          {/* Copy JSON */}
          <button
            onClick={() => handleCopy('json')}
            className="flex items-center gap-[7px] transition-all duration-[120ms]"
            style={{
              height: '40px', padding: '0 14px', borderRadius: '10px',
              background: 'white', border: '1.5px solid #E8E3DC',
            }}
          >
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
              <path d="M3.5 2c-1 0-1.5.5-1.5 1.5v2c0 .8-.5 1-1 1.5.5.5 1 .7 1 1.5v2c0 1 .5 1.5 1.5 1.5" stroke="#A8A09A" strokeWidth="1.2" strokeLinecap="round"/>
              <path d="M9.5 2c1 0 1.5.5 1.5 1.5v2c0 .8.5 1 1 1.5-.5.5-1 .7-1 1.5v2c0 1-.5 1.5-1.5 1.5" stroke="#A8A09A" strokeWidth="1.2" strokeLinecap="round"/>
            </svg>
            <span style={{ fontSize: '12px', fontWeight: 500, color: '#78716C', whiteSpace: 'nowrap' }}>复制 JSON</span>
          </button>
        </div>
      </div>

      {/* 鈹€鈹€ Connection Info 鈹€鈹€ */}
      <div style={{ padding: '14px 16px 0' }}>
        <SectionLabel>连接信息</SectionLabel>

        {detail.baseUrl && (
          <FieldCard label="Base URL" value={detail.baseUrl} mono onCopy={() => handleCopy('baseUrl')} />
        )}
        {detail.url && (
          <FieldCard label="URL" value={detail.url} mono onCopy={() => handleCopy('url')} />
        )}
        {detail.username && (
          <FieldCard label="用户名" value={detail.username} onCopy={() => handleCopy('username')} />
        )}

        {/* Sensitive fields */}
        {detail.apiKeyMasked && (
          <FieldCard label="API Key" value={detail.apiKeyMasked} mono sensitive
            onCopy={() => handleCopy('apiKey')} onReveal={() => handleReveal('apiKey')} />
        )}
        {detail.passwordMasked && (
          <FieldCard label="密码" value={detail.passwordMasked} sensitive
            onCopy={() => handleCopy('password')} onReveal={() => handleReveal('password')} />
        )}
        {detail.licenseKeyMasked && (
          <FieldCard label="License Key" value={detail.licenseKeyMasked} mono sensitive
            onCopy={() => handleCopy('licenseKey')} onReveal={() => handleReveal('licenseKey')} />
        )}
      </div>

      {/* 鈹€鈹€ Environment entries 鈹€鈹€ */}
      {detail.type === 'api_relay' && detail.apiKeyGroups.length > 0 && (
        <div style={{ padding: '0 16px 12px' }}>
          <SectionLabel>Key 分组</SectionLabel>
          <div className="space-y-2">
            {detail.apiKeyGroups.map((group, index) => (
              <div
                key={group.id}
                style={{ background: 'white', border: '1px solid #E8E3DC', borderRadius: '10px', padding: '10px 12px' }}
              >
                <div className="flex items-start justify-between gap-2" style={{ marginBottom: '8px' }}>
                  <div className="min-w-0">
                    <div className="truncate" style={{ fontSize: '12px', fontWeight: 700, color: '#1C1917' }}>
                      {group.groupName || `Key 组 ${index + 1}`}
                    </div>
                    {group.balance && (
                      <div className="truncate" style={{ fontSize: '10.5px', color: '#059669', marginTop: '2px' }}>
                        {group.balance}
                      </div>
                    )}
                  </div>
                  {group.apiKeyMasked && (
                    <button
                      onClick={() => handleCopy('apiKeyGroup', undefined, group.id)}
                      className="flex items-center gap-1"
                      style={{ fontSize: '11px', color: '#A8A09A', fontFamily: "'JetBrains Mono', monospace" }}
                      title="复制该组 API Key"
                    >
                      {group.apiKeyMasked}
                      <CopyIcon />
                    </button>
                  )}
                </div>
                {group.models.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {group.models.map((model) => (
                      <button
                        key={model}
                        onClick={() => {
                          navigator.clipboard.writeText(model);
                          toast('success', '已复制');
                        }}
                        style={{
                          fontSize: '10.5px',
                          color: '#57534E',
                          background: '#FAF7F1',
                          border: '1px solid #EFE8DF',
                          borderRadius: '999px',
                          padding: '3px 7px',
                          fontFamily: "'JetBrains Mono', monospace",
                        }}
                      >
                        {model}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {detail.environmentEntries.length > 0 && (
        <div style={{ padding: '0 16px 12px' }}>
          <SectionLabel>环境入口</SectionLabel>
          <div className="space-y-2">
            {detail.environmentEntries.map((entry) => (
              <div
                key={entry.id}
                style={{ background: 'white', border: '1px solid #E8E3DC', borderRadius: '10px', padding: '10px 12px' }}
              >
                <div className="flex items-center justify-between gap-2" style={{ marginBottom: '8px' }}>
                  <div className="min-w-0">
                    <div className="truncate" style={{ fontSize: '12px', fontWeight: 700, color: '#1C1917' }}>
                      {entry.entryName}
                    </div>
                    {(entry.role || entry.entryType) && (
                      <div className="truncate" style={{ fontSize: '10.5px', color: '#A8A09A', marginTop: '2px' }}>
                        {[entry.entryType, entry.role].filter(Boolean).join(' · ')}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => handleCopy('url', entry.id)}
                    className="detail-icon-button"
                    title="复制入口 URL"
                  >
                    <CopyIcon />
                  </button>
                </div>
                <MiniField label="URL" value={entry.url} mono />
                {entry.username && <MiniField label="用户名" value={entry.username} />}
                {entry.hasPassword && (
                  <FieldCard
                    label="密码"
                    value="••••••••"
                    sensitive
                    onCopy={() => handleCopy('password', entry.id)}
                    onReveal={() => handleReveal('password', entry.id)}
                  />
                )}
                {entry.loginSteps && <MiniField label="登录步骤" value={entry.loginSteps} />}
                {entry.note && <MiniField label="备注" value={entry.note} />}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 鈹€鈹€ Models 鈹€鈹€ */}
      {isApiType && detailModelNames.length > 0 && (
        <div style={{ padding: '0 16px 12px' }}>
          <div className="flex items-center justify-between" style={{ marginBottom: '8px' }}>
            <SectionLabel style={{ marginBottom: 0 }}>支持模型</SectionLabel>
            <button
              onClick={() => {
                const all = detailModelNames.join('\n');
                navigator.clipboard.writeText(all);
                toast('success', '已复制全部模型');
              }}
              style={{ fontSize: '11px', color: '#EA580C', fontWeight: 500, cursor: 'pointer' }}
            >
              复制全部
            </button>
          </div>
          <div style={{ background: 'white', border: '1px solid #E8E3DC', borderRadius: '9px', overflow: 'hidden' }}>
            {detailModelNames.map((modelName, idx) => (
              <div
                key={modelName}
                className="flex items-center justify-between"
                style={{
                  padding: '9px 12px',
                  borderBottom: idx < detailModelNames.length - 1 ? '1px solid #F4F2EC' : 'none',
                }}
              >
                <span style={{ fontSize: '12px', color: '#44403C', fontFamily: "'JetBrains Mono', monospace" }}>
                  {modelName}
                </span>
                <button
                  onClick={() => { navigator.clipboard.writeText(modelName); toast('success', '已复制'); }}
                  style={{
                    width: '24px', height: '24px', borderRadius: '5px', background: '#F4F2EC',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#A8A09A',
                  }}
                >
                  <CopyIcon />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 鈹€鈹€ Custom fields 鈹€鈹€ */}
      {detail.customFields.length > 0 && (
        <div style={{ padding: '0 16px 12px' }}>
          <SectionLabel>扩展字段</SectionLabel>
          {detail.customFields.map((field) => (
            <FieldCard
              key={field.id}
              label={field.name}
              value={field.value || (field.isSensitive ? '••••••••' : '-')}
              sensitive={field.isSensitive}
              onCopy={field.isCopyable ? () => handleCopy(field.fieldKey || field.name) : undefined}
              onReveal={field.isSensitive ? () => handleReveal(field.fieldKey || field.name) : undefined}
            />
          ))}
        </div>
      )}

      {/* 鈹€鈹€ Price / Balance 鈹€鈹€ */}
      {detail.priceInfo && (
        <div style={{ padding: '0 16px 14px' }}>
          <SectionLabel>余额 / 套餐</SectionLabel>
          <div style={{ background: 'white', border: '1px solid #E8E3DC', borderRadius: '8px', padding: '10px 12px' }}>
            <span style={{ fontSize: '13px', color: '#44403C' }}>{detail.priceInfo}</span>
          </div>
        </div>
      )}

      {/* 鈹€鈹€ Note 鈹€鈹€ */}
      {detail.note && (
        <div style={{ padding: '0 16px 14px' }}>
          <SectionLabel>备注</SectionLabel>
          <div style={{ background: 'white', border: '1px solid #E8E3DC', borderRadius: '8px', padding: '10px 12px' }}>
            <p style={{ fontSize: '13px', color: '#44403C', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>{detail.note}</p>
          </div>
        </div>
      )}

      {/* 鈹€鈹€ Meta 鈹€鈹€ */}
      <div style={{ marginTop: 'auto', padding: '10px 16px', borderTop: '1px solid #E8E3DC' }}>
        <div className="flex items-center gap-2 flex-wrap">
          <span style={{ fontSize: '10.5px', color: '#C0B8B0' }}>创建 {formatDate(detail.createdAt)}</span>
          <span style={{ fontSize: '10.5px', color: '#DDD8D0' }}>·</span>
          <span style={{ fontSize: '10.5px', color: '#C0B8B0' }}>更新 {formatRelativeTime(detail.updatedAt)}</span>
          <span style={{ fontSize: '10.5px', color: '#DDD8D0' }}>·</span>
          <span style={{ fontSize: '10.5px', color: '#C0B8B0' }}>最近使用 {detail.lastUsedAt ? formatRelativeTime(detail.lastUsedAt) : '-'}</span>
          {detail.expireAt && (
            <>
              <span style={{ fontSize: '10.5px', color: '#DDD8D0' }}>·</span>
              <span style={{
                fontSize: '10.5px',
                color: expired ? '#DC2626' : expiringSoon ? '#D97706' : '#C0B8B0',
              }}>
                {expired ? '已过期' : `到期 ${formatDate(detail.expireAt)}`}
              </span>
            </>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDelete}
        title="删除记录"
        message={`确定要将「${detail.title}」移至回收站吗？`}
        confirmText="删除"
        cancelText="取消"
        danger
      />
    </div>
  );
}

/* 鈹€鈹€ Helper Components 鈹€鈹€ */

function SectionLabel({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <div style={{
      fontSize: '10px', fontWeight: 700, color: '#C0B8B0',
      textTransform: 'uppercase', letterSpacing: '0.9px',
      marginBottom: '10px', ...style,
    }}>
      {children}
    </div>
  );
}

function FieldCard({
  label, value, mono, sensitive, onCopy, onReveal,
}: {
  label: string; value: string; mono?: boolean; sensitive?: boolean;
  onCopy?: () => void; onReveal?: (() => Promise<string | null>) | (() => void);
}) {
  const [revealedValue, setRevealedValue] = useState<string | null>(null);
  const displayValue = revealedValue || value;

  const handleRevealClick = async () => {
    if (!onReveal) return;
    const next = await onReveal();
    if (typeof next === 'string' && next) setRevealedValue(next);
  };

  return (
    <div style={{ marginBottom: '10px' }}>
      <div style={{ fontSize: '10px', fontWeight: 600, color: '#A8A09A', marginBottom: '4px' }}>{label}</div>
      <div
        className="flex items-center justify-between gap-[6px]"
        style={{ padding: '8px 10px', background: 'white', border: '1px solid #E8E3DC', borderRadius: '8px' }}
      >
        <span style={{
          fontSize: '12px', color: '#44403C', flex: 1,
          fontFamily: mono ? "'JetBrains Mono', monospace" : 'inherit',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          letterSpacing: sensitive ? '0.5px' : undefined,
        }}>
          {displayValue}
        </span>
        <div className="flex gap-[5px] flex-shrink-0">
          {sensitive && onReveal && (
            <button
              onClick={handleRevealClick}
              className="detail-icon-button"
              title="显示"
            >
              <EyeIcon />
            </button>
          )}
          {onCopy && (
            <button
              onClick={onCopy}
              className="detail-icon-button"
              title="复制"
            >
              <CopyIcon />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function MiniField({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div style={{ marginBottom: '7px' }}>
      <div style={{ fontSize: '10px', fontWeight: 600, color: '#B8B0A6', marginBottom: '3px' }}>{label}</div>
      <div
        style={{
          fontSize: '11.5px',
          color: '#57534E',
          lineHeight: 1.55,
          wordBreak: 'break-all',
          fontFamily: mono ? "'JetBrains Mono', monospace" : 'inherit',
        }}
      >
        {value}
      </div>
    </div>
  );
}

