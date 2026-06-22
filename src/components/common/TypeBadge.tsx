import { RECORD_TYPE_CONFIG } from '@/types/record';
import type { RecordType } from '@/types/record';

// Predefined low-saturation colors per type
const TYPE_CHIP_STYLE: Record<RecordType, { bg: string; text: string; border: string }> = {
  api_relay: { bg: '#F2EAFE', text: '#7C3AED', border: '#E4D4FB' },
  api_official: { bg: '#EAF2FF', text: '#2563EB', border: '#D7E5FF' },
  test_environment: { bg: '#FFF4DF', text: '#D88A16', border: '#F4D7A5' },
  website_account: { bg: '#EAF7EF', text: '#2F9D62', border: '#CDEBD8' },
  license_key: { bg: '#FFF1F0', text: '#D94B4B', border: '#F8D2D2' },
  common_link: { bg: '#EAF6FF', text: '#2187C9', border: '#CFE9FA' },
};

export default function TypeBadge({ type }: { type: RecordType }) {
  const config = RECORD_TYPE_CONFIG[type];
  const chipStyle = TYPE_CHIP_STYLE[type];
  if (!config || !chipStyle) return null;
  return (
    <span
      className="inline-flex items-center whitespace-nowrap font-medium"
      style={{
        background: chipStyle.bg,
        color: chipStyle.text,
        border: `1px solid ${chipStyle.border}`,
        height: '22px',
        padding: '0 8px',
        borderRadius: '999px',
        fontSize: '12px',
        lineHeight: '18px',
      }}
    >
      {config.label}
    </span>
  );
}
