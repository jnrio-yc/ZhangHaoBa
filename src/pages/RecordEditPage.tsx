import { useState, useMemo, useEffect, useCallback, useRef, type CSSProperties, type ReactNode } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { clsx } from 'clsx';
import { useRecordStore } from '@/stores/recordStore';
import { useFolderStore } from '@/stores/folderStore';
import { useTagStore } from '@/stores/tagStore';
import { recordService } from '@/services/recordService';
import { tagService } from '@/services/tagService';
import { useToast } from '@/components/common/Toast';
import Loading from '@/components/common/Loading';
import { PLATFORM_PRESETS } from '@/data/platformPresets';
import { fetchBalance, fetchModelList } from '@/services/apiProbeService';
import { isTauri } from '@/services/mockData';
import type { RecordType, RecordCreateRequest, EnvironmentEntryInput, ModelItemInput, ApiKeyGroupInput } from '@/types/record';
import { RECORD_TYPE_CONFIG } from '@/types/record';
import type { FolderTreeItem } from '@/types/folder';
import type { TagGroupKey, TagView } from '@/types/tag';

type FlatFolder = { id: string; name: string; depth: number; color?: string };
type ApiKeyGroupForm = { id?: string; groupName: string; apiKey: string; apiKeyMasked?: string; balance: string; models: ModelItemInput[] };

function flattenFolders(items: FolderTreeItem[], depth = 0): FlatFolder[] {
  const result: FlatFolder[] = [];
  for (const f of items) {
    result.push({ id: f.id, name: f.name, depth, color: f.color });
    if ((f.children ?? []).length > 0) result.push(...flattenFolders(f.children ?? [], depth + 1));
  }
  return result;
}

const RECORD_TYPES: RecordType[] = ['api_relay', 'api_official', 'test_environment', 'website_account', 'license_key', 'common_link'];
type TagTemplate = { name: string; color: string; groupKey: TagGroupKey };

const PRESET_TAGS_BY_TYPE: Record<RecordType, TagTemplate[]> = {
  api_relay: [
    { name: 'API中转', color: '#7C3AED', groupKey: 'platform' },
    { name: '大模型', color: '#6D5BD0', groupKey: 'usage' },
    { name: '付费', color: '#2187C9', groupKey: 'status' },
    { name: '已验证', color: '#2F9D62', groupKey: 'status' },
    { name: '常用', color: '#78716C', groupKey: 'usage' },
  ],
  api_official: [
    { name: '官方Key', color: '#2563EB', groupKey: 'platform' },
    { name: '大模型', color: '#6D5BD0', groupKey: 'usage' },
    { name: '付费', color: '#2187C9', groupKey: 'status' },
    { name: '生产环境', color: '#D94B4B', groupKey: 'risk' },
    { name: '已验证', color: '#2F9D62', groupKey: 'status' },
  ],
  test_environment: [
    { name: '测试环境', color: '#D88A16', groupKey: 'usage' },
    { name: '预发布', color: '#D9A441', groupKey: 'usage' },
    { name: '生产环境', color: '#D94B4B', groupKey: 'risk' },
    { name: '高风险', color: '#D94B4B', groupKey: 'risk' },
    { name: '待整理', color: '#6B7280', groupKey: 'status' },
  ],
  website_account: [
    { name: '网站账号', color: '#2F9D62', groupKey: 'usage' },
    { name: '工作', color: '#3B82F6', groupKey: 'project' },
    { name: '个人', color: '#16A34A', groupKey: 'project' },
    { name: '常用', color: '#78716C', groupKey: 'usage' },
    { name: '高风险', color: '#D94B4B', groupKey: 'risk' },
  ],
  license_key: [
    { name: '卡密', color: '#D88A16', groupKey: 'usage' },
    { name: 'License', color: '#7C3AED', groupKey: 'usage' },
    { name: '付费', color: '#2187C9', groupKey: 'status' },
    { name: '即将过期', color: '#E8792E', groupKey: 'status' },
    { name: '已验证', color: '#2F9D62', groupKey: 'status' },
  ],
  common_link: [
    { name: '常用链接', color: '#2187C9', groupKey: 'usage' },
    { name: '文档', color: '#6B7280', groupKey: 'usage' },
    { name: '控制台', color: '#7C3AED', groupKey: 'platform' },
    { name: '工作', color: '#3B82F6', groupKey: 'project' },
    { name: '收藏', color: '#D9A441', groupKey: 'usage' },
  ],
};

const CUSTOM_TAG_COLORS = ['#7C3AED', '#2563EB', '#2F9D62', '#D88A16', '#2187C9', '#6B7280'];

function normalizeTagName(name: string) {
  return name.trim().toLowerCase();
}

function tagColorForName(name: string) {
  let hash = 0;
  for (const ch of name) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return CUSTOM_TAG_COLORS[hash % CUSTOM_TAG_COLORS.length];
}

function createEmptyApiKeyGroup(): ApiKeyGroupForm {
  return { groupName: '', apiKey: '', balance: '', models: [] };
}

function mapGroupModels(models: string[] = []): ModelItemInput[] {
  return models.map((modelName) => ({ modelName, modelType: '', isDefault: false }));
}

const ENV_TYPE_OPTIONS = ['开发', '测试', '预发布', '生产', '其他'];

const BackIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
  </svg>
);

const FavoriteIcon = ({ filled }: { filled: boolean }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="m12 2 3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01Z"/>
  </svg>
);

