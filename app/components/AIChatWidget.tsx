'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '../lib/auth-context';
import {
  sendAssistantMessage,
  fetchAssistantConversations,
  deleteAssistantConversation,
} from '../lib/api';
import {
  AssistantChatMessage,
  AssistantConversation,
  AssistantSource,
} from '../lib/types';
import { RichMarkdownText } from './RichMarkdownText';
import { getRoleName, getUserPermissionsList } from '../lib/rbac';
import {
  Sparkles,
  Bot,
  Send,
  X,
  Maximize2,
  Minimize2,
  Plus,
  History,
  Trash2,
  ExternalLink,
  CheckCircle2,
  HelpCircle,
  RefreshCw,
  AlertCircle,
  Lightbulb,
  MessageSquare,
  ArrowRight,
} from 'lucide-react';

interface AIChatWidgetProps {
  initialCommunityId?: string;
  initialCommunityName?: string;
  forceOpen?: boolean;
}

const QUICK_STARTER_PROMPTS = [
  {
    title: 'Who am I & My Permissions',
    prompt: 'Who am I, what is my role, and what are my permissions?',
    icon: '👤',
  },
  {
    title: 'Daily Routine & Focus',
    prompt: 'How can I improve my daily routine?',
    icon: '⚡',
  },
  {
    title: 'LLM Multi-Turn Latency',
    prompt: 'Strategies for reducing LLM inference latency in multi-turn agents',
    icon: '🚀',
  },
  {
    title: 'Member Restrictions & Scope',
    prompt: 'What are the restrictions on regular members in the community?',
    icon: '🛡️',
  },
];

