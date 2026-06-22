import { useState, useEffect } from 'react';
import Loading from '@/components/common/Loading';
import TypeBadge from '@/components/common/TypeBadge';
import { RECORD_TYPE_CONFIG } from '@/types/record';
import type { RecordType } from '@/types/record';
import type { StatsDashboard } from '@/types/api';
import { recordService } from '@/services/recordService';
import { isTauri } from '@/services/mockData';
import { statsService } from '@/services/statsService';

const TYPE_KEYS: { key: RecordType; field: keyof StatsDashboard }[] = [
  { key: 'api_relay', field: 'apiRelayCount' },
  { key: 'api_official', field: 'apiOfficialCount' },
  { key: 'test_environment', field: 'testEnvironmentCount' },
  { key: 'website_account', field: 'websiteAccountCount' },
  { key: 'license_key', field: 'licenseKeyCount' },
  { key: 'common_link', field: 'commonLinkCount' },
];

export default function StatsPage() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<StatsDashboard | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        if (isTauri()) {
          // In Tauri mode, use the backend stats service
          const res = await statsService.getDashboard();
          if (!cancelled && res.success && res.data) {
            setStats(res.data);
          }
        } else {
          // In browser/mock mode, compute stats from records
          const res = await recordService.list({ page: 1, pageSize: 1000 });
          if (!cancelled && res.success && res.data) {
            const items = res.data.items;
            const now = Date.now();
            const thirtyDays = 30 * 86400000;
            const computed: StatsDashboard = {
              totalRecords: items.length,
              apiRelayCount: items.filter(r => r.type === 'api_relay').length,
              apiOfficialCount: items.filter(r => r.type === 'api_official').length,
              testEnvironmentCount: items.filter(r => r.type === 'test_environment').length,
              websiteAccountCount: items.filter(r => r.type === 'website_account').length,
              licenseKeyCount: items.filter(r => r.type === 'license_key').length,
              commonLinkCount: items.filter(r => r.type === 'common_link').length,
              pendingCount: items.filter(r => r.status === 'pending').length,
              expiringCount: items.filter(r => r.expireAt && new Date(r.expireAt).getTime() - now < thirtyDays && new Date(r.expireAt).getTime() > now).length,
              highRiskCount: items.filter(r => r.isHighRisk).length,
              typeCounts: [],
            };
            setStats(computed);
          }
        }
      } catch {
        // fallback to zeros
        setStats({
          totalRecords: 0, apiRelayCount: 0, apiOfficialCount: 0,
          testEnvironmentCount: 0, websiteAccountCount: 0, licenseKeyCount: 0,
          commonLinkCount: 0, pendingCount: 0, expiringCount: 0, highRiskCount: 0,
          typeCounts: [],
        });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Listen for record changes to refresh stats
  useEffect(() => {
    const handler = () => {
      // Re-trigger stats load
      (async () => {
        try {
          if (isTauri()) {
            const res = await statsService.getDashboard();
            if (res.success && res.data) setStats(res.data);
          } else {
            const res = await recordService.list({ page: 1, pageSize: 1000 });
            if (res.success && res.data) {
              const items = res.data.items;
              const now = Date.now();
              const thirtyDays = 30 * 86400000;
              setStats({
                totalRecords: items.length,
                apiRelayCount: items.filter(r => r.type === 'api_relay').length,
                apiOfficialCount: items.filter(r => r.type === 'api_official').length,
                testEnvironmentCount: items.filter(r => r.type === 'test_environment').length,
                websiteAccountCount: items.filter(r => r.type === 'website_account').length,
                licenseKeyCount: items.filter(r => r.type === 'license_key').length,
                commonLinkCount: items.filter(r => r.type === 'common_link').length,
                pendingCount: items.filter(r => r.status === 'pending').length,
                expiringCount: items.filter(r => r.expireAt && new Date(r.expireAt).getTime() - now < thirtyDays && new Date(r.expireAt).getTime() > now).length,
                highRiskCount: items.filter(r => r.isHighRisk).length,
                typeCounts: [],
              });
            }
          }
        } catch { /* ignore */ }
      })();
    };
    window.addEventListener('account-vault-record-updated', handler);
    return () => window.removeEventListener('account-vault-record-updated', handler);
  }, []);

  if (loading || !stats) return <Loading />;

  const maxCount = Math.max(...TYPE_KEYS.map(({ field }) => stats[field] as number), 1);

  return (
    <div className="flex-1 overflow-y-auto" style={{ background: 'var(--color-bg-page)' }}>
      <div className="px-12 pt-7 pb-5" style={{ borderBottom: '1px solid var(--color-border-light)' }}>
        <h1 className="text-[22px] font-semibold leading-[30px]" style={{ color: 'var(--color-text-heading)' }}>统计看板</h1>
      </div>

      <div className="px-12 py-6 space-y-5 max-w-[680px]">
        {/* Total */}
        <div className="vault-card p-6">
          <div className="text-[13px]" style={{ color: 'var(--color-text-muted)' }}>总记录数</div>
          <div className="text-[36px] font-bold leading-[44px] mt-1" style={{ color: 'var(--color-text-heading)' }}>
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
                <div className="text-[24px] font-bold" style={{ color: 'var(--color-text-heading)' }}>{count}</div>
              </div>
            );
          })}
        </div>

        {/* Alert cards */}
        <div className="grid grid-cols-3 gap-3">
          <div
            className="vault-card p-4"
            style={{ background: 'var(--color-warning-bg)', borderColor: 'var(--color-warning-border)' }}
          >
            <div className="text-[13px] mb-1" style={{ color: 'var(--color-warning-text)' }}>待整理</div>
            <div className="text-[24px] font-bold" style={{ color: 'var(--color-warning-text)' }}>{stats.pendingCount}</div>
          </div>
          <div
            className="vault-card p-4"
            style={{ background: 'var(--color-warning-bg)', borderColor: 'var(--color-warning-border)' }}
          >
            <div className="text-[13px] mb-1" style={{ color: 'var(--color-warning-text)' }}>即将过期</div>
            <div className="text-[24px] font-bold" style={{ color: 'var(--color-warning-text)' }}>{stats.expiringCount}</div>
          </div>
          <div
            className="vault-card p-4"
            style={{ background: 'var(--color-danger-bg)', borderColor: 'var(--color-danger-border)' }}
          >
            <div className="text-[13px] mb-1" style={{ color: 'var(--color-danger)' }}>高风险</div>
            <div className="text-[24px] font-bold" style={{ color: 'var(--color-danger)' }}>{stats.highRiskCount}</div>
          </div>
        </div>

        {/* Distribution bar chart */}
        <div className="vault-card p-6">
          <h3 className="text-[16px] font-semibold mb-4" style={{ color: 'var(--color-text-primary)' }}>类型分布</h3>
          <div className="space-y-3">
            {TYPE_KEYS.map(({ key, field }) => {
              const config = RECORD_TYPE_CONFIG[key];
              const count = stats[field] as number;
              const pct = (count / maxCount) * 100;
              return (
                <div key={key} className="flex items-center gap-3">
                  <span className="text-[13px] w-20 flex-shrink-0 truncate" style={{ color: 'var(--color-text-secondary)' }}>
                    {config.label}
                  </span>
                  <div
                    className="flex-1 h-2 rounded-full overflow-hidden"
                    style={{ background: 'var(--color-border)' }}
                  >
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${pct}%`, background: 'var(--color-accent)' }}
                    />
                  </div>
                  <span className="text-[13px] font-medium w-8 text-right" style={{ color: 'var(--color-text-primary)' }}>
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
