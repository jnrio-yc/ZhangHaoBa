import { useState, useEffect } from 'react';
import Loading from '@/components/common/Loading';
import TypeBadge from '@/components/common/TypeBadge';
import { RECORD_TYPE_CONFIG } from '@/types/record';
import type { RecordType } from '@/types/record';
import type { StatsDashboard } from '@/types/api';

const TYPE_KEYS: { key: RecordType; field: keyof StatsDashboard }[] = [
  { key: 'api_relay', field: 'apiRelayCount' },
  { key: 'api_official', field: 'apiOfficialCount' },
  { key: 'test_environment', field: 'testEnvironmentCount' },
  { key: 'website_account', field: 'websiteAccountCount' },
  { key: 'license_key', field: 'licenseKeyCount' },
  { key: 'common_link', field: 'commonLinkCount' },
];

export default function StatsPage() {
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<StatsDashboard | null>(null);

  useEffect(() => {
    setLoading(true);
    setStats({
      totalRecords: 0, apiRelayCount: 0, apiOfficialCount: 0,
      testEnvironmentCount: 0, websiteAccountCount: 0, licenseKeyCount: 0,
      commonLinkCount: 0, pendingCount: 0, expiringCount: 0, highRiskCount: 0,
      typeCounts: [],
    });
    setLoading(false);
  }, []);

  if (loading || !stats) return <Loading />;

  const maxCount = Math.max(...TYPE_KEYS.map(({ field }) => stats[field] as number), 1);

  return (
    <div className="flex-1 overflow-y-auto" style={{ background: '#FFFDFC' }}>
      <div className="px-12 pt-7 pb-5" style={{ borderBottom: '1px solid #EFE8DF' }}>
        <h1 className="text-[22px] font-semibold leading-[30px]" style={{ color: '#162033' }}>统计看板</h1>
      </div>

      <div className="px-12 py-6 space-y-5 max-w-[680px]">
        {/* Total */}
        <div className="vault-card p-6">
          <div className="text-[13px]" style={{ color: '#9CA3AF' }}>总记录数</div>
          <div className="text-[36px] font-bold leading-[44px] mt-1" style={{ color: '#162033' }}>
            {stats.totalRecords}
          </div>
        </div>

        {/* Type counts grid */}
        <div className="grid grid-cols-3 gap-3">
          {TYPE_KEYS.map(({ key, field }) => {
            const count = stats[field] as number;
            return (
              <div key={key} className="vault-card p-4">
                <div className="mb-3">
                  <TypeBadge type={key} />
                </div>
                <div className="text-[24px] font-bold" style={{ color: '#162033' }}>{count}</div>
              </div>
            );
          })}
        </div>

        {/* Alert cards */}
        <div className="grid grid-cols-3 gap-3">
          <div
            className="vault-card p-4"
            style={{ background: '#FFF4DF', borderColor: '#F4D7A5' }}
          >
            <div className="text-[13px] mb-1" style={{ color: '#D88A16' }}>待整理</div>
            <div className="text-[24px] font-bold" style={{ color: '#D88A16' }}>{stats.pendingCount}</div>
          </div>
          <div
            className="vault-card p-4"
            style={{ background: '#FFF4DF', borderColor: '#F4D7A5' }}
          >
            <div className="text-[13px] mb-1" style={{ color: '#D88A16' }}>即将过期</div>
            <div className="text-[24px] font-bold" style={{ color: '#D88A16' }}>{stats.expiringCount}</div>
          </div>
          <div
            className="vault-card p-4"
            style={{ background: '#FFF1F0', borderColor: '#F8D2D2' }}
          >
            <div className="text-[13px] mb-1" style={{ color: '#D94B4B' }}>高风险</div>
            <div className="text-[24px] font-bold" style={{ color: '#D94B4B' }}>{stats.highRiskCount}</div>
          </div>
        </div>

        {/* Distribution bar chart */}
        <div className="vault-card p-6">
          <h3 className="text-[16px] font-semibold mb-4" style={{ color: '#1F2937' }}>类型分布</h3>
          <div className="space-y-3">
            {TYPE_KEYS.map(({ key, field }) => {
              const config = RECORD_TYPE_CONFIG[key];
              const count = stats[field] as number;
              const pct = (count / maxCount) * 100;
              return (
                <div key={key} className="flex items-center gap-3">
                  <span className="text-[13px] w-20 flex-shrink-0 truncate" style={{ color: '#6B7280' }}>
                    {config.label}
                  </span>
                  <div
                    className="flex-1 h-2 rounded-full overflow-hidden"
                    style={{ background: '#EFE8DF' }}
                  >
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${pct}%`, background: '#10213B' }}
                    />
                  </div>
                  <span className="text-[13px] font-medium w-8 text-right" style={{ color: '#374151' }}>
                    {count}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
