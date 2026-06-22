import { invoke } from '@tauri-apps/api/tauri';
import type { ApiResponse } from '@/types/api';
import type { FolderTreeItem, FolderCreateRequest, FolderUpdateRequest, FolderDeleteRequest } from '@/types/folder';

interface RawFolderItem {
  id: string;
  parentId?: string | null;
  parent_id?: string | null;
  name: string;
  icon?: string | null;
  color?: string | null;
  sortOrder?: number;
  sort_order?: number;
  isCommon?: boolean;
  is_common?: boolean;
  isArchived?: boolean;
  is_archived?: boolean;
  recordCount?: number;
  record_count?: number;
  children?: RawFolderItem[];
}

function flattenFolders(items: RawFolderItem[], inheritedParentId?: string): RawFolderItem[] {
  return items.flatMap((item) => {
    const parentId = item.parentId ?? item.parent_id ?? inheritedParentId;
    const current = { ...item, parentId, children: undefined };
    return [
      current,
      ...flattenFolders(item.children ?? [], item.id),
    ];
  });
}

export function normalizeFolderTree(items: RawFolderItem[]): FolderTreeItem[] {
  const flattened = flattenFolders(items);
  const nodes = new Map<string, FolderTreeItem>();

  for (const item of flattened) {
    nodes.set(item.id, {
      id: item.id,
      parentId: item.parentId ?? item.parent_id ?? undefined,
      name: item.name,
      icon: item.icon ?? undefined,
      color: item.color ?? undefined,
      sortOrder: item.sortOrder ?? item.sort_order ?? 0,
      isCommon: item.isCommon ?? item.is_common ?? false,
      isArchived: item.isArchived ?? item.is_archived ?? false,
      recordCount: item.recordCount ?? item.record_count ?? 0,
      children: [],
    });
  }

  const roots: FolderTreeItem[] = [];
  for (const folder of nodes.values()) {
    const parent = folder.parentId ? nodes.get(folder.parentId) : undefined;
    if (parent && parent.id !== folder.id) {
      parent.children.push(folder);
    } else {
      roots.push(folder);
    }
  }

  const sortTree = (folders: FolderTreeItem[]) => {
    folders.sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, 'zh-CN'));
    folders.forEach((folder) => sortTree(folder.children));
  };
  sortTree(roots);

  return roots;
}

export const folderService = {
  async list(): Promise<ApiResponse<FolderTreeItem[]>> {
    const response = await invoke<ApiResponse<RawFolderItem[]>>('folder_list');
    if (!response.success || !response.data) {
      return response as ApiResponse<FolderTreeItem[]>;
    }
    return { ...response, data: normalizeFolderTree(response.data) };
  },
  create(payload: FolderCreateRequest) {
    return invoke<ApiResponse<string>>('folder_create', { params: payload });
  },
  update(payload: FolderUpdateRequest) {
    return invoke<ApiResponse<boolean>>('folder_update', { params: payload });
  },
  delete(payload: FolderDeleteRequest) {
    return invoke<ApiResponse<boolean>>('folder_delete', { id: payload.id });
  },
};
