'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Navbar from '../components/Navbar';
import { useAuth } from '../lib/auth-context';
import {
  sendAssistantMessage,
  fetchAssistantConversations,
  deleteAssistantConversation,
  fetchCommunities,
} from '../lib/api';
import {
  AssistantChatMessage,
  AssistantConversation,
  AssistantSource,
  Community,
} from '../lib/types';
import { RichMarkdownText } from '../components/RichMarkdownText';
import { getRoleName, getUserPermissionsList } from '../lib/rbac';
import {
  Sparkles,
  Bot,
  Send,
  Plus,
  Trash2,
  ExternalLink,
  CheckCircle2,
  HelpCircle,
  RefreshCw,
  AlertCircle,
  Lightbulb,
  MessageSquare,
  ArrowRight,
  Filter,
  Layers,
  ChevronRight,
  Info,
  UserCheck,
} from 'lucide-react';

const SUGGESTED_RESEARCH_PROMPTS = [
  {
    category: 'Active Profile & RBAC',
    title: 'Account Identity & Role Permissions',
    prompt: 'Who am I, what is my role, and what are my permissions?',
    desc: 'Verifies logged-in user details, active role scope, and governance permissions loaded into the AI session.',
    badge: 'Personalized',
  },
  {
    category: 'Productivity & Habits',
    title: 'Daily Routine & Focus Optimization',
    prompt: 'How can I improve my daily routine?',
    desc: 'Searches developer habits, the 3-Block deep work schedule, and circadian rhythm routines.',
    badge: 'Community Backed',
  },
  {
    category: 'Performance Engineering',
    title: 'Reducing LLM Inference Latency',
    prompt: 'Strategies for reducing LLM inference latency in multi-turn agents',
    desc: 'Analyzes speculative decoding, FP8 KV-cache quantization, and semantic caching.',
    badge: 'Community Backed',
  },
  {
    category: 'Full-Stack Architecture',
    title: 'FastAPI & React Cross-Origin Setup',
    prompt: 'How to configure CORS middleware in FastAPI and React?',
    desc: 'Troubleshoots preflight OPTIONS headers, allowed origins, and credentials.',
    badge: 'Community Backed',
  },
  {
    category: 'General AI Advice (Missing Community Topic)',
    title: 'Bonsai Tree Care (General Knowledge)',
    prompt: 'How do I cultivate organic Bonsai trees indoors?',
    desc: 'Tests honest missing info handling and clear labeling of general AI advice.',
    badge: 'General AI',
  },
];

