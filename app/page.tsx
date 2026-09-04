'use client';

import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import {
  Project,
  ProjectStatus,
  DashboardFilters,
  Member,
  MemberRole,
} from '@/app/types';
import {
  STATUS_CONFIG,
  STATUS_ORDER,
  DEFAULT_MEMBERS,
} from '@/app/constants';
import {
  formatDateShort,
  projectToFormData,
  emptyFormData,
  projectHasAlert,
  isGigafileExpiring,
  sendLineNotification,
} from '@/app/utils';

import BulkActionModal from '@/components/BulkActionModal';
import KanbanBoard from '@/components/KanbanBoard';
import ClientTableView from '@/components/ClientTableView';
import DirectorPanel from '@/components/DirectorPanel';
import FilterBar from '@/components/FilterBar';
import MemberManagementModal from '@/components/MemberManagementModal';
import ProjectFormModal from '@/components/ProjectFormModal';

import {
  AlertTriangle,
  Check,
  Clapperboard,
  LayoutGrid,
  Moon,
  Plus,
  RefreshCw,
  Sun,
  Table as TableIcon,
  Users,
} from 'lucide-react';

const DEFAULT_FILTERS: DashboardFilters = {
  keyword: '',
  clientName: 'all',
  editor: 'all',
  status: 'all',
  onlyAlerts: false,
  missingField: 'none',
  dateType: 'none',
  dateCondition: 'exact',
  targetDate: '',
};

