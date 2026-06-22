import { Routes, Route, Navigate } from "react-router-dom";
import MainLayout from "@/components/layout/MainLayout";
import AllRecordsPage from "@/pages/AllRecordsPage";
import RecordDetailPage from "@/pages/RecordDetailPage";
import RecordEditPage from "@/pages/RecordEditPage";
import FolderPage from "@/pages/FolderPage";
import TagPage from "@/pages/TagPage";
import FavoritesPage from "@/pages/FavoritesPage";
import RecentPage from "@/pages/RecentPage";
import PendingPage from "@/pages/PendingPage";
import StatsPage from "@/pages/StatsPage";
import BackupPage from "@/pages/BackupPage";
import TrashPage from "@/pages/TrashPage";
import SettingsPage from "@/pages/SettingsPage";

export function AppRouter() {
  return (
    <Routes>
      <Route element={<MainLayout />}>
        <Route path="/" element={<Navigate to="/records" replace />} />
        <Route path="/records" element={<AllRecordsPage />} />
        <Route path="/records/:id" element={<RecordDetailPage />} />
        <Route path="/records/new" element={<AllRecordsPage />} />
        <Route path="/records/:id/edit" element={<RecordEditPage />} />
        <Route path="/folder/:folderId" element={<AllRecordsPage />} />
        <Route path="/folders" element={<FolderPage />} />
        <Route path="/tag/:tagId" element={<AllRecordsPage />} />
        <Route path="/favorites" element={<FavoritesPage />} />
        <Route path="/recent" element={<RecentPage />} />
        <Route path="/pending" element={<PendingPage />} />
        <Route path="/stats" element={<StatsPage />} />
        <Route path="/backup" element={<BackupPage />} />
        <Route path="/trash" element={<TrashPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/tags" element={<TagPage />} />
      </Route>
    </Routes>
  );
}