export default function AssistantPage() {
  const { user } = useAuth();
  const userRole = getRoleName(user);

  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Community scoping
  const [communities, setCommunities] = useState<Community[]>([]);
  const [selectedCommunityId, setSelectedCommunityId] = useState<string>('all');

  // Active conversation state
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<AssistantChatMessage[]>([]);
  const [conversations, setConversations] = useState<AssistantConversation[]>([]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    loadCommunities();
    loadSavedConversations();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const loadCommunities = async () => {
    try {
      const { communities: list } = await fetchCommunities('', 1, 20);
      setCommunities(list || []);
    } catch (err) {
      console.error('Failed to load communities:', err);
    }
  };

  const loadSavedConversations = async () => {
    try {
      const { conversations: list } = await fetchAssistantConversations();
      setConversations(list || []);
    } catch (err) {
      console.error('Failed to load assistant conversations:', err);
    }
  };

  const handleStartNewConversation = () => {
    setConversationId(null);
    setMessages([]);
    setErrorMessage(null);
    setTimeout(() => textareaRef.current?.focus(), 100);
  };

  const handleSelectConversation = (conv: AssistantConversation) => {
    setConversationId(conv.id);
    setMessages(conv.messages || []);
    setErrorMessage(null);
  };

  const handleDeleteConversation = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await deleteAssistantConversation(id);
    const updated = conversations.filter((c) => c.id !== id);
    setConversations(updated);
    if (conversationId === id) {
      handleStartNewConversation();
    }
  };

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputMessage).trim();
    if (!text || isLoading) return;

    setInputMessage('');
    setErrorMessage(null);

    const tempUserMsg: AssistantChatMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date().toISOString(),
    };
    const updatedMessages = [...messages, tempUserMsg];
    setMessages(updatedMessages);

    setIsLoading(true);
    setLoadingStep('Searching community discussions & replies...');

    try {
      const timer = setTimeout(() => {
        setLoadingStep('Synthesizing verified solutions & citations...');
      }, 700);

      const historyPayload = updatedMessages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const userProfile = user ? {
        id: user.id,
        name: user.full_name,
        email: user.email,
        role: userRole,
        bio: user.bio || undefined,
        avatar_url: user.avatar_url || undefined,
        permissions: getUserPermissionsList(user),
      } : undefined;

      const res = await sendAssistantMessage({
        message: text,
        conversation_id: conversationId || undefined,
        community_id: selectedCommunityId !== 'all' ? selectedCommunityId : undefined,
        user_profile: userProfile,
        history: historyPayload,
      });

      clearTimeout(timer);

      const answerContent =
        res?.data?.answer ||
        'I received your message, but the model did not generate an answer. Please try again.';

      const aiMsg: AssistantChatMessage = {
        id: `a-${Date.now()}`,
        role: 'assistant',
        content: answerContent,
        timestamp: new Date().toISOString(),
        is_community_backed: res?.data?.is_community_backed ?? false,
        missing_information_note: res?.data?.missing_information_note,
        sources: res?.data?.sources || [],
        suggested_followups: res?.data?.suggested_followups || [],
        corrected_query: res?.data?.corrected_query,
        did_you_mean: res?.data?.did_you_mean,
        suggested_queries: res?.data?.suggested_queries || [],
      };

      setConversationId(res?.data?.conversation_id || conversationId || `conv-${Date.now()}`);
      setMessages([...updatedMessages, aiMsg]);
      loadSavedConversations();
    } catch (err: any) {
      setErrorMessage(
        err.message || 'Failed to generate response. Please try asking again.'
      );
    } finally {
      setIsLoading(false);
      setLoadingStep('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#07090e] text-foreground">
      <Navbar />

      <main className="flex-1 flex flex-col max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Workspace Container */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-6 bg-[#0d0f18]/90 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden shadow-2xl min-h-[750px]">
          {/* Left Sidebar: Conversations & Community Filter */}
          <aside className="lg:col-span-1 border-b lg:border-b-0 lg:border-r border-white/10 p-4 flex flex-col bg-white/[0.02]">
            {/* New Chat Button */}
            <button
              onClick={handleStartNewConversation}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 btn-orange-primary text-white text-sm font-semibold shadow-lg shadow-orange-500/25 transition-all cursor-pointer mb-4"
            >
              <Plus className="w-4 h-4" />
              <span>New Conversation</span>
            </button>

            {/* Active User Identity Section */}
            {user && (
              <div className="mb-4 p-3 rounded-xl bg-white/[0.04] border border-white/10 select-none">
                <div className="flex items-center gap-2.5 mb-2">
                  {user.avatar_url ? (
                    <img
                      src={user.avatar_url}
                      alt={user.full_name}
                      className="w-9 h-9 rounded-full object-cover shrink-0 border border-orange-500/40"
                    />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-orange-500 to-amber-500 text-xs font-bold text-white flex items-center justify-center shrink-0">
                      {user.full_name.charAt(0)}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-white truncate">
                        {user.full_name}
                      </span>
                      <span
                        className={`text-[9px] font-bold uppercase px-1.5 py-0.2 rounded shrink-0 ${
                          userRole === 'Admin'
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        }`}
                      >
                        {userRole}
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-400 truncate">{user.email}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between text-[10px] pt-1.5 border-t border-white/5 text-zinc-400">
                  <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Session Loaded
                  </span>
                  <span className="text-zinc-500">
                    {userRole === 'Admin' ? 'Full RBAC' : 'Restricted Member'}
                  </span>
                </div>
              </div>
            )}

            {/* Scope Selector */}
            <div className="mb-5">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 mb-2 flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5 text-orange-400" />
                <span>Knowledge Scope</span>
              </label>
              <select
                value={selectedCommunityId}
                onChange={(e) => setSelectedCommunityId(e.target.value)}
                className="w-full bg-[#121526] border border-white/15 rounded-xl px-3 py-2 text-xs text-zinc-200 outline-none focus:border-orange-500 transition-colors cursor-pointer"
              >
                <option value="all">Across All Communities</option>
                {communities.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Past Conversations List */}
            <div className="flex-1 flex flex-col min-h-0">
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/10">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-zinc-500" />
                  <span>History ({conversations.length})</span>
                </span>
              </div>

              <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 custom-scrollbar">
                {conversations.length === 0 ? (
                  <div className="text-center py-8 text-zinc-500 text-xs leading-relaxed">
                    No conversations yet. Ask your first question to get started.
                  </div>
                ) : (
                  conversations.map((c) => (
                    <div
                      key={c.id}
                      onClick={() => handleSelectConversation(c)}
                      className={`group flex items-center justify-between p-2.5 rounded-xl text-left text-xs transition-all cursor-pointer ${
                        c.id === conversationId
                          ? 'bg-orange-500/20 text-white border border-orange-500/40 font-medium'
                          : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5 border border-transparent'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <MessageSquare className="w-3.5 h-3.5 text-zinc-500 group-hover:text-orange-400 shrink-0" />
                        <span className="truncate">{c.title}</span>
                      </div>
                      <button
                        onClick={(e) => handleDeleteConversation(c.id, e)}
                        title="Delete conversation"
                        className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-500/20 text-zinc-400 hover:text-red-400 transition-all shrink-0 cursor-pointer ml-1"
                        aria-label="Delete conversation"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Architecture Tip */}
            <div className="mt-4 pt-3 border-t border-white/10 text-[11px] text-zinc-500 flex items-start gap-2">
              <Info className="w-3.5 h-3.5 text-orange-400 shrink-0 mt-0.5" />
              <span>
                Retrieves relevant community discussions and synthesizes community-backed answers with verified source references.
              </span>
            </div>
          </aside>

          {/* Right Main Area: Chat Window */}
          <section className="lg:col-span-3 flex flex-col min-h-0 bg-[#0a0c14]">
            {/* Workspace Header */}
            <div className="px-6 py-4 border-b border-white/10 bg-white/[0.02] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-orange-500 to-amber-500 p-[1px]">
                  <div className="w-full h-full bg-[#0d0f18] rounded-[11px] flex items-center justify-center">
                    <Bot className="w-5 h-5 text-orange-400" />
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-base font-bold text-white tracking-tight">
                      Nexus AI Research Assistant
                    </h1>
                    <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-300 border border-orange-500/30">
                      Feature A
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400">
                    Community-grounded RAG engine • Direct post citations • Follow-up discovery
                  </p>
                </div>
              </div>

              {conversationId && (
                <button
                  onClick={handleStartNewConversation}
                  className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-medium text-zinc-300 transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  New Chat
                </button>
              )}
            </div>

            {/* Messages Feed */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
              {/* Empty State */}
              {messages.length === 0 && (
                <div className="py-8 flex flex-col items-center text-center max-w-2xl mx-auto">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-orange-500/20 via-orange-500/30 to-amber-500/20 border border-orange-500/30 flex items-center justify-center mb-4">
                    <Sparkles className="w-7 h-7 text-orange-400" />
                  </div>
                  <h2 className="text-xl font-bold text-white mb-2">
                    {user?.full_name ? `Welcome back, ${user.full_name.split(' ')[0]}!` : 'What would you like to explore today?'}
                  </h2>
                  <p className="text-sm text-zinc-400 mb-4 leading-relaxed">
                    Personalized assistant loaded for your profile as{' '}
                    <strong className="text-zinc-200">{userRole}</strong>. Ask about technical
                    architectures, platform rules, or your account permissions.
                  </p>

                  {user && (
                    <div className="w-full max-w-md mb-6 p-3.5 rounded-xl bg-white/[0.04] border border-white/10 text-left flex items-start gap-3">
                      {user.avatar_url ? (
                        <img
                          src={user.avatar_url}
                          alt={user.full_name}
                          className="w-10 h-10 rounded-full object-cover shrink-0 border border-orange-500/40"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-orange-500 to-amber-500 text-sm font-bold text-white flex items-center justify-center shrink-0">
                          {user.full_name.charAt(0)}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-sm font-bold text-white truncate">
                            {user.full_name}
                          </span>
                          <span
                            className={`text-[9px] font-bold uppercase px-1.5 py-0.2 rounded ${
                              userRole === 'Admin'
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            }`}
                          >
                            {userRole}
                          </span>
                        </div>
                        <div className="text-xs text-zinc-400 truncate">
                          {user.email}
                        </div>
                        {user.bio && (
                          <div className="text-[11px] text-zinc-500 truncate mt-0.5">
                            {user.bio}
                          </div>
                        )}
                        <div className="mt-1.5 flex items-center gap-1.5 text-[10px] text-emerald-400 font-medium">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          <span>Active Credentials Loaded into AI RAG Session</span>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="w-full text-left">
                    <div className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Layers className="w-4 h-4 text-orange-400" />
                        <span>Curated Research Topics</span>
                      </div>
                      <span className="text-[11px] font-medium text-orange-400 lowercase">
                        for {userRole}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {SUGGESTED_RESEARCH_PROMPTS.map((item, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleSendMessage(item.prompt)}
                          className="p-4 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/10 hover:border-orange-500/40 transition-all text-left group cursor-pointer flex flex-col justify-between"
                        >
                          <div>
                            <div className="flex items-center justify-between gap-2 mb-1.5">
                              <span className="text-[10px] font-semibold uppercase tracking-wider text-orange-400">
                                {item.category}
                              </span>
                              <span
                                className={`text-[10px] px-1.5 py-0.2 rounded font-semibold ${
                                  item.badge === 'Community Backed'
                                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                    : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                }`}
                              >
                                {item.badge}
                              </span>
                            </div>
                            <h3 className="text-sm font-semibold text-zinc-100 group-hover:text-orange-300 transition-colors mb-1">
                              {item.title}
                            </h3>
                            <p className="text-xs text-zinc-400 leading-relaxed mb-3">
                              {item.desc}
                            </p>
                          </div>
                          <div className="flex items-center gap-1 text-xs font-medium text-orange-400 group-hover:text-orange-300">
                            <span>Ask Question</span>
                            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Message Thread */}
              {messages.map((m) => {
                const isUser = m.role === 'user';
                return (
                  <div
                    key={m.id}
                    className={`flex flex-col ${
                      isUser ? 'items-end' : 'items-start'
                    } animate-in fade-in duration-200`}
                  >
                    <div
                      className={`max-w-[85%] rounded-2xl px-5 py-4 text-sm leading-relaxed ${
                        isUser
                          ? 'bg-gradient-to-r from-orange-500 to-amber-600 text-white rounded-br-xs shadow-md shadow-orange-500/20'
                          : 'bg-white/[0.05] text-zinc-200 border border-white/10 rounded-bl-xs'
                      }`}
                    >
                      {/* Community Backed vs General AI Badge */}
                      {!isUser ? (
                        <>
                          <div className="mb-3 flex items-center justify-between gap-2 flex-wrap pb-2.5 border-b border-white/10">
                            <div className="flex items-center gap-2 flex-wrap">
                              {m.is_community_backed ? (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                                  Community-Backed Answer
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                                  <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
                                  General AI Guidance
                                </span>
                              )}
                              {user?.full_name && (
                                <span className="text-[11px] text-zinc-400 bg-white/5 px-2 py-0.5 rounded border border-white/10">
                                  Personalized for {user.full_name.split(' ')[0]}
                                </span>
                              )}
                            </div>

                            {m.sources && m.sources.length > 0 && (
                              <span className="text-xs text-zinc-400">
                                {m.sources.length} community source{m.sources.length > 1 ? 's' : ''} cited
                              </span>
                            )}
                          </div>

                          {/* Typo / Grammatical Recorrection Notice */}
                          {m.corrected_query && (
                            <div className="mb-3 px-3.5 py-2 rounded-xl bg-orange-500/10 border border-orange-500/30 flex items-center justify-between gap-2 text-xs">
                              <div className="flex items-center gap-2 min-w-0">
                                <Sparkles className="w-4 h-4 text-orange-400 shrink-0" />
                                <span className="text-xs text-zinc-300 truncate">
                                  Interpreted query: <strong className="text-orange-300 font-semibold italic">"{m.corrected_query}"</strong>
                                </span>
                              </div>
                              <span className="text-[10px] uppercase font-bold text-orange-400 bg-orange-500/20 px-2 py-0.5 rounded border border-orange-500/30 shrink-0">
                                Autocorrected
                              </span>
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="flex items-center gap-2 mb-2 pb-1.5 border-b border-white/10 text-xs text-orange-200 font-medium">
                          {user?.avatar_url ? (
                            <img
                              src={user.avatar_url}
                              alt={user.full_name}
                              className="w-4 h-4 rounded-full object-cover shrink-0 border border-white/20"
                            />
                          ) : (
                            <div className="w-4 h-4 rounded-full bg-white/20 text-[9px] font-bold flex items-center justify-center text-white shrink-0">
                              {user?.full_name ? user.full_name.charAt(0) : 'U'}
                            </div>
                          )}
                          <span>{user?.full_name || 'You'}</span>
                          <span className="text-[9px] uppercase px-1.5 py-0.2 rounded bg-white/20 text-white font-bold ml-auto">
                            {userRole}
                          </span>
                        </div>
                      )}

                      {/* Content (Rich Text Markdown) */}
                      {isUser ? (
                        <div className="whitespace-pre-wrap leading-relaxed text-sm">
                          {m.content}
                        </div>
                      ) : (
                        <RichMarkdownText content={m.content} />
                      )}

                      {/* Sources Cards */}
                      {!isUser && m.sources && m.sources.length > 0 && (
                        <div className="mt-4 pt-4 border-t border-white/10">
                          <div className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-3 flex items-center gap-2">
                            <span>Referenced Community Discussions</span>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                            {m.sources.map((s) => (
                              <Link
                                key={s.id}
                                href={s.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-3 rounded-xl bg-black/40 hover:bg-white/[0.08] border border-white/10 hover:border-orange-500/50 transition-all group block"
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex flex-col min-w-0">
                                    <div className="flex items-center gap-1.5 mb-1">
                                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-orange-500/20 text-orange-300 font-medium">
                                        {s.community_name}
                                      </span>
                                      {s.is_verified_solution && (
                                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-medium flex items-center gap-1">
                                          <CheckCircle2 className="w-2.5 h-2.5" />
                                          Verified Solution
                                        </span>
                                      )}
                                    </div>
                                    <span className="font-semibold text-xs text-zinc-100 group-hover:text-orange-300 transition-colors line-clamp-1">
                                      {s.title}
                                    </span>
                                    <span className="text-[11px] text-zinc-400 line-clamp-2 mt-1">
                                      {s.excerpt}
                                    </span>
                                    <span className="text-[10px] text-zinc-500 mt-1.5">
                                      By {s.author_name} • Match: {Math.round(s.relevance_score * 100)}%
                                    </span>
                                  </div>
                                  <ExternalLink className="w-4 h-4 text-zinc-500 group-hover:text-orange-400 shrink-0 mt-0.5 transition-colors" />
                                </div>
                              </Link>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Interactive Suggested Follow-Up Questions */}
                      {!isUser && m.suggested_followups && m.suggested_followups.length > 0 && (
                        <div className="mt-4 pt-3 border-t border-white/10">
                          <div className="text-xs font-semibold text-zinc-400 mb-2.5 flex items-center gap-1.5">
                            <HelpCircle className="w-3.5 h-3.5 text-orange-400" />
                            Suggested Follow-up Questions:
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {m.suggested_followups.map((q, qIdx) => (
                              <button
                                key={qIdx}
                                onClick={() => handleSendMessage(q)}
                                disabled={isLoading}
                                className="text-left text-xs px-3 py-1.5 rounded-lg bg-orange-500/10 hover:bg-orange-500/20 text-orange-300 border border-orange-500/30 hover:border-orange-500/50 transition-all cursor-pointer disabled:opacity-50"
                              >
                                {q}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Suggested Similar Queries */}
                      {!isUser && m.suggested_queries && m.suggested_queries.length > 0 && (
                        <div className="mt-4 pt-3 border-t border-white/10">
                          <div className="text-xs font-semibold text-zinc-400 mb-2.5 flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5 text-orange-400" />
                            <span>Suggested Similar Queries:</span>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {m.suggested_queries.map((sq, sqIdx) => (
                              <button
                                key={sqIdx}
                                onClick={() => handleSendMessage(sq)}
                                disabled={isLoading}
                                className="text-left text-xs px-3 py-1.5 rounded-lg bg-white/[0.04] hover:bg-orange-500/20 text-zinc-300 hover:text-orange-200 border border-white/10 hover:border-orange-500/40 transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1.5 group"
                              >
                                <span className="text-orange-400 group-hover:translate-x-0.5 transition-transform">↳</span>
                                <span>{sq}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    <span className="text-[11px] text-zinc-500 px-1 mt-1">
                      {new Date(m.timestamp).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                );
              })}

              {/* Loading State */}
              {isLoading && (
                <div className="flex items-start gap-3 animate-in fade-in duration-200">
                  <div className="w-8 h-8 rounded-xl bg-orange-500/20 border border-orange-500/30 flex items-center justify-center shrink-0 mt-1">
                    <Sparkles className="w-4 h-4 text-orange-400 animate-spin" />
                  </div>
                  <div className="bg-white/[0.06] border border-white/10 rounded-2xl rounded-bl-xs px-5 py-3.5 max-w-[80%]">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-2 h-2 rounded-full bg-orange-400 animate-ping" />
                      <span className="text-xs font-semibold text-orange-300">
                        {loadingStep || 'Searching community discussions...'}
                      </span>
                    </div>
                    <div className="flex gap-1.5 items-center">
                      <span className="w-2.5 h-2.5 rounded-full bg-zinc-500 animate-bounce [animation-delay:-0.3s]" />
                      <span className="w-2.5 h-2.5 rounded-full bg-zinc-500 animate-bounce [animation-delay:-0.15s]" />
                      <span className="w-2.5 h-2.5 rounded-full bg-zinc-500 animate-bounce" />
                    </div>
                  </div>
                </div>
              )}

              {/* Error State */}
              {errorMessage && (
                <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-300 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                    <span>{errorMessage}</span>
                  </div>
                  <button
                    onClick={() => handleSendMessage()}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-red-500/20 hover:bg-red-500/30 font-semibold text-xs text-red-200 transition-colors shrink-0 cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Retry
                  </button>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input Composer */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="p-4 border-t border-white/10 bg-white/[0.02]"
            >
              <div className="relative flex items-end gap-3 bg-[#121526] border border-white/15 focus-within:border-orange-500 rounded-xl p-3 transition-all shadow-inner">
                <textarea
                  ref={textareaRef}
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask a natural-language question... (e.g. 'How can I improve my daily routine?', 'Strategies for reducing LLM inference latency')"
                  rows={2}
                  className="w-full max-h-40 bg-transparent text-sm text-zinc-100 placeholder-zinc-500 resize-none outline-none focus:ring-0 leading-relaxed custom-scrollbar"
                />
                <button
                  type="submit"
                  disabled={!inputMessage.trim() || isLoading}
                  aria-label="Send Message"
                  className="p-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 btn-orange-primary disabled:opacity-40 text-white transition-all shrink-0 cursor-pointer shadow-lg shadow-orange-500/25"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>

              <div className="flex items-center justify-between mt-2.5 px-1 text-xs text-zinc-500">
                <span>
                  Press <kbd className="font-mono bg-white/5 px-1.5 py-0.5 rounded text-zinc-400">Enter</kbd> to send, <kbd className="font-mono bg-white/5 px-1.5 py-0.5 rounded text-zinc-400">Shift+Enter</kbd> for new line
                </span>
                <span>
                  Nexus AI Grounded RAG Engine
                </span>
              </div>
            </form>
          </section>
        </div>
      </main>
    </div>
  );
}
