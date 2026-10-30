'use client';

import React, { useState, useEffect } from 'react';
import { CommunityResource } from '../lib/types';
import { fetchCommunityResources, createCommunityResource } from '../lib/api';
import { useAuth } from '../lib/auth-context';
import { useToast } from '../lib/toast-context';
import {
  FileText,
  Download,
  Plus,
  FileCode,
  FileSpreadsheet,
  Link2,
  FolderOpen,
  X,
} from 'lucide-react';

interface ResourcesWidgetProps {
  communityId: string;
}

export default function ResourcesWidget({ communityId }: ResourcesWidgetProps) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [resources, setResources] = useState<CommunityResource[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [fileUrl, setFileUrl] = useState('');
  const [fileType, setFileType] = useState('pdf');
  const [category, setCategory] = useState('Documentation');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadResources();
  }, [communityId]);

  const loadResources = async () => {
    setLoading(true);
    try {
      const res = await fetchCommunityResources(communityId);
      setResources(res.resources);
    } catch {
      showToast('Failed to load resources', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !fileUrl) {
      showToast('Title and File URL are required', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const res = await createCommunityResource(communityId, {
        title,
        description,
        file_url: fileUrl,
        file_type: fileType,
        category,
      });

      if (res.data) {
        showToast('Resource added successfully!', 'success');
        setIsModalOpen(false);
        setTitle('');
        setDescription('');
        setFileUrl('');
        loadResources();
      } else {
        showToast(res.error || 'Failed to add resource', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Error uploading resource', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const getFileIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'code':
      case 'ts':
      case 'py':
        return <FileCode className="w-5 h-5 text-orange-400" />;
      case 'sheet':
      case 'csv':
        return <FileSpreadsheet className="w-5 h-5 text-emerald-400" />;
      case 'link':
        return <Link2 className="w-5 h-5 text-blue-400" />;
      default:
        return <FileText className="w-5 h-5 text-rose-400" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 glass-panel p-6 rounded-2xl border border-white/10">
        <div>
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <FolderOpen className="w-6 h-6 text-emerald-400" />
            Community Resource Repository
          </h3>
          <p className="text-sm text-zinc-400 mt-1">
            Download verified starter kits, cheat sheets, whitepapers, and guides.
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold shadow-md shadow-emerald-600/30 hover:shadow-emerald-600/50 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Share Resource
        </button>
      </div>

      {/* Resources Table/Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2].map((i) => (
            <div key={i} className="animate-pulse glass-panel p-6 rounded-2xl border border-white/5 h-32" />
          ))}
        </div>
      ) : resources.length === 0 ? (
        <div className="text-center py-14 glass-panel rounded-2xl border border-dashed border-white/10 p-8">
          <FolderOpen className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
          <h4 className="text-base font-semibold text-zinc-300">No resources shared yet</h4>
          <p className="text-sm text-zinc-500 max-w-sm mx-auto mt-1">
            Share learning docs, code boilerplates, or presentations with fellow members!
          </p>
          <button
            onClick={() => setIsModalOpen(true)}
            className="mt-4 px-4 py-2 text-sm bg-emerald-600/20 text-emerald-300 border border-emerald-500/30 font-medium rounded-xl hover:bg-emerald-600/30 transition-colors cursor-pointer"
          >
            Share the first resource
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {resources.map((item) => (
            <div
              key={item.id}
              className="glass-panel rounded-2xl p-5 border border-white/[0.08] hover:border-emerald-500/30 transition-all flex items-start gap-4"
            >
              <div className="p-3 rounded-xl bg-white/[0.04] border border-white/[0.06] flex-shrink-0">
                {getFileIcon(item.file_type)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-300 bg-emerald-500/15 border border-emerald-500/25 px-2 py-0.5 rounded-md">
                    {item.category || item.file_type}
                  </span>
                  <span className="text-xs text-zinc-500">
                    Uploaded by {item.uploader?.full_name || 'Member'}
                  </span>
                </div>
                <h4 className="font-bold text-zinc-100 text-base mt-1 truncate">{item.title}</h4>
                {item.description && (
                  <p className="text-xs text-zinc-400 mt-1 line-clamp-2">{item.description}</p>
                )}
                <div className="mt-3 flex items-center gap-3">
                  <a
                    href={item.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/15 border border-emerald-500/25 text-emerald-300 text-xs font-semibold hover:bg-emerald-500/25 transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download / View
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Share Resource Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in">
          <div className="glass-panel bg-[#0e111d] rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-white/10 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <FolderOpen className="w-5 h-5 text-emerald-400" />
                Share Resource with Community
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="mt-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
                  Resource Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. System Design Primer 2026 Edition"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 focus:outline-none focus:border-emerald-500 text-sm text-zinc-100 placeholder-zinc-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
                  Description
                </label>
                <textarea
                  rows={2}
                  placeholder="Brief summary of what this document or code covers"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 focus:outline-none focus:border-emerald-500 text-sm text-zinc-100 placeholder-zinc-500 resize-none transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
                  File URL or GitHub Repo *
                </label>
                <input
                  type="url"
                  required
                  placeholder="https://..."
                  value={fileUrl}
                  onChange={(e) => setFileUrl(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 focus:outline-none focus:border-emerald-500 text-sm text-zinc-100 placeholder-zinc-500 transition-colors"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
                    File Type
                  </label>
                  <select
                    value={fileType}
                    onChange={(e) => setFileType(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500 transition-colors"
                  >
                    <option value="pdf">PDF Document</option>
                    <option value="code">Source Code / Repo</option>
                    <option value="sheet">Spreadsheet / Data</option>
                    <option value="link">Interactive Link</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
                    Category
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500 transition-colors"
                  >
                    <option value="Documentation">Documentation</option>
                    <option value="Tutorial">Tutorial</option>
                    <option value="Template">Starter Template</option>
                    <option value="Cheatsheet">Cheat Sheet</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 text-sm font-medium text-zinc-400 hover:text-white hover:bg-white/5 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl shadow-md shadow-emerald-600/30 transition-all disabled:opacity-50 cursor-pointer"
                >
                  {submitting ? 'Sharing...' : 'Share Resource'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