export default function AIChatWidget({
  initialCommunityId,
  initialCommunityName,
  forceOpen = false,
}: AIChatWidgetProps) {
  const pathname = usePathname();
  const { user } = useAuth();
  const userRole = getRoleName(user);
  const [isOpen, setIsOpen] = useState(forceOpen);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Active conversation state
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<AssistantChatMessage[]>([]);
  const [conversations, setConversations] = useState<AssistantConversation[]>([]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Load conversations on mount
  useEffect(() => {
    loadSavedConversations();
  }, []);

  // Keyboard shortcut Ctrl+K to toggle assistant
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isLoading, isOpen]);

  // Focus textarea when widget opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => textareaRef.current?.focus(), 150);
    }
  }, [isOpen]);

  const loadSavedConversations = async () => {
    try {
      const { conversations: list } = await fetchAssistantConversations();
      setConversations(list);
      // Resume latest if not started
      if (!conversationId && list.length > 0 && messages.length === 0) {
        // Leave in empty/new state until user interacts or picks a session
      }
    } catch (err) {
      console.error('Failed to load assistant conversations:', err);
    }
  };

  const handleStartNewConversation = () => {
    setConversationId(null);
    setMessages([]);
    setErrorMessage(null);
    setShowHistory(false);
    setTimeout(() => textareaRef.current?.focus(), 100);
  };

  const handleSelectConversation = (conv: AssistantConversation) => {
    setConversationId(conv.id);
    setMessages(conv.messages || []);
    setErrorMessage(null);
    setShowHistory(false);
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

    // Optimistically push user message
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
        community_id: initialCommunityId,
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

  if (pathname === '/login' || pathname?.startsWith('/login/')) {
    return null;
  }

  return (
    <>
      {/* Floating Launcher Button */}
      {!isOpen && (
        <div className="fixed bottom-6 right-6 z-50">
          <button
            onClick={() => setIsOpen(true)}
            aria-label="Open Nexus AI Assistant"
            aria-expanded={isOpen}
            className="group relative flex items-center gap-3 px-4 py-3.5 rounded-full bg-gradient-to-r from-orange-500 via-orange-600 to-amber-600 btn-orange-primary text-white font-medium shadow-xl shadow-orange-500/30 hover:shadow-orange-500/50 hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer border border-white/20"
          >
            <div className="relative">
              <Sparkles className="w-5 h-5 text-orange-100 group-hover:rotate-12 transition-transform duration-300" />
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 rounded-full ring-2 ring-orange-900 animate-pulse" />
            </div>
            <span className="text-sm font-semibold tracking-wide hidden sm:inline">
              Ask AI Assistant
            </span>
            <kbd className="hidden md:inline-flex items-center gap-0.5 text-[10px] uppercase font-mono px-1.5 py-0.5 bg-black/30 border border-white/20 rounded text-orange-200">
              Ctrl+K
            </kbd>
          </button>
        </div>
      )}

      {/* Floating Chat Assistant Modal / Drawer */}
      {isOpen && (
        <div
          role="region"
          aria-label="Nexus AI Chat Assistant Window"
          className={`fixed z-50 transition-all duration-300 ease-in-out flex flex-col bg-[#0d0f18]/95 backdrop-blur-2xl border border-white/15 shadow-2xl rounded-2xl overflow-hidden ${
            isExpanded
              ? 'inset-4 md:inset-8 max-w-4xl mx-auto h-[calc(100vh-4rem)]'
              : 'bottom-4 right-4 sm:bottom-6 sm:right-6 w-[calc(100vw-2rem)] sm:w-[440px] h-[640px] max-h-[88vh]'
          }`}
        >
          {/* Header */}
          <header className="px-4 py-3.5 border-b border-white/10 bg-white/5 flex items-center justify-between gap-2 select-none">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-orange-500 to-amber-500 p-[1px] shrink-0">
                <div className="w-full h-full bg-[#0d0f18] rounded-[11px] flex items-center justify-center">
                  <Bot className="w-4 h-4 text-orange-400" />
                </div>
              </div>
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-bold text-white tracking-tight truncate">
                    Nexus AI Assistant
                  </h2>
                  <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded-full bg-orange-500/20 text-orange-300 border border-orange-500/30 shrink-0">
                    RAG Ready
                  </span>
                </div>
                {initialCommunityName && (
                  <span className="text-[11px] text-zinc-400 truncate">
                    Scoped to {initialCommunityName}
                  </span>
                )}
              </div>
            </div>

            {/* Active User Identity Pill */}
            {user && (
              <div
                title={`Logged in as ${user.full_name} (${user.email}) • Role: ${userRole}`}
                className="hidden sm:flex items-center gap-1.5 px-2 py-1 rounded-full bg-white/[0.06] border border-white/10 text-xs shrink-0 select-none"
              >
                {user.avatar_url ? (
                  <img
                    src={user.avatar_url}
                    alt={user.full_name}
                    className="w-4 h-4 rounded-full object-cover shrink-0 border border-orange-500/40"
                  />
                ) : (
                  <div className="w-4 h-4 rounded-full bg-gradient-to-tr from-orange-500 to-amber-500 text-[9px] font-bold text-white flex items-center justify-center shrink-0">
                    {user.full_name.charAt(0)}
                  </div>
                )}
                <span className="text-[11px] font-medium text-zinc-200 max-w-[80px] truncate">
                  {user.full_name.split(' ')[0]}
                </span>
                <span
                  className={`text-[9px] px-1.5 py-0.2 rounded font-bold uppercase ${
                    userRole === 'Admin'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  }`}
                >
                  {userRole}
                </span>
              </div>
            )}

            {/* Header Controls */}
            <div className="flex items-center gap-1 shrink-0">
              {/* New Conversation Button */}
              <button
                onClick={handleStartNewConversation}
                title="Start a new conversation"
                className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                aria-label="New Conversation"
              >
                <Plus className="w-4 h-4" />
              </button>

              {/* Toggle Conversation History Drawer */}
              <button
                onClick={() => setShowHistory(!showHistory)}
                title="Conversation history"
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                  showHistory
                    ? 'bg-orange-500/20 text-orange-300 border border-orange-500/30'
                    : 'text-zinc-400 hover:text-white hover:bg-white/10'
                }`}
                aria-label="Toggle Conversation History"
              >
                <History className="w-4 h-4" />
              </button>

              {/* Expand / Minimize */}
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                title={isExpanded ? 'Minimize' : 'Expand full view'}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors hidden sm:block cursor-pointer"
                aria-label={isExpanded ? 'Minimize' : 'Expand full view'}
              >
                {isExpanded ? (
                  <Minimize2 className="w-4 h-4" />
                ) : (
                  <Maximize2 className="w-4 h-4" />
                )}
              </button>

              {/* Close */}
              <button
                onClick={() => setIsOpen(false)}
                title="Close Assistant"
                className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                aria-label="Close Assistant"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </header>

          {/* Body: Messages or History Drawer */}
          <div className="relative flex-1 flex flex-col min-h-0 bg-[#0a0c14]">
            {/* Slide-over Conversation History List */}
            {showHistory && (
              <div className="absolute inset-0 z-20 bg-[#0d0f18]/98 backdrop-blur-xl p-4 flex flex-col border-b border-white/10 animate-in fade-in slide-from-top-4 duration-200">
                <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-3">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                    Past Conversations
                  </h3>
                  <button
                    onClick={handleStartNewConversation}
                    className="flex items-center gap-1.5 text-xs font-medium text-orange-400 hover:text-orange-300 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    New Chat
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                  {conversations.length === 0 ? (
                    <div className="text-center py-8 text-zinc-500 text-xs">
                      No saved conversations yet. Ask your first question!
                    </div>
                  ) : (
                    conversations.map((c) => (
                      <div
                        key={c.id}
                        onClick={() => handleSelectConversation(c)}
                        className={`group flex items-center justify-between p-2.5 rounded-xl text-left text-xs transition-all cursor-pointer ${
                          c.id === conversationId
                            ? 'bg-orange-500/20 text-white border border-orange-500/30'
                            : 'text-zinc-300 hover:bg-white/5 hover:text-white border border-transparent'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <MessageSquare className="w-3.5 h-3.5 text-zinc-400 group-hover:text-orange-400 shrink-0" />
                          <span className="truncate font-medium">{c.title}</span>
                        </div>
                        <button
                          onClick={(e) => handleDeleteConversation(c.id, e)}
                          title="Delete conversation"
                          className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-500/20 text-zinc-400 hover:text-red-400 transition-all ml-2 shrink-0 cursor-pointer"
                          aria-label="Delete conversation"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))
                  )}
                </div>

                <div className="pt-3 border-t border-white/10">
                  <button
                    onClick={() => setShowHistory(false)}
                    className="w-full py-2 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-medium text-zinc-300 transition-colors cursor-pointer text-center"
                  >
                    Back to Chat
                  </button>
                </div>
              </div>
            )}

            {/* Chat Messages Stream */}
            <div
              role="log"
              aria-live="polite"
              className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar"
            >
              {/* Empty State / Welcome Screen */}
              {messages.length === 0 && (
                <div className="py-6 flex flex-col items-center text-center animate-in fade-in duration-300">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-orange-500/20 to-amber-500/20 border border-orange-500/30 flex items-center justify-center mb-3">
                    <Sparkles className="w-6 h-6 text-orange-400" />
                  </div>
                  <h3 className="text-base font-bold text-white mb-1">
                    {user?.full_name
                      ? `Welcome back, ${user.full_name.split(' ')[0]}!`
                      : 'How can I help you today?'}
                  </h3>
                  <p className="text-xs text-zinc-400 max-w-sm mb-3 leading-relaxed">
                    Personalized assistant loaded for your profile as{' '}
                    <strong className="text-zinc-200">{userRole}</strong>. Ask about technical
                    architectures, platform rules, or your account permissions.
                  </p>

                  {user && (
                    <div className="w-full max-w-sm mb-4 p-3 rounded-xl bg-white/[0.04] border border-white/10 text-left flex items-start gap-3">
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
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span className="text-xs font-bold text-white truncate">
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
                        <div className="text-[11px] text-zinc-400 truncate">
                          {user.email}
                        </div>
                        <div className="mt-1 flex items-center gap-1 text-[10px] text-emerald-400 font-medium">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          <span>Active Account Details Synced to AI Assistant</span>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="w-full text-left">
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 mb-2.5 px-1 flex items-center justify-between">
                      <span>Tailored Suggestions</span>
                      <span className="text-[10px] font-medium text-orange-400 lowercase">
                        for {userRole}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 gap-2">
                      {QUICK_STARTER_PROMPTS.map((item, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleSendMessage(item.prompt)}
                          className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/10 hover:border-orange-500/40 transition-all text-left group cursor-pointer"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className="text-base">{item.icon}</span>
                            <div className="truncate">
                              <div className="text-xs font-medium text-zinc-200 group-hover:text-orange-300">
                                {item.title}
                              </div>
                              <div className="text-[11px] text-zinc-400 truncate">
                                {item.prompt}
                              </div>
                            </div>
                          </div>
                          <ArrowRight className="w-3.5 h-3.5 text-zinc-500 group-hover:text-orange-400 group-hover:translate-x-1 transition-all shrink-0 ml-2" />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Message History */}
              {messages.map((m) => {
                const isUser = m.role === 'user';
                return (
                  <div
                    key={m.id}
                    className={`flex flex-col ${
                      isUser ? 'items-end' : 'items-start'
                    } animate-in fade-in duration-200`}
                  >
                    {/* Message Bubble */}
                    <div
                      className={`max-w-[88%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                        isUser
                          ? 'bg-gradient-to-r from-orange-500 to-amber-600 text-white rounded-br-xs shadow-md shadow-orange-500/20'
                          : 'bg-white/[0.06] text-zinc-200 border border-white/10 rounded-bl-xs'
                      }`}
                    >
                      {/* Community-backed vs General AI Guidance Badge */}
                      {!isUser ? (
                        <>
                          <div className="mb-2.5 flex items-center justify-between gap-2 flex-wrap pb-2 border-b border-white/10">
                            <div className="flex items-center gap-2 flex-wrap">
                              {m.is_community_backed ? (
                                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                                  Community-Backed Answer
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                                  <Lightbulb className="w-3 h-3 text-amber-400" />
                                  General AI Guidance
                                </span>
                              )}
                              {user?.full_name && (
                                <span className="text-[10px] text-zinc-400 bg-white/5 px-1.5 py-0.5 rounded border border-white/10">
                                  Personalized for {user.full_name.split(' ')[0]}
                                </span>
                              )}
                            </div>

                            {m.sources && m.sources.length > 0 && (
                              <span className="text-[11px] text-zinc-400">
                                {m.sources.length} source{m.sources.length > 1 ? 's' : ''}
                              </span>
                            )}
                          </div>

                          {/* Typo / Grammatical Recorrection Notice */}
                          {m.corrected_query && (
                            <div className="mb-2.5 px-3 py-2 rounded-xl bg-orange-500/10 border border-orange-500/30 flex items-center justify-between gap-2 text-xs">
                              <div className="flex items-center gap-2 min-w-0">
                                <Sparkles className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                                <span className="text-[11px] text-zinc-300 truncate">
                                  Interpreted as: <strong className="text-orange-300 font-semibold italic">"{m.corrected_query}"</strong>
                                </span>
                              </div>
                              <span className="text-[9px] uppercase font-bold text-orange-400 bg-orange-500/20 px-1.5 py-0.5 rounded border border-orange-500/30 shrink-0">
                                Autocorrected
                              </span>
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="flex items-center gap-1.5 mb-1.5 pb-1 border-b border-white/10 text-[11px] text-orange-200 font-medium">
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
                          <span className="truncate max-w-[120px]">{user?.full_name || 'You'}</span>
                          <span className="text-[9px] uppercase px-1.5 py-0.2 rounded bg-white/20 text-white font-bold ml-auto">
                            {userRole}
                          </span>
                        </div>
                      )}

                      {/* Content (Rich Text Markdown) */}
                      {isUser ? (
                        <div className="whitespace-pre-wrap text-xs sm:text-sm">
                          {m.content}
                        </div>
                      ) : (
                        <RichMarkdownText content={m.content} />
                      )}

                      {/* Clickable Source References */}
                      {!isUser && m.sources && m.sources.length > 0 && (
                        <div className="mt-3.5 pt-3 border-t border-white/10">
                          <div className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 mb-2 flex items-center gap-1.5">
                            <span>Referenced Discussions</span>
                          </div>
                          <div className="space-y-2">
                            {m.sources.map((s) => (
                              <Link
                                key={s.id}
                                href={s.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block p-2.5 rounded-xl bg-black/40 hover:bg-white/[0.08] border border-white/10 hover:border-orange-500/50 transition-all group"
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
                                    <span className="text-[11px] text-zinc-400 line-clamp-2 mt-0.5">
                                      {s.excerpt}
                                    </span>
                                    <span className="text-[10px] text-zinc-500 mt-1">
                                      By {s.author_name} • Match: {Math.round(s.relevance_score * 100)}%
                                    </span>
                                  </div>
                                  <ExternalLink className="w-3.5 h-3.5 text-zinc-500 group-hover:text-orange-400 shrink-0 mt-0.5 transition-colors" />
                                </div>
                              </Link>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Interactive Suggested Follow-Up Questions */}
                      {!isUser && m.suggested_followups && m.suggested_followups.length > 0 && (
                        <div className="mt-3.5 pt-2.5 border-t border-white/10">
                          <div className="text-[11px] font-semibold text-zinc-400 mb-2 flex items-center gap-1.5">
                            <HelpCircle className="w-3 h-3 text-orange-400" />
                            Suggested Follow-up Questions:
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {m.suggested_followups.map((q, qIdx) => (
                              <button
                                key={qIdx}
                                onClick={() => handleSendMessage(q)}
                                disabled={isLoading}
                                className="text-left text-[11px] px-2.5 py-1 rounded-lg bg-orange-500/10 hover:bg-orange-500/20 text-orange-300 border border-orange-500/25 hover:border-orange-500/50 transition-all cursor-pointer disabled:opacity-50"
                              >
                                {q}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Suggested Similar Queries */}
                      {!isUser && m.suggested_queries && m.suggested_queries.length > 0 && (
                        <div className="mt-3 pt-2.5 border-t border-white/10">
                          <div className="text-[11px] font-semibold text-zinc-400 mb-2 flex items-center gap-1.5">
                            <Sparkles className="w-3 h-3 text-orange-400" />
                            <span>Suggested Similar Queries:</span>
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {m.suggested_queries.map((sq, sqIdx) => (
                              <button
                                key={sqIdx}
                                onClick={() => handleSendMessage(sq)}
                                disabled={isLoading}
                                className="text-left text-[11px] px-2.5 py-1 rounded-lg bg-white/[0.04] hover:bg-orange-500/20 text-zinc-300 hover:text-orange-200 border border-white/10 hover:border-orange-500/40 transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1.5 group"
                              >
                                <span className="text-orange-400 group-hover:translate-x-0.5 transition-transform">↳</span>
                                <span>{sq}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Timestamp */}
                    <span className="text-[10px] text-zinc-500 px-1 mt-1">
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
                <div className="flex items-start gap-2.5 animate-in fade-in duration-200">
                  <div className="w-7 h-7 rounded-lg bg-orange-500/20 border border-orange-500/30 flex items-center justify-center shrink-0 mt-1">
                    <Sparkles className="w-3.5 h-3.5 text-orange-400 animate-spin" />
                  </div>
                  <div className="bg-white/[0.06] border border-white/10 rounded-2xl rounded-bl-xs px-4 py-3 max-w-[85%]">
                    <div className="flex items-center gap-2 mb-1.5">
                      <div className="w-2 h-2 rounded-full bg-orange-400 animate-ping" />
                      <span className="text-xs font-medium text-orange-300">
                        {loadingStep || 'Thinking...'}
                      </span>
                    </div>
                    <div className="flex gap-1.5 items-center">
                      <span className="w-2 h-2 rounded-full bg-zinc-500 animate-bounce [animation-delay:-0.3s]" />
                      <span className="w-2 h-2 rounded-full bg-zinc-500 animate-bounce [animation-delay:-0.15s]" />
                      <span className="w-2 h-2 rounded-full bg-zinc-500 animate-bounce" />
                    </div>
                  </div>
                </div>
              )}

              {/* Error State */}
              {errorMessage && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-300 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                    <span>{errorMessage}</span>
                  </div>
                  <button
                    onClick={() => handleSendMessage()}
                    className="flex items-center gap-1 px-2.5 py-1 rounded bg-red-500/20 hover:bg-red-500/30 font-medium text-[11px] text-red-200 transition-colors shrink-0 cursor-pointer"
                  >
                    <RefreshCw className="w-3 h-3" />
                    Retry
                  </button>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input Form */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="p-3 border-t border-white/10 bg-white/[0.02]"
            >
              <div className="relative flex items-end gap-2 bg-[#121526] border border-white/15 focus-within:border-orange-500 rounded-xl p-2 transition-all shadow-inner">
                <textarea
                  ref={textareaRef}
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask a community or technical question... (Shift+Enter for new line)"
                  rows={1}
                  className="w-full max-h-32 bg-transparent text-xs sm:text-sm text-zinc-100 placeholder-zinc-500 resize-none outline-none focus:ring-0 leading-relaxed custom-scrollbar"
                  style={{ minHeight: '24px' }}
                />
                <button
                  type="submit"
                  disabled={!inputMessage.trim() || isLoading}
                  aria-label="Send Message"
                  className="p-2 rounded-lg bg-orange-500 hover:bg-orange-600 btn-orange-primary disabled:opacity-40 disabled:hover:bg-orange-500 text-white transition-all shrink-0 cursor-pointer shadow-md shadow-orange-500/25"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>

              <div className="flex items-center justify-between mt-2 px-1 text-[11px] text-zinc-500">
                <span>
                  Press <kbd className="font-mono bg-white/5 px-1 rounded">Enter</kbd> to send
                </span>
                <Link
                  href="/assistant"
                  onClick={() => setIsOpen(false)}
                  className="hover:text-orange-400 transition-colors flex items-center gap-1"
                >
                  <span>Open Full Assistant Workspace</span>
                  <ExternalLink className="w-2.5 h-2.5" />
                </Link>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