export default function Dashboard() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<'kanban' | 'clientTable' | 'director'>(
    'kanban'
  );
  const [selectedClient, setSelectedClient] = useState<string>('all');
  const [isLight, setIsLight] = useState(false);

  const [filters, setFilters] = useState<DashboardFilters>(DEFAULT_FILTERS);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [formData, setFormData] = useState<any>(emptyFormData);

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);

  const [isMemberModalOpen, setIsMemberModalOpen] = useState(false);
  const [members, setMembers] = useState<Member[]>(DEFAULT_MEMBERS);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const fetchProjects = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('movies')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data) {
        const formatted: Project[] = data.map((item: any) => ({
          id: item.id,
          title: item.title || '',
          clientName: item.client_name || '',
          videoType: item.video_type || '',
          mainEditor: item.main_editor || '',
          director: item.director || '',
          status: item.status || 'not_started',
          draftDueDate: item.draft_due_date || '',
          clientSubmittedDate: item.client_submitted_date || '',
          deliveredDate: item.delivered_date || '',
          driveUrl: item.drive_url || '',
          gigafileUrl: item.gigafile_url || '',
          gigafileExpDate: item.gigafile_exp_date || '',
          notes: item.notes || '',
        }));
        setProjects(formatted);
      }
    } catch (err) {
      console.error(err);
      showToast('データの取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const clientNames = useMemo(() => {
    const set = new Set(projects.map((p) => p.clientName).filter(Boolean));
    return Array.from(set);
  }, [projects]);

  const editorNames = useMemo(() => {
    return members.map((m) => m.name);
  }, [members]);

  const filteredProjects = useMemo(() => {
    return projects.filter((p) => {
      if (
        filters.keyword &&
        !p.title.toLowerCase().includes(filters.keyword.toLowerCase()) &&
        !p.clientName.toLowerCase().includes(filters.keyword.toLowerCase())
      ) {
        return false;
      }

      if (filters.clientName !== 'all' && p.clientName !== filters.clientName) {
        return false;
      }

      if (filters.editor !== 'all' && p.mainEditor !== filters.editor && p.director !== filters.editor) {
        return false;
      }

      if (filters.onlyAlerts && !projectHasAlert(p)) {
        return false;
      }

      if (filters.missingField && filters.missingField !== 'none') {
        if (filters.missingField === 'clientSubmittedDate' && p.clientSubmittedDate) return false;
        if (filters.missingField === 'deliveredDate' && p.deliveredDate) return false;
        if (filters.missingField === 'mainEditor' && p.mainEditor) return false;
      }

      if (filters.dateType !== 'none' && filters.targetDate) {
        const pDate = filters.dateType === 'clientSubmitted' ? p.clientSubmittedDate : p.deliveredDate;
        if (!pDate) return false;

        if (filters.dateCondition === 'exact' && pDate !== filters.targetDate) return false;
        if (filters.dateCondition === 'before' && pDate > filters.targetDate) return false;
        if (filters.dateCondition === 'after' && pDate < filters.targetDate) return false;
      }

      return true;
    });
  }, [projects, filters]);

  // ステータス変更（納品完了の時のみLINE通知）
  async function handleStatusChange(id: string, next: ProjectStatus) {
    const target = projects.find((p) => p.id === id);
    if (!target) return;

    setProjects((prev) => prev.map((p) => (p.id === id ? { ...p, status: next } : p)));

    try {
      const { error } = await supabase
        .from('movies')
        .update({ status: next })
        .eq('id', id);

      if (error) throw error;

      if (next === 'delivered') {
        const lineMessage =
          `🎉 【納品完了】案件が完了しました！\n\n` +
          `■ クライアント: ${target.clientName}\n` +
          `■ 案件名: ${target.title}\n` +
          `■ 担当者: ${target.mainEditor || '未設定'}`;

        await sendLineNotification(lineMessage);
        showToast('納品完了に更新し、LINEに通知しました');
      } else {
        showToast('ステータスを更新しました');
      }
    } catch (err) {
      alert('ステータスの更新に失敗しました');
      fetchProjects();
    }
  }

  // 案件保存
  async function handleSaveProject(data: any) {
    try {
      if (editingProject) {
        const isNewlyDelivered = editingProject.status !== 'delivered' && data.status === 'delivered';

        const { error } = await supabase
          .from('movies')
          .update({
            title: data.title,
            client_name: data.clientName,
            video_type: data.videoType,
            main_editor: data.mainEditor,
            director: data.director,
            status: data.status,
            draft_due_date: data.draftDueDate,
            client_submitted_date: data.clientSubmittedDate,
            delivered_date: data.deliveredDate,
            drive_url: data.driveUrl,
            gigafile_url: data.gigafileUrl,
            gigafile_exp_date: data.gigafileExpDate,
            notes: data.notes,
          })
          .eq('id', editingProject.id);

        if (error) throw error;

        if (isNewlyDelivered) {
          const lineMessage =
            `🎉 【納品完了】案件が完了しました！\n\n` +
            `■ クライアント: ${data.clientName}\n` +
            `■ 案件名: ${data.title}\n` +
            `■ 担当者: ${data.mainEditor || '未設定'}`;

          await sendLineNotification(lineMessage);
        }

        showToast('案件を更新しました');
      } else {
        const { error } = await supabase.from('movies').insert([
          {
            title: data.title,
            client_name: data.clientName,
            video_type: data.videoType,
            main_editor: data.mainEditor,
            director: data.director,
            status: data.status || 'not_started',
            draft_due_date: data.draftDueDate,
            client_submitted_date: data.clientSubmittedDate,
            delivered_date: data.deliveredDate,
            drive_url: data.driveUrl,
            gigafile_url: data.gigafileUrl,
            gigafile_exp_date: data.gigafileExpDate,
            notes: data.notes,
          },
        ]);

        if (error) throw error;
        showToast('新規案件を追加しました');
      }

      setIsModalOpen(false);
      setEditingProject(null);
      fetchProjects();
    } catch (err) {
      alert('保存に失敗しました');
    }
  }

  // 案件削除
  async function handleDeleteProject(projectOrId: Project | string) {
    const id = typeof projectOrId === 'string' ? projectOrId : projectOrId.id;
    if (!confirm('本当にこの案件を削除しますか？')) return;

    try {
      const { error } = await supabase.from('movies').delete().eq('id', id);
      if (error) throw error;

      showToast('案件を削除しました');
      fetchProjects();
    } catch (err) {
      alert('削除に失敗しました');
    }
  }

  // 一括更新
  async function handleBulkUpdate(data: any) {
    if (selectedIds.length === 0) return;

    try {
      const updateData: any = {};
      if (data.status) updateData.status = data.status;
      if (data.editor) updateData.main_editor = data.editor;
      if (data.director) updateData.director = data.director;

      const { error } = await supabase.from('movies').update(updateData).in('id', selectedIds);
      if (error) throw error;

      showToast(`${selectedIds.length}件の案件を一括更新しました`);
      setSelectedIds([]);
      setIsBulkModalOpen(false);
      fetchProjects();
    } catch (err) {
      alert('一括更新に失敗しました');
    }
  }

  // メンバー追加
  const handleAddMember = (name: string) => {
    if (!name.trim()) return;
    const newMember: Member = { id: Date.now().toString(), name: name.trim(), role: 'both' };
    setMembers((prev) => [...prev, newMember]);
    showToast(`メンバー「${name}」を追加しました`);
  };

  // メンバー削除
  const handleDeleteMember = async (id: string) => {
    const target = members.find((m) => m.id === id);
    if (!target) return;

    if (!confirm(`「${target.name}」を削除しますか？\n担当に設定されている案件は「未割当」に変更されます。`)) {
      return;
    }

    try {
      await supabase.from('movies').update({ main_editor: '' }).eq('main_editor', target.name);
      await supabase.from('movies').update({ director: '' }).eq('director', target.name);

      setMembers((prev) => prev.filter((m) => m.id !== id));
      showToast(`メンバー「${target.name}」を削除し、関連案件を更新しました`);
      fetchProjects();
    } catch (err) {
      alert('メンバーの削除・更新に失敗しました');
    }
  };

  const handleOpenAddModal = () => {
    setEditingProject(null);
    setFormData(emptyFormData);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (p: Project) => {
    setEditingProject(p);
    setFormData(projectToFormData(p));
    setIsModalOpen(true);
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
  };

  const bgMain = isLight ? 'bg-slate-100 text-slate-900' : 'bg-neutral-950 text-neutral-100';

  return (
    <div className={`min-h-screen p-4 md:p-6 transition-colors duration-200 ${bgMain}`}>
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-3 text-sm font-bold text-white shadow-lg animate-bounce">
          <Check className="h-5 w-5" />
          {toastMessage}
        </div>
      )}

      {/* Header */}
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-neutral-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500 text-neutral-950 font-black shadow-md">
            <Clapperboard className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">動画制作 進捗管理</h1>
            <p className="text-xs text-neutral-400">Project Progress Tracker</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* View Mode Buttons */}
          <div className="flex rounded-lg border border-neutral-800 p-1 bg-neutral-900">
            <button
              onClick={() => setActiveTab('kanban')}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-bold transition-all ${
                activeTab === 'kanban'
                  ? 'bg-amber-500 text-neutral-950 shadow'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              カンバン
            </button>
            <button
              onClick={() => setActiveTab('clientTable')}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-bold transition-all ${
                activeTab === 'clientTable'
                  ? 'bg-amber-500 text-neutral-950 shadow'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <TableIcon className="h-3.5 w-3.5" />
              クライアント別
            </button>
            <button
              onClick={() => setActiveTab('director')}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-bold transition-all ${
                activeTab === 'director'
                  ? 'bg-amber-500 text-neutral-950 shadow'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <Users className="h-3.5 w-3.5" />
              ディレクター別
            </button>
          </div>

          {/* Member Management Button */}
          <button
            onClick={() => setIsMemberModalOpen(true)}
            className="flex items-center gap-1.5 rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-xs font-bold text-neutral-200 hover:bg-neutral-800 transition-colors"
          >
            <Users className="h-4 w-4 text-amber-500" />
            担当者管理
          </button>

          {/* Bulk Update Button */}
          {selectedIds.length > 0 && (
            <button
              onClick={() => setIsBulkModalOpen(true)}
              className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-bold text-white hover:bg-indigo-500 transition-colors shadow"
            >
              一括更新 ({selectedIds.length})
            </button>
          )}

          {/* Add Project Button */}
          <button
            onClick={handleOpenAddModal}
            className="flex items-center gap-1.5 rounded-lg bg-amber-500 px-4 py-2 text-xs font-bold text-neutral-950 hover:bg-amber-400 transition-colors shadow"
          >
            <Plus className="h-4 w-4" />
            新規案件追加
          </button>

          {/* Theme Toggle */}
          <button
            onClick={() => setIsLight(!isLight)}
            className="rounded-lg border border-neutral-800 p-2 text-neutral-400 hover:text-white transition-colors"
          >
            {isLight ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
          </button>
        </div>
      </header>

      {/* Filter Bar */}
      <div className="mb-6">
        <FilterBar
          filters={filters}
          isLight={isLight}
          onChange={setFilters}
          clientNames={clientNames}
          editorNames={editorNames}
          onOpenAddModal={handleOpenAddModal}
        />
      </div>

      {/* Content Views */}
      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <RefreshCw className="h-8 w-8 animate-spin text-amber-500" />
        </div>
      ) : (
        <>
          {activeTab === 'kanban' && (
            <KanbanBoard
              {...({
                projects: filteredProjects,
                isLight,
                onStatusChange: handleStatusChange,
                onEditProject: handleOpenEditModal,
                onEdit: handleOpenEditModal,
                onDeleteProject: handleDeleteProject,
                onDelete: (p: any) => handleDeleteProject(p.id || p),
              } as any)}
            />
          )}

          {activeTab === 'clientTable' && (
            <ClientTableView
              projects={filteredProjects}
              clientNames={clientNames}
              editorNames={editorNames}
              selectedClient={selectedClient}
              isLight={isLight}
              onSelectClient={setSelectedClient}
              onEditProject={handleOpenEditModal}
              onCopyLink={(url: string) => {
                if (url) {
                  navigator.clipboard.writeText(url);
                  showToast('リンクをコピーしました');
                }
              }}
              selectedIds={selectedIds}
              onToggleSelect={handleToggleSelect}
            />
          )}

          {activeTab === 'director' && (
            <DirectorPanel
              {...({
                projects: filteredProjects,
                isLight,
                onStatusChange: handleStatusChange,
                onEditProject: handleOpenEditModal,
                onEdit: handleOpenEditModal,
              } as any)}
            />
          )}
        </>
      )}

      {/* Modals */}
      {isModalOpen && (
        <ProjectFormModal
          {...({
            isLight,
            editingProject,
            initial: formData,
            formData,
            clientNames,
            editorNames,
            editorList: editorNames,
            onChange: (data: any) => setFormData((prev: any) => ({ ...prev, ...data })),
            onClose: () => setIsModalOpen(false),
            onSubmit: () => handleSaveProject(formData),
          } as any)}
        />
      )}

      {isBulkModalOpen && (
        <BulkActionModal
          {...({
            isLight,
            selectedCount: selectedIds.length,
            editorNames,
            editorList: editorNames,
            onClose: () => setIsBulkModalOpen(false),
            onSubmit: handleBulkUpdate,
          } as any)}
        />
      )}

      {isMemberModalOpen && (
        <MemberManagementModal
          {...({
            isLight,
            members,
            editorList: editorNames,
            directorList: editorNames,
            onClose: () => setIsMemberModalOpen(false),
            onAddMember: (name: string) => handleAddMember(name),
            onDeleteMember: handleDeleteMember,
          } as any)}
        />
      )}
    </div>
  );
}