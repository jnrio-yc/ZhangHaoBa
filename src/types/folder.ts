export interface FolderTreeItem {
  id: string;
  parentId?: string;
  name: string;
  icon?: string;
  color?: string;
  sortOrder: number;
  isCommon: boolean;
  isArchived: boolean;
  recordCount: number;
  children: FolderTreeItem[];
}

export interface FolderCreateRequest {
  name: string;
  parentId?: string;
  icon?: string;
  color?: string;
  sortOrder?: number;
}

export interface FolderUpdateRequest {
  id: string;
  name?: string;
  parentId?: string | null;
  icon?: string;
  color?: string;
  sortOrder?: number;
  isCommon?: boolean;
  isArchived?: boolean;
}

export interface FolderDeleteRequest {
  id: string;
  recordHandling: 'move_to_pending' | 'move_to_folder' | 'move_to_trash' | 'deny_if_not_empty';
  targetFolderId?: string;
}