function FolderSelect({
  value,
  folders,
  onChange,
}: {
  value: string;
  folders: FlatFolder[];
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const selected = folders.find((folder) => folder.id === value);

  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  const choose = (nextValue: string) => {
    onChange(nextValue);
    setOpen(false);
  };

  return (
    <div ref={rootRef} className="vault-select">
      <button
        type="button"
        className={clsx('vault-select-trigger', open && 'is-open')}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        onKeyDown={(event) => {
          if (event.key === 'Escape') setOpen(false);
          if (event.key === 'ArrowDown') {
            event.preventDefault();
            setOpen(true);
          }
        }}
      >
        <span className="vault-select-current">
          <span className="vault-select-dot" style={{ background: selected?.color || '#C6BFB6' }} />
          <span>{selected?.name || '未分类'}</span>
        </span>
        <svg className="vault-select-chevron" width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
          <path d="M3.5 5.5 7 9l3.5-3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {open && (
        <div className="vault-select-menu" role="listbox" aria-label="选择文件夹">
          <button
            type="button"
            className={clsx('vault-select-option', !value && 'is-selected')}
            role="option"
            aria-selected={!value}
            onClick={() => choose('')}
          >
            <span className="vault-select-option-main">
              <span className="vault-select-dot" style={{ background: '#C6BFB6' }} />
              <span>未分类</span>
            </span>
            {!value && <span className="vault-select-check">✓</span>}
          </button>

          {folders.map((folder) => {
            const active = folder.id === value;
            return (
              <button
                key={folder.id}
                type="button"
                className={clsx('vault-select-option', active && 'is-selected')}
                role="option"
                aria-selected={active}
                onClick={() => choose(folder.id)}
              >
                <span className="vault-select-option-main" style={{ paddingLeft: `${folder.depth * 18}px` }}>
                  <span className="vault-select-dot" style={{ background: folder.color || '#A8A09A' }} />
                  <span className="truncate">{folder.name}</span>
                </span>
                {active && <span className="vault-select-check">✓</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

const TYPE_ICONS: Record<RecordType, () => JSX.Element> = {
  api_relay: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="2"/><path d="M16.24 7.76a6 6 0 0 1 0 8.49m-8.48-.01a6 6 0 0 1 0-8.49m11.31-2.82a10 10 0 0 1 0 14.14m-14.14 0a10 10 0 0 1 0-14.14"/>
    </svg>
  ),
  api_official: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/>
    </svg>
  ),
  test_environment: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>
    </svg>
  ),
  website_account: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/>
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
    </svg>
  ),
  license_key: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
    </svg>
  ),
  common_link: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
    </svg>
  ),
};

interface RecordEditPageProps {
  presentation?: 'page' | 'dialog';
  forceCreate?: boolean;
  recordId?: string | null;
  onClose?: () => void;
  onCreated?: (recordId: string) => void;
  onUpdated?: (recordId: string) => void;
}

export default function RecordEditPage({
  presentation = 'page',
  forceCreate = false,
  recordId,
  onClose,
  onCreated,
  onUpdated,
}: RecordEditPageProps = {}) {
  const { id: routeId } = useParams<{ id: string }>();
  const id = forceCreate ? undefined : (recordId || routeId);
  const isEdit = !forceCreate && Boolean(id) && id !== 'new';
  const isDialog = presentation === 'dialog';
  const navigate = useNavigate();
  const { toast } = useToast();
  const { setDetail } = useRecordStore();
  const { folders } = useFolderStore();
  const { tags, setTags } = useTagStore();
  const [saving, setSaving] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const [type, setType] = useState<RecordType>('website_account');
  const [title, setTitle] = useState('');
  const [folderId, setFolderId] = useState('');
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [url, setUrl] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [currentApiKeyMasked, setCurrentApiKeyMasked] = useState('');
  const [licenseKey, setLicenseKey] = useState('');
  const [platformName, setPlatformName] = useState('');
  const [projectName, setProjectName] = useState('');
  const [environmentName, setEnvironmentName] = useState('');
  const [environmentType, setEnvironmentType] = useState('');
  const [note, setNote] = useState('');
  const [priceInfo, setPriceInfo] = useState('');
  const [expireAt, setExpireAt] = useState('');
  const [isFavorite, setIsFavorite] = useState(false);
  const [isHighRisk, setIsHighRisk] = useState(false);
  const [isProduction, setIsProduction] = useState(false);
  const [isPaid, setIsPaid] = useState(false);
  const [entries, setEntries] = useState<EnvironmentEntryInput[]>([]);
  const [models, setModels] = useState<ModelItemInput[]>([]);
  const [apiKeyGroups, setApiKeyGroups] = useState<ApiKeyGroupForm[]>([createEmptyApiKeyGroup()]);
  const [customTagName, setCustomTagName] = useState('');
  const [creatingTag, setCreatingTag] = useState(false);

  // Platform dropdown state
  const [showPlatformDropdown, setShowPlatformDropdown] = useState(false);
  const platformRef = useRef<HTMLDivElement>(null);

  // Model fetch state
  const [fetchingModels, setFetchingModels] = useState(false);
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [showModelPicker, setShowModelPicker] = useState(false);
  const [modelSearch, setModelSearch] = useState('');

  const flatFolders = useMemo(() => flattenFolders(folders), [folders]);
  const typePresetTags = useMemo(() => PRESET_TAGS_BY_TYPE[type] ?? [], [type]);
  const selectedTagNameSet = useMemo(() => {
    const selectedTags = tags.filter((tag) => selectedTagIds.includes(tag.id));
    return new Set(selectedTags.map((tag) => normalizeTagName(tag.name)));
  }, [selectedTagIds, tags]);
  const presetTagNameSet = useMemo(
    () => new Set(typePresetTags.map((tag) => normalizeTagName(tag.name))),
    [typePresetTags]
  );
  const extraTags = useMemo(
    () => tags.filter((tag) => !presetTagNameSet.has(normalizeTagName(tag.name))),
    [presetTagNameSet, tags]
  );

  useEffect(() => {
    if (!isEdit || !id) return;
    let cancelled = false;
    (async () => {
      setLoadingDetail(true);
      try {
        const res = await recordService.getDetail(id);
        if (!cancelled && res.success && res.data) {
          const d = res.data;
          setType(d.type);
          setTitle(d.title);
          setFolderId(d.folderId || '');
          setSelectedTagIds(d.tags.map((t) => t.id));
          setUrl(d.url || '');
          setBaseUrl(d.baseUrl || '');
          setUsername(d.username || '');
          setCurrentApiKeyMasked(d.apiKeyMasked || '');
          setPlatformName(d.platformName || '');
          setProjectName(d.projectName || '');
          setEnvironmentName(d.environmentName || '');
          setEnvironmentType(d.environmentType || '');
          setNote(d.note || '');
          setPriceInfo(d.priceInfo || '');
          setExpireAt(d.expireAt ? d.expireAt.slice(0, 10) : '');
          setIsFavorite(d.isFavorite);
          setIsHighRisk(d.isHighRisk);
          setIsProduction(d.isProduction);
          setIsPaid(d.isPaid);
          setEntries(d.environmentEntries.map((e) => ({
            id: e.id, entryName: e.entryName, url: e.url,
            role: e.role || '', username: e.username || '', password: '', sortOrder: e.sortOrder,
          })));
          setModels(d.models.map((m) => ({
            id: m.id, modelName: m.modelName, modelType: m.modelType || '', isDefault: m.isDefault,
          })));
          if (d.type === 'api_relay') {
            if (d.apiKeyGroups?.length) {
              setApiKeyGroups(d.apiKeyGroups.map((group) => ({
                id: group.id,
                groupName: group.groupName || '',
                apiKey: '',
                apiKeyMasked: group.apiKeyMasked,
                balance: group.balance || '',
                models: mapGroupModels(group.models),
              })));
            } else {
              setApiKeyGroups([{
                groupName: '',
                apiKey: '',
                apiKeyMasked: d.apiKeyMasked,
                balance: d.priceInfo || '',
                models: d.models.map((m) => ({
                  id: m.id,
                  modelName: m.modelName,
                  modelType: m.modelType || '',
                  isDefault: m.isDefault,
                })),
              }]);
            }
          }
        }
      } catch {
        toast('error', '加载记录失败');
      } finally {
        if (!cancelled) setLoadingDetail(false);
      }
    })();
    return () => { cancelled = true; };
  }, [isEdit, id, toast]);

  const handleClose = useCallback(() => {
    if (isDialog && onClose) {
      onClose();
      return;
    }
    navigate(-1);
  }, [isDialog, navigate, onClose]);

  const toggleTag = useCallback((tagId: string) => {
    setSelectedTagIds((prev) =>
      prev.includes(tagId) ? prev.filter((t) => t !== tagId) : [...prev, tagId]
    );
  }, []);

  const createOrSelectTag = useCallback(async (template: TagTemplate) => {
    const name = template.name.trim();
    if (!name || creatingTag) return;

    const existing = tags.find((tag) => normalizeTagName(tag.name) === normalizeTagName(name));
    if (existing) {
      setSelectedTagIds((prev) =>
        prev.includes(existing.id) ? prev.filter((tagId) => tagId !== existing.id) : [...prev, existing.id]
      );
      setCustomTagName('');
      return;
    }

    setCreatingTag(true);
    try {
      if (!isTauri()) {
        const localTag: TagView = {
          id: `local-tag-${Date.now()}`,
          name,
          color: template.color,
          groupKey: template.groupKey,
          sortOrder: tags.length + 1,
          isSystem: false,
          usageCount: 0,
        };
        setTags([...tags, localTag]);
        setSelectedTagIds((prev) => [...prev, localTag.id]);
        setCustomTagName('');
        return;
      }

      const createRes = await tagService.create({
        name,
        color: template.color,
        groupKey: template.groupKey,
      });

      if (!createRes.success || !createRes.data) {
        toast('error', createRes.error?.message || '标签创建失败');
        return;
      }
      const createdTagId = createRes.data;

      const listRes = await tagService.list();
      if (listRes.success && listRes.data) {
        const nextTags = listRes.data.map((tag) => ({
          ...tag,
          usageCount: (tag as any).usageCount ?? (tag as any).recordCount ?? 0,
        }));
        setTags(nextTags);
      }
      setSelectedTagIds((prev) => [...prev, createdTagId]);
      setCustomTagName('');
    } catch {
      toast('error', '标签创建失败');
    } finally {
      setCreatingTag(false);
    }
  }, [creatingTag, setTags, tags, toast]);

  const handleCustomTagSubmit = useCallback(() => {
    const name = customTagName.trim();
    if (!name) return;
    createOrSelectTag({
      name,
      color: tagColorForName(name),
      groupKey: 'custom',
    });
  }, [createOrSelectTag, customTagName]);

  const addEntry = () => setEntries((prev) => [...prev, { entryName: '', url: '', role: '', username: '', password: '', sortOrder: prev.length }]);
  const removeEntry = (idx: number) => setEntries((prev) => prev.filter((_, i) => i !== idx));
  const updateEntry = (idx: number, patch: Partial<EnvironmentEntryInput>) =>
    setEntries((prev) => prev.map((e, i) => (i === idx ? { ...e, ...patch } : e)));

  const addModel = () => setModels((prev) => [...prev, { modelName: '', modelType: '', isDefault: false }]);
  const removeModel = (idx: number) => setModels((prev) => prev.filter((_, i) => i !== idx));
  const updateModel = (idx: number, patch: Partial<ModelItemInput>) =>
    setModels((prev) => prev.map((m, i) => (i === idx ? { ...m, ...patch } : m)));

  const addApiKeyGroup = () => {
    setApiKeyGroups((prev) => [...prev, createEmptyApiKeyGroup()]);
  };

  const removeApiKeyGroup = (groupIndex: number) => {
    setApiKeyGroups((prev) => prev.length <= 1 ? prev : prev.filter((_, index) => index !== groupIndex));
  };

  const updateApiKeyGroup = (groupIndex: number, patch: Partial<ApiKeyGroupForm>) => {
    setApiKeyGroups((prev) => prev.map((group, index) => index === groupIndex ? { ...group, ...patch } : group));
  };

  const addGroupModel = (groupIndex: number) => {
    setApiKeyGroups((prev) => prev.map((group, index) => (
      index === groupIndex
        ? { ...group, models: [...group.models, { modelName: '', modelType: '', isDefault: false }] }
        : group
    )));
  };

  const removeGroupModel = (groupIndex: number, modelIndex: number) => {
    setApiKeyGroups((prev) => prev.map((group, index) => (
      index === groupIndex
        ? { ...group, models: group.models.filter((_, mIndex) => mIndex !== modelIndex) }
        : group
    )));
  };

  const updateGroupModel = (groupIndex: number, modelIndex: number, patch: Partial<ModelItemInput>) => {
    setApiKeyGroups((prev) => prev.map((group, index) => (
      index === groupIndex
        ? { ...group, models: group.models.map((model, mIndex) => mIndex === modelIndex ? { ...model, ...patch } : model) }
        : group
    )));
  };

  const fetchGroupModels = async (groupIndex: number) => {
    const group = apiKeyGroups[groupIndex];
    if (!baseUrl || !group?.apiKey) {
      toast('error', '请先填写 Base URL 和该组 API Key');
      return;
    }
    setFetchingModels(true);
    try {
      const list = await fetchModelList(baseUrl, group.apiKey);
      const existing = new Set(group.models.map((model) => model.modelName));
      const nextModels = [
        ...group.models,
        ...list.filter((modelName) => !existing.has(modelName)).map((modelName) => ({ modelName, modelType: '', isDefault: false })),
      ];
      updateApiKeyGroup(groupIndex, { models: nextModels });
      toast('success', `已添加 ${nextModels.length - group.models.length} 个模型`);
    } catch (e: any) {
      toast('error', e.message || '获取模型列表失败');
    } finally {
      setFetchingModels(false);
    }
  };

  const fetchGroupBalance = async (groupIndex: number) => {
    const group = apiKeyGroups[groupIndex];
    if (!baseUrl || !group?.apiKey) {
      toast('error', '请先填写 Base URL 和该组 API Key');
      return;
    }
    setFetchingModels(true);
    try {
      const balance = await fetchBalance(baseUrl, group.apiKey);
      updateApiKeyGroup(groupIndex, { balance });
      toast('success', '已获取余额信息');
    } catch (e: any) {
      toast('error', e.message || '无法自动获取余额，请手动填写');
    } finally {
      setFetchingModels(false);
    }
  };

  // Platform preset selection
  const selectPlatform = useCallback((preset: typeof PLATFORM_PRESETS[0]) => {
    setPlatformName(preset.name);
    setBaseUrl(preset.baseUrl);
    setShowPlatformDropdown(false);
  }, []);

  const filteredPlatforms = useMemo(() => {
    if (!platformName.trim()) return PLATFORM_PRESETS;
    const q = platformName.toLowerCase();
    return PLATFORM_PRESETS.filter((p) => p.name.toLowerCase().includes(q));
  }, [platformName]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (platformRef.current && !platformRef.current.contains(e.target as Node)) {
        setShowPlatformDropdown(false);
      }
    };
    if (showPlatformDropdown) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showPlatformDropdown]);

  // Fetch model list
  const handleFetchModels = useCallback(async () => {
    setFetchingModels(true);
    try {
      const list = await fetchModelList(baseUrl, apiKey);
      setAvailableModels(list);
      setShowModelPicker(true);
      setModelSearch('');
    } catch (e: any) {
      toast('error', e.message || '获取模型列表失败');
    } finally {
      setFetchingModels(false);
    }
  }, [baseUrl, apiKey, toast]);

  // Add selected models from picker
  const addSelectedModels = useCallback((selectedIds: string[]) => {
    const existingNames = new Set(models.map((m) => m.modelName));
    const newModels = selectedIds
      .filter((id) => !existingNames.has(id))
      .map((id) => ({ modelName: id, modelType: '', isDefault: false }));
    setModels((prev) => [...prev, ...newModels]);
    setShowModelPicker(false);
    if (newModels.length > 0) toast('success', `已添加 ${newModels.length} 个模型`);
  }, [models, toast]);

  const handleSave = async () => {
    if (!title.trim()) { toast('error', '请输入记录标题'); return; }
    setSaving(true);
    try {
      const cleanedGroups: ApiKeyGroupInput[] = apiKeyGroups.map((group, index) => ({
        id: group.id,
        groupName: group.groupName.trim() || undefined,
        apiKey: group.apiKey.trim() || undefined,
        balance: group.balance.trim() || undefined,
        models: group.models.map((model) => model.modelName.trim()).filter(Boolean),
        sortOrder: index,
      })).filter((group) => group.groupName || group.apiKey || group.balance || (group.models?.length ?? 0) > 0);
      const firstGroup = apiKeyGroups[0] || createEmptyApiKeyGroup();
      const compatModels = type === 'api_relay' ? firstGroup.models : models;
      const compatApiKey = type === 'api_relay' ? firstGroup.apiKey : apiKey;

      if (isEdit && id) {
        const res = await recordService.update({
          id, title: title.trim(), folderId: folderId || null, tagIds: selectedTagIds,
          url: url || null, baseUrl: baseUrl || null, username: username || null,
          passwordUpdate: password ? { action: 'replace', value: password } : { action: 'keep' },
          apiKeyUpdate: compatApiKey ? { action: 'replace', value: compatApiKey } : { action: 'keep' },
          licenseKeyUpdate: licenseKey ? { action: 'replace', value: licenseKey } : { action: 'keep' },
          note: note || null, expireAt: expireAt || null, priceInfo: priceInfo || null,
          platformName: platformName || null, projectName: projectName || null,
          environmentName: environmentName || null, environmentType: environmentType || null,
          isFavorite, isHighRisk, isProduction, isPaid,
          environmentEntries: type === 'test_environment' ? entries : undefined,
          apiKeyGroups: type === 'api_relay' ? cleanedGroups : undefined,
          models: (type === 'api_relay' || type === 'api_official') ? compatModels : undefined,
        });
        if (res.success) {
          toast('success', '保存成功');
          if (isDialog && onUpdated) onUpdated(id);
          else navigate(`/records/${id}`);
        }
        else toast('error', res.error?.message || '保存失败');
      } else {
        const payload: RecordCreateRequest = {
          type, title: title.trim(), folderId: folderId || undefined,
          tagIds: selectedTagIds.length > 0 ? selectedTagIds : undefined,
          url: url || undefined, baseUrl: baseUrl || undefined, username: username || undefined,
          password: password || undefined, apiKey: compatApiKey || undefined, licenseKey: licenseKey || undefined,
          note: note || undefined, expireAt: expireAt || undefined, priceInfo: priceInfo || undefined,
          platformName: platformName || undefined, projectName: projectName || undefined,
          environmentName: environmentName || undefined, environmentType: environmentType || undefined,
          isFavorite, isHighRisk, isProduction, isPaid,
          environmentEntries: type === 'test_environment' ? entries : undefined,
          apiKeyGroups: type === 'api_relay' ? cleanedGroups : undefined,
          models: (type === 'api_relay' || type === 'api_official') ? compatModels : undefined,
        };
        const res = await recordService.create(payload);
        if (res.success && res.data) {
          toast('success', '创建成功');
          if (isDialog && onCreated) onCreated(res.data.id);
          else navigate(`/records/${res.data.id}`);
        }
        else toast('error', res.error?.message || '创建失败');
      }
    } catch {
      toast('error', '操作失败');
    } finally {
      setSaving(false);
    }
  };

  if (loadingDetail) return <Loading />;

  const isApiType = type === 'api_relay' || type === 'api_official';

  return (
    <div
      className={clsx(
        isDialog
          ? 'record-modal-backdrop fixed inset-0 z-[60] flex items-center justify-center px-6 py-6'
          : 'flex-1 min-h-0 flex flex-col'
      )}
      style={isDialog ? undefined : { background: '#FFFDFC' }}
      onMouseDown={isDialog ? handleClose : undefined}
    >
      <div
        className={clsx(
          isDialog
            ? 'record-modal-panel flex max-h-[82vh] flex-col overflow-hidden'
            : 'mx-auto flex min-h-0 w-full max-w-[640px] flex-1 flex-col'
        )}
        onMouseDown={isDialog ? (e) => e.stopPropagation() : undefined}
      >
        {isDialog && (
          <div className="record-modal-header flex flex-shrink-0 items-center justify-between px-8 py-5">
            <h1 className="text-[22px] font-semibold leading-[30px]" style={{ color: '#162033' }}>
              {isEdit ? '编辑记录' : '新增记录'}
            </h1>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsFavorite((value) => !value)}
                className="record-favorite-button"
                data-active={isFavorite}
                title={isFavorite ? '取消收藏' : '加入收藏'}
              >
                <FavoriteIcon filled={isFavorite} />
              </button>
              <button
                onClick={handleClose}
                className="flex items-center justify-center transition-colors duration-[120ms]"
                style={{ width: '30px', height: '30px', borderRadius: '8px', color: '#A8A09A' }}
                onMouseEnter={(e) => { e.currentTarget.style.background = '#F4F2EC'; e.currentTarget.style.color = '#1C1917'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#A8A09A'; }}
                title="关闭"
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M3 3L11 11M11 3L3 11" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
                </svg>
              </button>
            </div>
          </div>
        )}
        <div className={clsx(
          'min-h-0 flex-1 overflow-y-auto',
          isDialog ? 'record-modal-scroll px-8 py-7' : 'record-page-scroll px-12 py-8'
        )}>
        {/* Page header */}
        {!isDialog && (
          <div className="mb-8 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={handleClose}
                className="flex items-center gap-1.5 text-[13px] transition-colors duration-[120ms]"
                style={{ color: '#9CA3AF' }}
                onMouseEnter={(e) => (e.currentTarget.style.color = '#374151')}
                onMouseLeave={(e) => (e.currentTarget.style.color = '#9CA3AF')}
              >
                <BackIcon />
              </button>
              <h1 className="text-[22px] font-semibold leading-[30px]" style={{ color: '#162033' }}>
                {isEdit ? '编辑记录' : '新增记录'}
              </h1>
              <button
                onClick={() => setIsFavorite((value) => !value)}
                className="record-favorite-button"
                data-active={isFavorite}
                title={isFavorite ? '取消收藏' : '加入收藏'}
              >
                <FavoriteIcon filled={isFavorite} />
              </button>
            </div>
          </div>
        )}

        {/* Type selector (create only) */}
        {!isEdit && (
          <FormSection label="记录类型">
            <div className="grid grid-cols-3 gap-2">
              {RECORD_TYPES.map((t) => {
                const cfg = RECORD_TYPE_CONFIG[t];
                const IconComp = TYPE_ICONS[t];
                const active = type === t;
                return (
                  <button
                    key={t}
                    onClick={() => setType(t)}
                    className="record-type-button flex items-center gap-2.5 px-3 py-3 rounded-[10px] border text-left transition-all duration-[120ms]"
                    style={{
                      border: `1px solid ${active ? '#10213B' : '#E8DFD4'}`,
                      background: active ? '#F1E7DC' : '#FFFFFF',
                      color: active ? '#10213B' : '#374151',
                    }}
                  >
                    <span style={{ color: active ? '#10213B' : '#9CA3AF' }}><IconComp /></span>
                    <span className="text-[13px] font-medium">{cfg.label}</span>
                  </button>
                );
              })}
            </div>
          </FormSection>
        )}

        {/* Title */}
        <FormSection label="标题" required>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="输入记录标题"
            className="input-field"
          />
        </FormSection>

        {/* Folder */}
        <FormSection label="文件夹">
          <FolderSelect
            value={folderId}
            folders={flatFolders}
            onChange={setFolderId}
          />
        </FormSection>

        {/* Type-specific fields */}
        {type === 'website_account' && (
          <>
            <FormSection label="URL">
              <input type="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://example.com" className="input-field" />
            </FormSection>
            <FormSection label="用户名">
              <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="用户名/邮箱" className="input-field" />
            </FormSection>
            <FormSection label="密码">
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder={isEdit ? '留空保持不变' : '输入密码'} className="input-field" />
            </FormSection>
          </>
        )}

        {isApiType && (
          <>
            <FormSection label="Base URL">
              <input type="url" value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} placeholder="https://api.example.com" className="input-field" />
            </FormSection>
            {type === 'api_relay' && (
              <FormSection label="Key 组">
                <div className="space-y-3">
                  {apiKeyGroups.map((group, groupIndex) => (
                    <div
                      key={group.id || groupIndex}
                      className="space-y-3 rounded-[12px] p-4"
                      style={{ background: '#FFFCF7', border: '1px solid #EFE8DF' }}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <div className="text-[14px] font-semibold" style={{ color: '#1F2937' }}>Key 组 {groupIndex + 1}</div>
                          <div className="text-[12px]" style={{ color: '#A8A09A' }}>一个 API Key、分组与模型列表打包保存</div>
                        </div>
                        {apiKeyGroups.length > 1 && (
                          <button type="button" onClick={() => removeApiKeyGroup(groupIndex)} className="btn-secondary" style={{ color: '#D94B4B' }}>删除组</button>
                        )}
                      </div>
                      <div>
                        <label className="label-base">分组</label>
                        <input type="text" value={group.groupName} onChange={(e) => updateApiKeyGroup(groupIndex, { groupName: e.target.value })} placeholder="如 Claude Max 满血 1.5" className="input-field" />
                      </div>
                      <div>
                        <label className="label-base">API Key</label>
                        <input
                          type="password"
                          value={group.apiKey}
                          onChange={(e) => updateApiKeyGroup(groupIndex, { apiKey: e.target.value })}
                          placeholder={isEdit && group.apiKeyMasked ? `当前：${group.apiKeyMasked}，留空保持不变` : isEdit ? '留空保持不变' : '输入 API Key'}
                          className="input-field"
                        />
                        {isEdit && group.apiKeyMasked && (
                          <div className="mt-1 text-[12px]" style={{ color: '#A8A09A' }}>当前已保存：{group.apiKeyMasked}</div>
                        )}
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="label-base mb-0">模型列表</label>
                          <div className="flex items-center gap-2">
                            <button type="button" onClick={() => addGroupModel(groupIndex)} className="text-[13px]" style={{ color: '#8A8F98' }}>+ 添加模型</button>
                            <button type="button" onClick={() => fetchGroupModels(groupIndex)} disabled={fetchingModels || !baseUrl || !group.apiKey} className="btn-secondary disabled:opacity-40">获取模型</button>
                          </div>
                        </div>
                        {group.models.map((model, modelIndex) => (
                          <div key={modelIndex} className="flex items-center gap-2">
                            <input type="text" value={model.modelName} onChange={(e) => updateGroupModel(groupIndex, modelIndex, { modelName: e.target.value })} placeholder="模型名称，如 gpt-4o" className="input-field flex-1" />
                            <button type="button" onClick={() => removeGroupModel(groupIndex, modelIndex)} className="btn-icon" style={{ color: '#D94B4B' }} title="删除模型">×</button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                  <button type="button" onClick={addApiKeyGroup} className="btn-secondary">+ 添加 Key 组</button>
                </div>
              </FormSection>
            )}
            {type === 'api_official' && (
              <>
            <FormSection label="API Key">
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={isEdit && currentApiKeyMasked ? `当前：${currentApiKeyMasked}，留空保持不变` : isEdit ? '留空保持不变' : '输入 API Key'}
                className="input-field"
              />
              {isEdit && currentApiKeyMasked && (
                <div className="mt-1 text-[12px]" style={{ color: '#A8A09A' }}>当前已保存：{currentApiKeyMasked}</div>
              )}
            </FormSection>
            <FormSection label="平台名称">
              {type === 'api_official' ? (
                <div ref={platformRef}>
                  <input
                    type="text"
                    value={platformName}
                    onChange={(e) => { setPlatformName(e.target.value); setShowPlatformDropdown(true); }}
                    onFocus={() => setShowPlatformDropdown(true)}
                    placeholder="搜索或选择平台..."
                    className="input-field"
                    autoComplete="off"
                  />
                  {showPlatformDropdown && filteredPlatforms.length > 0 && (
                    <div
                      className="platform-preset-panel mt-2 overflow-hidden"
                    >
                      <div className="flex items-center justify-between px-3 py-2" style={{ borderBottom: '1px solid #EFE8DF' }}>
                        <span className="text-[11px] font-medium" style={{ color: '#8A8F98' }}>选择平台</span>
                        <span className="text-[10px]" style={{ color: '#B6B0A8' }}>{filteredPlatforms.length} 个结果</span>
                      </div>
                      <div className="platform-preset-list">
                        {filteredPlatforms.map((p) => {
                          const selected = platformName === p.name;
                          return (
                            <button
                              key={p.name}
                              className="platform-preset-option"
                              onMouseDown={(e) => { e.preventDefault(); selectPlatform(p); }}
                            >
                              <span className="min-w-0 flex-1">
                                <span className="block truncate text-[13px] font-medium" style={{ color: '#374151' }}>{p.name}</span>
                                <span
                                  className="mt-0.5 block truncate text-[10.5px]"
                                  style={{ color: '#A8A09A', fontFamily: 'JetBrains Mono, monospace' }}
                                >
                                  {p.baseUrl.replace('https://', '')}
                                </span>
                              </span>
                              {selected && (
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#EA580C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <polyline points="20 6 9 17 4 12"/>
                                </svg>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <input type="text" value={platformName} onChange={(e) => setPlatformName(e.target.value)} placeholder="如 CCSub、AiHubMix" className="input-field" />
              )}
            </FormSection>
            <FormSection label="模型列表">
              <div className="space-y-2">
                {models.map((m, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={m.modelName}
                      onChange={(e) => updateModel(idx, { modelName: e.target.value })}
                      placeholder="模型名称，如 gpt-4o"
                      className="input-field flex-1"
                    />
                    <label className="flex items-center gap-1.5 text-[13px] whitespace-nowrap" style={{ color: '#6B7280' }}>
                      <input
                        type="checkbox"
                        checked={m.isDefault || false}
                        onChange={(e) => updateModel(idx, { isDefault: e.target.checked })}
                        className="rounded"
                      />
                      默认
                    </label>
                    <button
                      onClick={() => removeModel(idx)}
                      className="text-[13px] px-2 transition-colors duration-[120ms]"
                      style={{ color: '#D94B4B' }}
                    >
                      ×
                    </button>
                  </div>
                ))}
                <div className="flex items-center gap-2 mt-1">
                  <button
                    onClick={addModel}
                    className="text-[13px] transition-colors duration-[120ms]"
                    style={{ color: '#9CA3AF' }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = '#374151')}
                    onMouseLeave={(e) => (e.currentTarget.style.color = '#9CA3AF')}
                  >
                    + 添加模型
                  </button>
                  <button
                    onClick={handleFetchModels}
                    disabled={fetchingModels || !baseUrl || !apiKey}
                    className="flex items-center gap-1.5 text-[13px] px-3 py-1.5 rounded-[8px] transition-all duration-[120ms] disabled:opacity-40"
                    style={{ border: '1px solid #E8E3DC', color: '#6B7280', background: '#FAFAF8' }}
                    onMouseEnter={(e) => { if (!fetchingModels) { e.currentTarget.style.background = '#F4F2EC'; e.currentTarget.style.borderColor = '#D5CFC5'; }}}
                    onMouseLeave={(e) => { e.currentTarget.style.background = '#FAFAF8'; e.currentTarget.style.borderColor = '#E8E3DC'; }}
                  >
                    {fetchingModels ? (
                      <svg className="animate-spin" width="13" height="13" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="#A8A09A" strokeWidth="2" strokeDasharray="31.4" strokeLinecap="round"/></svg>
                    ) : (
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                      </svg>
                    )}
                    {fetchingModels ? '获取中...' : '获取模型列表'}
                  </button>
                </div>
              </div>
            </FormSection>

            {/* Model picker modal */}
            {showModelPicker && availableModels.length > 0 && (
              <ModelPickerModal
                models={availableModels}
                existingModels={models.map((m) => m.modelName)}
                search={modelSearch}
                onSearchChange={setModelSearch}
                onConfirm={addSelectedModels}
                onClose={() => setShowModelPicker(false)}
              />
            )}
              </>
            )}
          </>
        )}

        {type === 'test_environment' && (
          <>
            <FormSection label="项目名称">
              <input type="text" value={projectName} onChange={(e) => setProjectName(e.target.value)} placeholder="项目名称" className="input-field" />
            </FormSection>
            <FormSection label="环境名称">
              <input type="text" value={environmentName} onChange={(e) => setEnvironmentName(e.target.value)} placeholder="如 Dev、Staging" className="input-field" />
            </FormSection>
            <FormSection label="环境类型">
              <select value={environmentType} onChange={(e) => setEnvironmentType(e.target.value)} className="input-field">
                <option value="">请选择</option>
                {ENV_TYPE_OPTIONS.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
              </select>
            </FormSection>
            <FormSection label="环境入口">
              <div className="space-y-3">
                {entries.map((entry, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-[10px] space-y-3"
                    style={{ background: '#FAF7F1', border: '1px solid #EFE8DF' }}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[13px] font-medium" style={{ color: '#6B7280' }}>入口 {idx + 1}</span>
                      <button
                        onClick={() => removeEntry(idx)}
                        className="text-[13px]"
                        style={{ color: '#D94B4B' }}
                      >
                        删除
                      </button>
                    </div>
                    <input type="text" value={entry.entryName} onChange={(e) => updateEntry(idx, { entryName: e.target.value })} placeholder="入口名称" className="input-field" />
                    <input type="url" value={entry.url} onChange={(e) => updateEntry(idx, { url: e.target.value })} placeholder="URL" className="input-field" />
                    <div className="grid grid-cols-2 gap-2">
                      <input type="text" value={entry.role || ''} onChange={(e) => updateEntry(idx, { role: e.target.value })} placeholder="角色" className="input-field" />
                      <input type="text" value={entry.username || ''} onChange={(e) => updateEntry(idx, { username: e.target.value })} placeholder="用户名" className="input-field" />
                    </div>
                    <input type="password" value={entry.password || ''} onChange={(e) => updateEntry(idx, { password: e.target.value })} placeholder="密码" className="input-field" />
                  </div>
                ))}
                <button
                  onClick={addEntry}
                  className="text-[13px] transition-colors duration-[120ms]"
                  style={{ color: '#9CA3AF' }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = '#374151')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = '#9CA3AF')}
                >
                  + 添加入口
                </button>
              </div>
            </FormSection>
          </>
        )}

        {type === 'license_key' && (
          <>
            <FormSection label="License Key">
              <input type="password" value={licenseKey} onChange={(e) => setLicenseKey(e.target.value)} placeholder={isEdit ? '留空保持不变' : '输入卡密/License Key'} className="input-field" />
            </FormSection>
            <FormSection label="过期时间">
              <input type="date" value={expireAt} onChange={(e) => setExpireAt(e.target.value)} className="input-field" />
            </FormSection>
          </>
        )}

        {type === 'common_link' && (
          <FormSection label="URL">
            <input type="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://example.com" className="input-field" />
          </FormSection>
        )}

        {/* Tags */}
        <FormSection label="标签">
          <div className="record-tag-picker">
            <div>
              <div className="record-tag-picker-title">
                <span>推荐标签</span>
                <span>{RECORD_TYPE_CONFIG[type].label}</span>
              </div>
              <div className="record-tag-chip-row">
                {typePresetTags.map((template) => {
                  const selected = selectedTagNameSet.has(normalizeTagName(template.name));
                  return (
                    <button
                      key={template.name}
                      type="button"
                      onClick={() => createOrSelectTag(template)}
                      className="record-tag-choice"
                      data-active={selected}
                      style={{
                        '--tag-color': template.color,
                        '--tag-bg': `${template.color}14`,
                        '--tag-border': `${template.color}33`,
                      } as CSSProperties}
                    >
                      <span className="record-tag-dot" />
                      {template.name}
                    </button>
                  );
                })}
              </div>
            </div>

            {extraTags.length > 0 && (
              <div>
                <div className="record-tag-picker-title">
                  <span>已有标签</span>
                  <span>{extraTags.length}</span>
                </div>
                <div className="record-tag-chip-row">
                  {extraTags.map((tag) => {
                    const selected = selectedTagIds.includes(tag.id);
                    return (
                      <button
                        key={tag.id}
                        type="button"
                        onClick={() => toggleTag(tag.id)}
                        className="record-tag-choice"
                        data-active={selected}
                        style={{
                          '--tag-color': tag.color || '#6B7280',
                          '--tag-bg': `${tag.color || '#6B7280'}14`,
                          '--tag-border': `${tag.color || '#6B7280'}33`,
                        } as CSSProperties}
                      >
                        <span className="record-tag-dot" />
                        {tag.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="record-tag-custom">
              <input
                type="text"
                value={customTagName}
                onChange={(e) => setCustomTagName(e.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    handleCustomTagSubmit();
                  }
                }}
                placeholder="输入自定义标签，按 Enter 添加"
                className="record-tag-custom-input"
              />
              <button
                type="button"
                onClick={handleCustomTagSubmit}
                disabled={creatingTag || !customTagName.trim()}
                className="record-tag-add-button"
              >
                {creatingTag ? '添加中' : '添加'}
              </button>
            </div>
          </div>
        </FormSection>

        {/* Note */}
        <FormSection label="备注">
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="添加备注信息..."
            rows={3}
            className="input-field resize-none"
          />
        </FormSection>

        {/* Bottom spacer */}
        <div className="h-2" />
        </div>
        <div className={clsx(
          'flex items-center justify-end gap-3 py-4',
          isDialog ? 'record-modal-footer px-8' : 'record-page-footer px-12'
        )}>
            <button
              onClick={handleClose}
              className="btn-secondary"
            >
              取消
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="btn-primary"
            >
              {saving ? '保存中...' : isEdit ? '保存更改' : '创建记录'}
            </button>
          </div>
      </div>
    </div>
  );
}

function FormSection({ label, required, children }: { label: string; required?: boolean; children: ReactNode }) {
  return (
    <div className="record-form-section mb-6">
      <label className="label-base">
        {label}
        {required && <span className="ml-0.5" style={{ color: '#D94B4B' }}>*</span>}
      </label>
      {children}
    </div>
  );
}

/** Modal for selecting models from a fetched list */
function ModelPickerModal({
  models, existingModels, search, onSearchChange, onConfirm, onClose,
}: {
  models: string[];
  existingModels: string[];
  search: string;
  onSearchChange: (v: string) => void;
  onConfirm: (selected: string[]) => void;
  onClose: () => void;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const existingSet = useMemo(() => new Set(existingModels), [existingModels]);

  const filtered = useMemo(() => {
    if (!search.trim()) return models;
    const q = search.toLowerCase();
    return models.filter((m) => m.toLowerCase().includes(q));
  }, [models, search]);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    const toAdd = filtered.filter((m) => !existingSet.has(m));
    setSelected(new Set(toAdd));
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center px-6 py-6"
      style={{ background: 'rgba(0,0,0,0.35)' }}
      onMouseDown={onClose}
    >
      <div
        className="flex min-h-0 w-full max-w-[480px] flex-col overflow-hidden rounded-[14px]"
        style={{ background: '#FFFFFF', boxShadow: '0 20px 60px rgba(0,0,0,0.15)', maxHeight: '70vh' }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex flex-shrink-0 items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid #E8E3DC' }}>
          <h3 className="text-[15px] font-semibold" style={{ color: '#1C1917' }}>
            选择模型 <span className="text-[12px] font-normal" style={{ color: '#A8A09A' }}>({models.length} 个可用)</span>
          </h3>
          <button onClick={onClose} style={{ color: '#A8A09A' }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M3 3L11 11M11 3L3 11" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {/* Search */}
        <div className="flex-shrink-0 px-5 py-3" style={{ borderBottom: '1px solid #F4F2EC' }}>
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="搜索模型..."
            className="input-field"
            autoFocus
          />
        </div>

        {/* List */}
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-2">
          {filtered.map((m) => {
            const isExisting = existingSet.has(m);
            const isChecked = selected.has(m) || isExisting;
            return (
              <label
                key={m}
                className="flex items-center gap-3 py-2 px-2 rounded-[8px] cursor-pointer transition-colors duration-75"
                style={{ opacity: isExisting ? 0.5 : 1 }}
                onMouseEnter={(e) => { if (!isExisting) e.currentTarget.style.background = '#F9F8F4'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
              >
                <input
                  type="checkbox"
                  checked={isChecked}
                  disabled={isExisting}
                  onChange={() => toggle(m)}
                  className="rounded"
                  style={{ accentColor: '#EA580C' }}
                />
                <span
                  className="text-[13px]"
                  style={{ color: '#374151', fontFamily: 'JetBrains Mono, monospace' }}
                >
                  {m}
                </span>
                {isExisting && <span className="text-[11px]" style={{ color: '#A8A09A' }}>已添加</span>}
              </label>
            );
          })}
          {filtered.length === 0 && (
            <div className="text-center py-6 text-[13px]" style={{ color: '#A8A09A' }}>无匹配模型</div>
          )}
        </div>

        {/* Footer */}
        <div className="flex flex-shrink-0 items-center justify-between px-5 py-3" style={{ borderTop: '1px solid #E8E3DC' }}>
          <button
            onClick={selectAll}
            className="text-[13px] transition-colors duration-[120ms]"
            style={{ color: '#6B7280' }}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#1C1917')}
            onMouseLeave={(e) => (e.currentTarget.style.color = '#6B7280')}
          >
            全选
          </button>
          <div className="flex items-center gap-2">
            <span className="text-[12px]" style={{ color: '#A8A09A' }}>
              已选 {selected.size} 个
            </span>
            <button
              onClick={() => onConfirm([...selected])}
              disabled={selected.size === 0}
              className="btn-primary text-[13px] px-4 py-1.5 disabled:opacity-40"
            >
              添加
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
