import type { MouseEvent } from 'react';
import type { RecordListItem } from '@/types/record';
import { formatRelativeTime } from '@/utils/format';
import { copyService } from '@/services/copyService';
import { useToast } from '@/components/common/Toast';

type RecordListItemMeta = RecordListItem & {
  isVerified?: boolean;
  isPaid?: boolean;
};

const TYPE_STYLE: Record<string, { bg: string; stroke: string; icon: () => JSX.Element }> = {
  api_relay: {
    bg: '#EBF3FF', stroke: '#2563EB',
    icon: () => (
      <svg width="15" height="15" viewBox="0 0 14 14" fill="none">
        <path d="M2 5H11L9.5 3M11 9H2L3.5 11" stroke="#2563EB" strokeWidth="1.45" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
  api_official: {
    bg: '#F0ECFF', stroke: '#7C3AED',
    icon: () => (
      <svg width="15" height="15" viewBox="0 0 14 14" fill="none">
        <circle cx="5" cy="8.5" r="2.5" stroke="#7C3AED" strokeWidth="1.3"/>
        <path d="M7.2 8.5H12M10 6.5V8.5" stroke="#7C3AED" strokeWidth="1.3" strokeLinecap="round"/>
      </svg>
    ),
  },
  test_environment: {
    bg: '#ECFDF5', stroke: '#059669',
    icon: () => (
      <svg width="15" height="15" viewBox="0 0 14 14" fill="none">
        <rect x="1.5" y="1.5" width="4.5" height="4.5" rx="1" stroke="#059669" strokeWidth="1.3"/>
        <rect x="8" y="1.5" width="4.5" height="4.5" rx="1" stroke="#059669" strokeWidth="1.3"/>
        <rect x="1.5" y="8" width="4.5" height="4.5" rx="1" stroke="#059669" strokeWidth="1.3"/>
        <rect x="8" y="8" width="4.5" height="4.5" rx="1" stroke="#059669" strokeWidth="1.3"/>
      </svg>
    ),
  },
  website_account: {
    bg: '#F1F5F9', stroke: '#64748B',
    icon: () => (
      <svg width="15" height="15" viewBox="0 0 14 14" fill="none">
        <circle cx="7" cy="7" r="5" stroke="#64748B" strokeWidth="1.3"/>
        <path d="M7 2C6 4 6 7 7 12M7 2C8 4 8 7 7 12" stroke="#64748B" strokeWidth="1.3"/>
        <path d="M2 7h10" stroke="#64748B" strokeWidth="1.3"/>
      </svg>
    ),
  },
  license_key: {
    bg: '#FFFBEB', stroke: '#D97706',
    icon: () => (
      <svg width="15" height="15" viewBox="0 0 14 14" fill="none">
        <rect x="1.5" y="4.5" width="11" height="6" rx="1.5" stroke="#D97706" strokeWidth="1.3"/>
        <path d="M4.5 4.5V3.5a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v1" stroke="#D97706" strokeWidth="1.3" strokeLinecap="round"/>
        <path d="M5.5 8h3" stroke="#D97706" strokeWidth="1.3" strokeLinecap="round"/>
      </svg>
    ),
  },
  common_link: {
    bg: '#EEF2FF', stroke: '#4F46E5',
    icon: () => (
      <svg width="15" height="15" viewBox="0 0 14 14" fill="none">
        <path d="M5.5 9.5a3 3 0 0 0 4.24 0L11 8.25A3 3 0 0 0 6.75 4L6 4.75" stroke="#4F46E5" strokeWidth="1.3" strokeLinecap="round"/>
        <path d="M8.5 4.5a3 3 0 0 0-4.24 0L3 5.75a3 3 0 0 0 4.24 4.25L8 9.25" stroke="#4F46E5" strokeWidth="1.3" strokeLinecap="round"/>
      </svg>
    ),
  },
};

const TYPE_BADGE: Record<string, { label: string; bg: string; color: string }> = {
  api_relay: { label: 'API中转', bg: '#EBF3FF', color: '#2563EB' },
  api_official: { label: '官方Key', bg: '#F0ECFF', color: '#6D28D9' },
  test_environment: { label: '测试环境', bg: '#ECFDF5', color: '#059669' },
  website_account: { label: '网站账号', bg: '#F1F5F9', color: '#64748B' },
  license_key: { label: '卡密', bg: '#FFFBEB', color: '#D97706' },
  common_link: { label: '常用链接', bg: '#EEF2FF', color: '#4F46E5' },
};

interface RecordCardProps {
  record: RecordListItem;
  selected?: boolean;
  density?: 'rich' | 'compact';
  onClick: () => void;
  onEdit?: () => void;
  onToggleFavorite?: () => void;
  onDelete?: () => void;
}

const EditIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 20h9"/>
    <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/>
  </svg>
);

const TrashIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 6h18"/>
    <path d="M8 6V4h8v2"/>
    <path d="M19 6l-1 14H6L5 6"/>
    <path d="M10 11v5M14 11v5"/>
  </svg>
);

const StarIcon = ({ filled }: { filled: boolean }) => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="m12 2 3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01Z"/>
  </svg>
);

const CopyIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="9" y="9" width="11" height="11" rx="2"/>
    <path d="M15 9V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h3"/>
  </svg>
);

type PlatformLogo = {
  keys: string[];
  bg: string;
  color: string;
  border?: string;
  render: () => JSX.Element;
};

const PLATFORM_LOGOS: PlatformLogo[] = [
  {
    keys: ['openai', 'api.openai.com', 'codex'],
    bg: '#EAF7F1',
    color: '#0F6B57',
    render: () => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M12 3.3a4.2 4.2 0 0 1 3.8 2.35 4.19 4.19 0 0 1 4.18 4.75 4.22 4.22 0 0 1-1.86 7.04 4.21 4.21 0 0 1-6.88 2.15 4.2 4.2 0 0 1-6.01-2.02 4.2 4.2 0 0 1-1.02-7.45 4.2 4.2 0 0 1 3.97-5.55A4.2 4.2 0 0 1 12 3.3Z" stroke="currentColor" strokeWidth="1.45" strokeLinejoin="round"/>
        <path d="M8.18 4.58 14.7 8.4v7.2l-6.52 3.82M19.98 10.4l-6.55 3.75-6.18-3.57M5.23 17.57V10l6.36-3.62M18.12 17.44l-6.52-3.7V6.38" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
  {
    keys: ['anthropic', 'claude', 'api.anthropic.com'],
    bg: '#F4EFE8',
    color: '#4A3427',
    render: () => <span style={{ fontSize: '18px', fontWeight: 800, letterSpacing: '-0.04em' }}>A</span>,
  },
  {
    keys: ['deepseek', 'api.deepseek.com'],
    bg: '#EAF1FF',
    color: '#2F6EEA',
    render: () => (
      <svg width="23" height="23" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M5.2 13.7c1.55 3.35 5.68 5.2 9.68 4.08 3.4-.95 5.58-3.83 5.08-6.7-.38-2.22-2.23-3.98-4.83-4.6.25 1.55-.25 2.88-1.32 3.65-1.6 1.15-3.6.48-5.05-.25-1.88-.92-3.38-.7-4.2.55-.57.87-.37 2.15.64 3.27Z" fill="currentColor" opacity=".18"/>
        <path d="M4.6 13.05c1.65 4.35 6.6 6.62 11.05 5.02 3.28-1.18 5.28-3.98 4.82-6.75-.38-2.28-2.23-4.02-4.93-4.68.22 1.52-.3 2.72-1.4 3.5-1.63 1.13-3.68.5-5.18-.23-1.88-.93-3.32-.68-4.02.62-.45.83-.28 1.75.43 2.47" stroke="currentColor" strokeWidth="1.45" strokeLinecap="round" strokeLinejoin="round"/>
        <circle cx="15.6" cy="12" r="1" fill="currentColor"/>
      </svg>
    ),
  },
  {
    keys: ['google', 'gemini', 'generativelanguage.googleapis.com'],
    bg: '#FFF7E8',
    color: '#4285F4',
    render: () => (
      <span
        style={{
          fontSize: '19px',
          fontWeight: 800,
          background: 'linear-gradient(90deg,#4285F4 0 28%,#34A853 28% 52%,#FBBC05 52% 75%,#EA4335 75%)',
          WebkitBackgroundClip: 'text',
          color: 'transparent',
        }}
      >
        G
      </span>
    ),
  },
  {
    keys: ['kimi', 'moonshot', 'api.moonshot.cn'],
    bg: '#16181D',
    color: '#FFFFFF',
    render: () => <span style={{ fontSize: '10px', fontWeight: 800, letterSpacing: '0.04em' }}>KIMI</span>,
  },
  {
    keys: ['zhipu', 'glm', 'bigmodel', 'open.bigmodel.cn'],
    bg: '#EAF4FF',
    color: '#1E66D0',
    render: () => <span style={{ fontSize: '10px', fontWeight: 800, letterSpacing: '0.02em' }}>GLM</span>,
  },
  {
    keys: ['minimax', 'api.minimax.chat'],
    bg: '#FFF1E8',
    color: '#DC5F2D',
    render: () => <span style={{ fontSize: '17px', fontWeight: 850 }}>M</span>,
  },
  {
    keys: ['stepfun', 'step', 'api.stepfun.com'],
    bg: '#F1EAFE',
    color: '#7C3AED',
    render: () => <span style={{ fontSize: '16px', fontWeight: 850 }}>S</span>,
  },
  {
    keys: ['qianfan', 'baidu', 'baidubce'],
    bg: '#EAF2FF',
    color: '#2563EB',
    render: () => <span style={{ fontSize: '16px', fontWeight: 850 }}>百</span>,
  },
  {
    keys: ['bailian', 'dashscope', 'aliyun', 'alibaba'],
    bg: '#FFF1E7',
    color: '#E8792E',
    render: () => <span style={{ fontSize: '16px', fontWeight: 850 }}>阿</span>,
  },
  {
    keys: ['doubao', 'volces', 'ark.cn-beijing.volces.com'],
    bg: '#FFEFF3',
    color: '#E5486D',
    render: () => <span style={{ fontSize: '16px', fontWeight: 850 }}>豆</span>,
  },
  {
    keys: ['mimo', 'xiaomi', 'aigc.xiaomi.com', 'xiaomimimo.com', 'token-plan-cn.xiaomimimo.com'],
    bg: '#FFF1E6',
    color: '#FF6900',
    render: () => <span style={{ fontSize: '11px', fontWeight: 850 }}>MI</span>,
  },
  {
    keys: ['mistral'],
    bg: '#FFF4DF',
    color: '#D97706',
    render: () => <span style={{ fontSize: '17px', fontWeight: 850 }}>M</span>,
  },
  {
    keys: ['cohere'],
    bg: '#EAF7EF',
    color: '#2F9D62',
    render: () => <span style={{ fontSize: '17px', fontWeight: 850 }}>C</span>,
  },
  {
    keys: ['perplexity'],
    bg: '#E7F8FA',
    color: '#168A94',
    render: () => <span style={{ fontSize: '17px', fontWeight: 850 }}>P</span>,
  },
  {
    keys: ['openrouter', 'openrouter.ai'],
    bg: '#EEF2FF',
    color: '#4F46E5',
    render: () => <span style={{ fontSize: '10px', fontWeight: 850 }}>OR</span>,
  },
  {
    keys: ['groq'],
    bg: '#FFF1E8',
    color: '#D94B2B',
    render: () => <span style={{ fontSize: '17px', fontWeight: 850 }}>G</span>,
  },
  {
    keys: ['github', 'githubcopilot'],
    bg: '#1F2328',
    color: '#FFFFFF',
    render: () => <span style={{ fontSize: '16px', fontWeight: 850 }}>GH</span>,
  },
  {
    keys: ['nvidia'],
    bg: '#EEF8E8',
    color: '#76B900',
    render: () => <span style={{ fontSize: '12px', fontWeight: 850 }}>NV</span>,
  },
];

const INITIAL_PALETTES = [
  { bg: '#F7EDE4', color: '#A75328' },
  { bg: '#EAF2FF', color: '#2563EB' },
  { bg: '#EAF7EF', color: '#2F9D62' },
  { bg: '#F1EDFF', color: '#6D5BD0' },
  { bg: '#FFF4DF', color: '#D88A16' },
  { bg: '#EAF6FF', color: '#2187C9' },
];

function normalizePlatformText(value?: string | null) {
  return (value || '').toLowerCase().replace(/\s+/g, '');
}

function firstLogoChar(record: RecordListItem) {
  const source = `${record.title || ''}${record.platformName || ''}`.trim();
  const match = Array.from(source).find((char) => /[\p{L}\p{N}]/u.test(char));
  return (match || '?').toUpperCase();
}

function paletteForRecord(record: RecordListItem) {
  const seed = Array.from(record.title || record.id).reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return INITIAL_PALETTES[seed % INITIAL_PALETTES.length];
}

function getPlatformLogo(record: RecordListItem) {
  const haystack = normalizePlatformText([
    record.platformName,
    record.title,
    record.baseUrl,
    record.url,
  ].filter(Boolean).join(' '));
  return PLATFORM_LOGOS.find((logo) => logo.keys.some((key) => haystack.includes(normalizePlatformText(key))));
}

function RecordLogo({ record, fallbackIcon }: { record: RecordListItem; fallbackIcon: () => JSX.Element }) {
  const logo = getPlatformLogo(record);
  const isApiLike = record.type === 'api_official' || record.type === 'api_relay';
  const fallbackPalette = paletteForRecord(record);
  const FallbackIcon = fallbackIcon;

  if (logo) {
    return (
      <div
        className="record-logo"
        style={{
          background: logo.bg,
          color: logo.color,
          border: `1px solid ${logo.border || 'rgba(232, 227, 220, 0.75)'}`,
        }}
      >
        {logo.render()}
      </div>
    );
  }

  if (isApiLike) {
    return (
      <div
        className="record-logo"
        style={{
          background: fallbackPalette.bg,
          color: fallbackPalette.color,
          border: '1px solid rgba(232, 227, 220, 0.75)',
          fontSize: '17px',
          fontWeight: 800,
        }}
      >
        {firstLogoChar(record)}
      </div>
    );
  }

  return (
    <div
      className="record-logo"
      style={{
        background: typeLogoFallbackBg(record.type),
        color: 'inherit',
        border: '1px solid rgba(232, 227, 220, 0.75)',
      }}
    >
      <FallbackIcon />
    </div>
  );
}

function typeLogoFallbackBg(type: string) {
  return TYPE_STYLE[type]?.bg || TYPE_STYLE.common_link.bg;
}

function daysUntil(date?: string) {
  if (!date) return null;
  return Math.ceil((new Date(date).getTime() - Date.now()) / 86400000);
}

function formatExpire(date?: string) {
  if (!date) return '';
  const days = daysUntil(date);
  if (days === null) return '';
  if (days < 0) return '已过期';
  if (days === 0) return '今天到期';
  if (days <= 30) return `${days}天后到期`;
  return new Date(date).toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' });
}

function buildFields(record: RecordListItemMeta) {
  const fields: { label: string; value: string; mono?: boolean; copyKey?: string }[] = [];
  const add = (label: string, value?: string | null, mono = false, copyKey?: string) => {
    if (value) fields.push({ label, value, mono, copyKey });
  };

  if (record.type === 'api_relay' || record.type === 'api_official') {
    add('Base URL', record.baseUrl || record.url, true, record.baseUrl ? 'baseUrl' : 'url');
    add('平台', record.platformName);
    add('API Key', record.apiKeyMasked, true, 'apiKey');
  } else if (record.type === 'website_account') {
    add('URL', record.url, true, 'url');
    add('用户名', record.username);
    if (record.hasPassword) add('密码', '••••••••');
  } else if (record.type === 'test_environment') {
    add('项目', record.projectName);
    add('环境', [record.environmentName, record.environmentType].filter(Boolean).join(' · '));
    add('入口', record.url, true, 'url');
    add('账号', record.username);
    if (record.hasPassword) add('密码', '••••••••');
  } else if (record.type === 'license_key') {
    add('License', record.licenseKeyMasked, true, 'licenseKey');
    add('到期', formatExpire(record.expireAt));
    add('平台', record.platformName);
  } else {
    add('URL', record.url, true, 'url');
    add('平台', record.platformName);
  }

  add('文件夹', record.folderName);
  return fields;
}

function buildStatusChips(record: RecordListItemMeta) {
  const chips: { label: string; bg: string; color: string; border?: string }[] = [];
  if (record.isProduction) chips.push({ label: '生产', bg: '#FFF1F0', color: '#D94B4B', border: '#F8D2D2' });
  if (record.isHighRisk) chips.push({ label: '高风险', bg: '#FFF1F0', color: '#D94B4B', border: '#F8D2D2' });
  if (record.isVerified) chips.push({ label: '已验证', bg: '#EAF7EF', color: '#2F9D62', border: '#CDEBD8' });
  if (record.isPaid) chips.push({ label: '付费', bg: '#EAF6FF', color: '#2187C9', border: '#CFE9FA' });
  if (record.isCommon) chips.push({ label: '常用', bg: '#F4F2EC', color: '#78716C', border: '#E8E3DC' });
  if (record.expireAt) {
    const days = daysUntil(record.expireAt);
    if (days !== null && days <= 30) {
      chips.push({
        label: days < 0 ? '已过期' : '即将过期',
        bg: days < 0 ? '#FFF1F0' : '#FFF8E7',
        color: days < 0 ? '#D94B4B' : '#D88A16',
        border: days < 0 ? '#F8D2D2' : '#F4D7A5',
      });
    }
  }
  return chips;
}

export default function RecordCard({
  record,
  selected,
  density = 'rich',
  onClick,
  onEdit,
  onToggleFavorite,
  onDelete,
}: RecordCardProps) {
  const { toast } = useToast();
  const typedRecord = record as RecordListItemMeta;
  const typeStyle = TYPE_STYLE[record.type] || TYPE_STYLE.common_link;
  const typeBadge = TYPE_BADGE[record.type] || TYPE_BADGE.common_link;
  const fields = buildFields(typedRecord);
  const quickFields = fields.filter((field) => field.copyKey);
  const metaFields = fields.filter((field) => !field.copyKey);
  const statusChips = buildStatusChips(typedRecord);
  const tags = record.tags ?? [];
  const compact = density === 'compact';

  const isExpiring = record.expireAt && daysUntil(record.expireAt) !== null && (daysUntil(record.expireAt) as number) <= 30;

  const handleAction = (event: MouseEvent, action?: () => void) => {
    event.stopPropagation();
    action?.();
  };

  const handleCopy = async (event: MouseEvent, fieldKey: string) => {
    event.stopPropagation();
    try {
      const response = await copyService.copyField({ recordId: record.id, fieldKey });
      if (response.success) toast('success', '已复制');
      else toast('error', response.error?.message || '复制失败');
    } catch {
      toast('error', '复制失败');
    }
  };

  return (
    <div
      onClick={onClick}
      className="group cursor-pointer transition-colors duration-[120ms]"
      style={{
        minHeight: compact ? '54px' : '92px',
        padding: compact ? '8px 14px' : '12px 14px',
        borderLeft: selected ? '3px solid #EA580C' : '3px solid transparent',
        background: selected
          ? '#FFF8F3'
          : isExpiring
            ? '#FFFBF0'
            : 'transparent',
      }}
      onMouseEnter={(e) => {
        if (!selected) (e.currentTarget as HTMLDivElement).style.background = '#FAFAF7';
      }}
      onMouseLeave={(e) => {
        if (!selected) (e.currentTarget as HTMLDivElement).style.background =
          isExpiring ? '#FFFBF0' : 'transparent';
      }}
    >
      <div className="flex gap-3">
        <RecordLogo record={record} fallbackIcon={typeStyle.icon} />

        <div className="min-w-0 flex-1">
          <div className={compact ? 'flex items-center gap-5' : 'flex items-stretch gap-5'}>
            <div className="min-w-0 flex-1">
              {compact ? (
                <div className="flex min-w-0 items-center gap-2">
                  <div
                    className="truncate"
                    style={{
                      fontSize: '13.5px',
                      fontWeight: selected ? 700 : 650,
                      color: '#1C1917',
                      lineHeight: '18px',
                    }}
                  >
                    {record.title}
                  </div>
                  <span
                    className="hidden shrink-0 whitespace-nowrap lg:inline-flex"
                    style={{
                      fontSize: '10px',
                      fontWeight: 650,
                      padding: '2px 7px',
                      borderRadius: '999px',
                      background: typeBadge.bg,
                      color: typeBadge.color,
                    }}
                  >
                    {typeBadge.label}
                  </span>
                </div>
              ) : (
                <>
                  <div
                    className="truncate"
                    style={{
                      fontSize: '14px',
                      fontWeight: selected ? 700 : 650,
                      color: '#1C1917',
                      lineHeight: '20px',
                    }}
                  >
                    {record.title}
                  </div>

                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                {metaFields.length > 0 && metaFields.map((field) => (
                  <div key={`${field.label}-${field.value}`} className="record-card-field">
                    <span style={{ fontSize: '10.5px', color: '#B8B0A6', fontWeight: 600 }}>{field.label}</span>
                    <span
                      className="max-w-[220px] truncate"
                      style={{
                        fontSize: '11.5px',
                        color: '#78716C',
                        fontFamily: field.mono ? "'JetBrains Mono', monospace" : 'inherit',
                      }}
                    >
                      {field.value}
                    </span>
                  </div>
                ))}
                {quickFields.map((field) => (
                  <div key={`${field.label}-${field.value}`} className="record-card-field">
                    <span style={{ fontSize: '10.5px', color: '#B8B0A6', fontWeight: 600 }}>{field.label}</span>
                    <span
                      className="max-w-[260px] truncate"
                      style={{
                        fontSize: '11.5px',
                        color: '#78716C',
                        fontFamily: "'JetBrains Mono', Consolas, monospace",
                      }}
                    >
                      {field.value}
                    </span>
                    <button
                      type="button"
                      className="record-card-copy"
                      onClick={(event) => handleCopy(event, field.copyKey as string)}
                      title={`复制${field.label}`}
                      aria-label={`复制${field.label}`}
                    >
                      <CopyIcon />
                    </button>
                  </div>
                ))}
                  </div>
                </>
              )}
            </div>

            <div className={compact ? 'record-card-right-compact' : 'record-card-right'}>
              <div className="flex items-center justify-end gap-1">
                {onToggleFavorite && (
                  <button
                    onClick={(event) => handleAction(event, onToggleFavorite)}
                    className="record-card-action"
                    style={{ color: record.isFavorite ? '#F5B53F' : '#B8B0A6' }}
                    title={record.isFavorite ? '取消收藏' : '收藏'}
                  >
                    <StarIcon filled={record.isFavorite} />
                  </button>
                )}
                {onEdit && (
                  <button
                    onClick={(event) => handleAction(event, onEdit)}
                    className="record-card-action"
                    title="编辑"
                  >
                    <EditIcon />
                  </button>
                )}
                {onDelete && (
                  <button
                    onClick={(event) => handleAction(event, onDelete)}
                    className="record-card-action record-card-action-danger"
                    title="删除"
                  >
                    <TrashIcon />
                  </button>
                )}
              </div>

              {!compact && <div className="record-card-tags">
                <span
                  className="whitespace-nowrap"
                  style={{
                    fontSize: '10px',
                    fontWeight: 650,
                    padding: '2px 7px',
                    borderRadius: '999px',
                    background: typeBadge.bg,
                    color: typeBadge.color,
                  }}
                >
                  {typeBadge.label}
                </span>
                {statusChips.map((chip) => (
                  <span
                    key={chip.label}
                    className="whitespace-nowrap"
                    style={{
                      fontSize: '10px',
                      fontWeight: 600,
                      padding: '2px 7px',
                      borderRadius: '999px',
                      background: chip.bg,
                      color: chip.color,
                      border: chip.border ? `1px solid ${chip.border}` : undefined,
                    }}
                  >
                    {chip.label}
                  </span>
                ))}
                {tags.slice(0, 4).map((tag) => (
                  <span
                    key={tag.id}
                    className="whitespace-nowrap"
                    style={{
                      fontSize: '10px',
                      fontWeight: 500,
                      padding: '2px 7px',
                      borderRadius: '999px',
                      background: `${tag.color || '#8B5CF6'}16`,
                      color: tag.color || '#8B5CF6',
                    }}
                  >
                    {tag.name}
                  </span>
                ))}
                {tags.length > 4 && (
                  <span style={{ fontSize: '10px', color: '#B8B0A6' }}>+{tags.length - 4}</span>
                )}
              </div>}

              <div className={compact ? 'record-card-time-compact' : 'record-card-time'}>
                {record.lastUsedAt ? `使用 ${formatRelativeTime(record.lastUsedAt)}` : `更新 ${formatRelativeTime(record.updatedAt)}`}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
