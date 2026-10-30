'use client';

import React, { useState, useEffect } from 'react';
import { EventItem, EventTicketData, EventAnalyticsData } from '../lib/types';
import {
  fetchEvents,
  createEvent,
  updateEvent,
  deleteEvent,
  registerForEvent,
  cancelEventRegistration,
  fetchEventTicket,
  verifyEventCheckIn,
  fetchEventAnalytics,
} from '../lib/api';
import { useAuth } from '../lib/auth-context';
import { useToast } from '../lib/toast-context';
import {
  Calendar,
  Clock,
  MapPin,
  Video,
  Plus,
  Users,
  CheckCircle,
  ExternalLink,
  X,
  QrCode,
  BarChart3,
  Copy,
  Check,
  AlertCircle,
  Sparkles,
  TrendingUp,
  UserCheck,
  UserX,
  ShieldAlert,
  ArrowRight,
  ScanLine,
  Edit3,
  Trash2,
} from 'lucide-react';

interface EventsWidgetProps {
  communityId?: string;
  showCreateButton?: boolean;
}

export default function EventsWidget({ communityId, showCreateButton = true }: EventsWidgetProps) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [registeringId, setRegisteringId] = useState<string | null>(null);

  // Active Modals
  const [activeTicket, setActiveTicket] = useState<EventTicketData | null>(null);
  const [ticketModalEvent, setTicketModalEvent] = useState<EventItem | null>(null);
  const [analyticsEvent, setAnalyticsEvent] = useState<EventItem | null>(null);
  const [analyticsData, setAnalyticsData] = useState<EventAnalyticsData | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [scannerEvent, setScannerEvent] = useState<EventItem | null>(null);

  // Create Event Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [registrationDeadline, setRegistrationDeadline] = useState('');
  const [isOnline, setIsOnline] = useState(true);
  const [meetingUrl, setMeetingUrl] = useState('');
  const [maxAttendees, setMaxAttendees] = useState<number | ''>(50);
  const [submitting, setSubmitting] = useState(false);

  // Edit Event State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<EventItem | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [editStartTime, setEditStartTime] = useState('');
  const [editEndTime, setEditEndTime] = useState('');
  const [editRegistrationDeadline, setEditRegistrationDeadline] = useState('');
  const [editIsOnline, setEditIsOnline] = useState(true);
  const [editMeetingUrl, setEditMeetingUrl] = useState('');
  const [editMaxAttendees, setEditMaxAttendees] = useState<number | ''>(50);
  const [editStatus, setEditStatus] = useState<string>('published');
  const [updating, setUpdating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Track event IDs created in current browser session
  const [createdEventIds, setCreatedEventIds] = useState<Set<string>>(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('user_created_events');
        return stored ? new Set(JSON.parse(stored)) : new Set();
      } catch {
        return new Set();
      }
    }
    return new Set();
  });

  const markEventCreatedByMe = (id: string) => {
    setCreatedEventIds((prev) => {
      const next = new Set(prev).add(id);
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('user_created_events', JSON.stringify(Array.from(next)));
        } catch {}
      }
      return next;
    });
  };

  // Only Event Creator, Community Owner, or Platform Admin can scan and manage events
  const checkIsOrganizer = (ev: EventItem) => {
    if (!user) {
      return createdEventIds.has(ev.id);
    }
    const isUserAdmin = Boolean(
      user.role?.name?.toLowerCase().includes('admin') ||
      (user as any)?.role === 'admin' ||
      (user as any)?.is_admin === true
    );
    const isCreator = Boolean(
      user.id === ev.creator_id ||
      user.id === ev.creator?.id ||
      (ev.creator?.email && user.email && ev.creator.email.toLowerCase() === user.email.toLowerCase()) ||
      user.id === (ev.community as any)?.owner_id ||
      user.id === (ev.community as any)?.owner?.id ||
      createdEventIds.has(ev.id)
    );
    return isUserAdmin || isCreator;
  };

  useEffect(() => {
    loadEvents();
  }, [communityId]);

  const loadEvents = async () => {
    setLoading(true);
    try {
      const res = await fetchEvents(communityId);
      setEvents(res.events);
    } catch {
      showToast('Failed to load events', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!communityId) {
      showToast('Select a community to host an event', 'info');
      return;
    }
    if (!title || !startTime || !endTime) {
      showToast('Please fill all required fields', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const res = await createEvent(communityId, {
        title,
        description,
        location: isOnline ? 'Online' : location,
        start_time: new Date(startTime).toISOString(),
        end_time: new Date(endTime).toISOString(),
        registration_deadline: registrationDeadline ? new Date(registrationDeadline).toISOString() : undefined,
        is_online: isOnline,
        meeting_url: isOnline ? meetingUrl : undefined,
        max_attendees: maxAttendees === '' ? undefined : Number(maxAttendees),
        status: 'published',
      });

      if (res.data) {
        showToast('Event published with Smart Waitlist & QR ticketing enabled!', 'success');
        if (res.data.id) {
          markEventCreatedByMe(res.data.id);
        }
        setIsCreateModalOpen(false);
        resetForm();
        loadEvents();
      } else {
        showToast(res.error || 'Failed to create event', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Error creating event', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRegister = async (event: EventItem) => {
    if (!user) {
      showToast('Please login to RSVP or join waitlist', 'info');
      return;
    }
    setRegisteringId(event.id);
    try {
      const res = await registerForEvent(event.id);
      if (res.data) {
        if (res.data.isWaitlist) {
          showToast(`Event full! You are on the waitlist at position #${res.data.waitlistPosition}.`, 'info');
        } else {
          showToast(res.data.message || 'RSVP confirmed! Ticket generated.', 'success');
          // If ticket returned, open ticket modal immediately
          if (res.data.qrDataUrl && res.data.ticketToken) {
            setActiveTicket({
              registration: res.data.registration,
              qrDataUrl: res.data.qrDataUrl,
              ticketToken: res.data.ticketToken,
              isCheckedIn: false,
            });
            setTicketModalEvent(event);
          }
        }
        loadEvents();
      } else {
        showToast(res.error || 'Failed to register', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to register', 'error');
    } finally {
      setRegisteringId(null);
    }
  };

  const handleOpenTicket = async (event: EventItem) => {
    try {
      const res = await fetchEventTicket(event.id);
      if (res.data) {
        setActiveTicket(res.data);
        setTicketModalEvent(event);
      } else {
        showToast(res.error || 'Could not find ticket for this event', 'info');
      }
    } catch (err: any) {
      showToast(err.message || 'Error loading ticket', 'error');
    }
  };

  const handleOpenScanner = (ev: EventItem) => {
    if (!checkIsOrganizer(ev)) {
      showToast('Access restricted: Only event creators and admins can open the QR ticket scanner', 'error');
      return;
    }
    setScannerEvent(ev);
  };

  const handleOpenAnalytics = async (event: EventItem) => {
    if (!checkIsOrganizer(event)) {
      showToast('Access restricted: Only event creators and admins can view analytics', 'error');
      return;
    }
    setAnalyticsEvent(event);
    setAnalyticsLoading(true);
    try {
      const res = await fetchEventAnalytics(event.id);
      if (res.data) {
        setAnalyticsData(res.data);
      } else {
        showToast(res.error || 'Only event organizers can view analytics', 'error');
        setAnalyticsEvent(null);
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to fetch analytics', 'error');
      setAnalyticsEvent(null);
    } finally {
      setAnalyticsLoading(false);
    }
  };

  const handleCancelRegistration = async (eventId: string, regId: string) => {
    if (!confirm('Are you sure you want to cancel your RSVP? Any waitlisted member will be promoted automatically.')) return;
    try {
      const res = await cancelEventRegistration(eventId, regId);
      if (res.data) {
        showToast(res.data.message || 'Registration cancelled', 'info');
        setActiveTicket(null);
        setTicketModalEvent(null);
        loadEvents();
      } else {
        showToast(res.error || 'Failed to cancel registration', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Error cancelling registration', 'error');
    }
  };

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setLocation('');
    setStartTime('');
    setEndTime('');
    setRegistrationDeadline('');
    setIsOnline(true);
    setMeetingUrl('');
    setMaxAttendees(50);
  };

  const toDateTimeLocalString = (dateInput?: string | Date | null) => {
    if (!dateInput) return '';
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return '';
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  const handleOpenEditModal = (ev: EventItem) => {
    setEditingEvent(ev);
    setEditTitle(ev.title || '');
    setEditDescription(ev.description || '');
    setEditLocation(ev.location || '');
    setEditStartTime(toDateTimeLocalString(ev.start_time));
    setEditEndTime(toDateTimeLocalString(ev.end_time));
    setEditRegistrationDeadline(toDateTimeLocalString(ev.registration_deadline));
    setEditIsOnline(Boolean(ev.is_online));
    setEditMeetingUrl(ev.meeting_url || (ev as any).meeting_link || '');
    setEditMaxAttendees(ev.max_attendees ?? '');
    setEditStatus(ev.status || 'published');
    setIsEditModalOpen(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEvent) return;
    if (!editTitle || !editStartTime || !editEndTime) {
      showToast('Please fill all required fields', 'error');
      return;
    }

    setUpdating(true);
    try {
      const payload: Partial<EventItem> = {
        title: editTitle,
        description: editDescription,
        location: editIsOnline ? undefined : editLocation,
        is_online: editIsOnline,
        meeting_url: editIsOnline ? editMeetingUrl : undefined,
        start_time: new Date(editStartTime).toISOString(),
        end_time: new Date(editEndTime).toISOString(),
        registration_deadline: editRegistrationDeadline ? new Date(editRegistrationDeadline).toISOString() : null,
        max_attendees: editMaxAttendees === '' ? null : Number(editMaxAttendees),
        status: editStatus as any,
      };

      const res = await updateEvent(editingEvent.id, payload);
      if (res.data) {
        showToast('Event updated successfully!', 'success');
        setIsEditModalOpen(false);
        setEditingEvent(null);
        loadEvents();
      } else {
        showToast(res.error || 'Failed to update event', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Error updating event', 'error');
    } finally {
      setUpdating(false);
    }
  };

  const handleDelete = async (ev: EventItem) => {
    const confirmed = window.confirm(`Are you sure you want to delete the event "${ev.title}"? This will cancel all registrations and cannot be undone.`);
    if (!confirmed) return;

    setDeletingId(ev.id);
    try {
      const res = await deleteEvent(ev.id);
      if (res.data || !res.error) {
        showToast('Event deleted successfully', 'info');
        loadEvents();
      } else {
        showToast(res.error || 'Failed to delete event', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Error deleting event', 'error');
    } finally {
      setDeletingId(null);
    }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 glass-panel p-6 rounded-2xl border border-white/10 shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <Calendar className="w-6 h-6 text-orange-400" />
              Smart Community Events
            </h3>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-orange-500/20 text-orange-300 border border-orange-500/30">
              Auto Waitlist & QR Check-in
            </span>
          </div>
          <p className="text-sm text-zinc-400 mt-1">
            Automated capacity enforcement, deterministic queue promotion, and cryptographic ticket verification.
          </p>
        </div>
        {showCreateButton && (
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 btn-orange-primary text-white font-semibold shadow-md shadow-orange-500/25 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Host an Event
          </button>
        )}
      </div>

      {/* Events List */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {[1, 2].map((i) => (
            <div key={i} className="animate-pulse glass-panel p-6 rounded-2xl border border-white/5 h-56" />
          ))}
        </div>
      ) : events.length === 0 ? (
        <div className="text-center py-14 glass-panel rounded-2xl border border-dashed border-white/10 p-8">
          <Calendar className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
          <h4 className="text-base font-semibold text-zinc-300">No active community events yet</h4>
          <p className="text-sm text-zinc-500 max-w-sm mx-auto mt-1">
            Host technical AMAs, design reviews, or hackathons with automated waitlists and attendance verification!
          </p>
          {showCreateButton && (
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="mt-4 px-4 py-2 text-sm bg-orange-500/20 text-orange-300 border border-orange-500/30 font-medium rounded-xl hover:bg-orange-500/30 transition-colors cursor-pointer"
            >
              Host the first event
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {events.map((ev) => {
            const confirmedCount = ev._count?.registrations || 0;
            const maxCap = ev.max_attendees;
            const isFull = maxCap !== null && maxCap !== undefined && confirmedCount >= maxCap;
            const fillPercentage = maxCap ? Math.min(100, Math.round((confirmedCount / maxCap) * 100)) : 0;
            // Strict Authorization: Only Event Creator, Community Owner, or Platform Admin can scan and manage
            const isOrganizer = checkIsOrganizer(ev);

            return (
              <div
                key={ev.id}
                className="glass-panel rounded-2xl p-6 border border-white/[0.08] hover:border-orange-500/30 transition-all flex flex-col justify-between group shadow-lg hover:shadow-orange-500/5"
              >
                <div>
                  {/* Top row badges & Quick Edit/Delete Actions */}
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-semibold ${
                          ev.is_online
                            ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/25'
                            : 'bg-amber-500/15 text-amber-300 border border-amber-500/25'
                        }`}
                      >
                        {ev.is_online ? <Video className="w-3 h-3" /> : <MapPin className="w-3 h-3" />}
                        {ev.is_online ? 'Live Stream' : 'In-Person'}
                      </span>

                      {/* Capacity Badge */}
                      {maxCap ? (
                        <span
                          className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${
                            isFull
                              ? 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                              : fillPercentage >= 80
                              ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                              : 'bg-orange-500/15 text-orange-300 border-orange-500/30'
                          }`}
                        >
                          {isFull ? 'FULL • Waitlist Open' : `${maxCap - confirmedCount} seats left`}
                        </span>
                      ) : (
                        <span className="text-xs font-medium text-zinc-400 bg-white/5 px-2.5 py-0.5 rounded-full border border-white/10">
                          Open Admission
                        </span>
                      )}
                    </div>

                    {/* Quick Edit & Delete Action Buttons (Top-Right) - ONLY for Event Creator or Admin */}
                    {isOrganizer && (
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleOpenEditModal(ev)}
                          title="Edit Event"
                          className="px-2.5 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer shadow-sm hover:scale-105 active:scale-95"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Edit</span>
                        </button>
                        <button
                          onClick={() => handleDelete(ev)}
                          disabled={deletingId === ev.id}
                          title="Delete Event"
                          className="px-2.5 py-1 rounded-lg bg-rose-500/15 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer shadow-sm hover:scale-105 active:scale-95 disabled:opacity-50"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>{deletingId === ev.id ? 'Deleting...' : 'Delete'}</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Title & Description */}
                  <h4 className="font-bold text-zinc-100 text-lg mt-3.5 group-hover:text-orange-400 transition-colors leading-snug">
                    {ev.title}
                  </h4>
                  {ev.description && (
                    <p className="text-sm text-zinc-400 mt-2 line-clamp-2 leading-relaxed">
                      {ev.description}
                    </p>
                  )}

                  {/* Date & Location */}
                  <div className="mt-4 space-y-1.5 text-xs text-zinc-400">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-orange-400 shrink-0" />
                      <span>Starts {formatDate(ev.start_time)}</span>
                    </div>
                    {ev.location && (
                      <div className="flex items-center gap-2 text-zinc-400 truncate">
                        <MapPin className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span className="truncate">{ev.location}</span>
                      </div>
                    )}
                    {ev.is_online && ev.meeting_url && (
                      <div className="flex items-center gap-2 text-orange-400 font-medium truncate">
                        <ExternalLink className="w-4 h-4 shrink-0" />
                        <a href={ev.meeting_url} target="_blank" rel="noopener noreferrer" className="hover:underline truncate">
                          Online Meeting Link
                        </a>
                      </div>
                    )}
                  </div>

                  {/* Capacity Progress Bar */}
                  {maxCap && (
                    <div className="mt-4 pt-3 border-t border-white/[0.06]">
                      <div className="flex justify-between items-center text-xs mb-1.5">
                        <span className="text-zinc-400">Capacity Meter</span>
                        <span className="font-semibold text-zinc-200">
                          {confirmedCount} / {maxCap} RSVPs ({fillPercentage}%)
                        </span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-white/[0.06] overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            isFull
                              ? 'bg-gradient-to-r from-amber-500 to-rose-500'
                              : 'bg-gradient-to-r from-orange-500 to-emerald-400'
                          }`}
                          style={{ width: `${fillPercentage}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Footer Controls */}
                <div className="mt-6 pt-4 border-t border-white/[0.08] flex items-center justify-between gap-2 flex-wrap">
                  <div className="text-xs text-zinc-500">
                    Host: <span className="text-zinc-300 font-medium">{ev.creator?.full_name || 'Community Leader'}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Organizer Tool Buttons */}
                    {isOrganizer && (
                      <>
                        <button
                          onClick={() => handleOpenEditModal(ev)}
                          title="Edit Event"
                          className="p-2 rounded-xl bg-white/[0.04] hover:bg-amber-600/20 text-amber-300 border border-white/10 hover:border-amber-500/30 transition-all cursor-pointer flex items-center gap-1.5 text-xs font-semibold"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Edit</span>
                        </button>
                        <button
                          onClick={() => handleDelete(ev)}
                          disabled={deletingId === ev.id}
                          title="Delete Event"
                          className="p-2 rounded-xl bg-white/[0.04] hover:bg-rose-600/20 text-rose-300 border border-white/10 hover:border-rose-500/30 transition-all cursor-pointer flex items-center gap-1.5 text-xs font-semibold disabled:opacity-50"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>{deletingId === ev.id ? 'Deleting...' : 'Delete'}</span>
                        </button>
                        <button
                          onClick={() => handleOpenScanner(ev)}
                          title="Scan Attendee QR Tickets (Admin & Creator Only)"
                          className="p-2 rounded-xl bg-orange-500/20 hover:bg-orange-500/30 text-orange-300 border border-orange-500/30 hover:border-orange-500/50 transition-all cursor-pointer flex items-center gap-1.5 text-xs font-semibold shadow-sm"
                        >
                          <ScanLine className="w-3.5 h-3.5" />
                          <span>Scan QR</span>
                        </button>
                        <button
                          onClick={() => handleOpenAnalytics(ev)}
                          title="View Attendance Analytics & Forecast"
                          className="p-2 rounded-xl bg-white/[0.04] hover:bg-amber-600/20 text-amber-300 border border-white/10 hover:border-amber-500/30 transition-all cursor-pointer flex items-center gap-1.5 text-xs font-semibold"
                        >
                          <BarChart3 className="w-3.5 h-3.5" />
                          <span>Stats</span>
                        </button>
                      </>
                    )}

                    {/* View My Ticket button */}
                    <button
                      onClick={() => handleOpenTicket(ev)}
                      className="px-3.5 py-1.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-zinc-300 hover:text-white border border-white/10 text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      <QrCode className="w-3.5 h-3.5 text-orange-400" />
                      <span>My Pass</span>
                    </button>

                    {/* RSVP or Waitlist button */}
                    <button
                      onClick={() => handleRegister(ev)}
                      disabled={registeringId === ev.id}
                      className={`px-4 py-2 text-xs font-semibold rounded-xl transition-all shadow-md active:scale-95 flex items-center gap-1.5 cursor-pointer disabled:opacity-50 ${
                        isFull
                          ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-amber-600/30'
                          : 'bg-orange-500 hover:bg-orange-600 btn-orange-primary text-white shadow-orange-500/25'
                      }`}
                    >
                      <CheckCircle className="w-3.5 h-3.5" />
                      <span>{registeringId === ev.id ? 'Processing...' : isFull ? 'Join Waitlist' : 'RSVP Now'}</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ────────────────── MODAL: Host New Event ────────────────── */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in">
          <div className="glass-panel bg-[#0e111d] rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-white/10 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Calendar className="w-5 h-5 text-orange-400" />
                Schedule Smart Community Event
              </h3>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="mt-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
                  Event Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Scaling Distributed RAG Systems on Kubernetes"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-orange-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
                  Description
                </label>
                <textarea
                  rows={3}
                  placeholder="Brief synopsis, agenda, prerequisites, and speaker bios..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-orange-500 transition-colors resize-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
                    Start Time *
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-sm text-zinc-100 focus:outline-none focus:border-orange-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
                    End Time *
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-sm text-zinc-100 focus:outline-none focus:border-orange-500 transition-colors"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
                    Maximum Capacity (Seats)
                  </label>
                  <input
                    type="number"
                    min="1"
                    placeholder="e.g. 50"
                    value={maxAttendees}
                    onChange={(e) => setMaxAttendees(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-sm text-zinc-100 focus:outline-none focus:border-orange-500 transition-colors"
                  />
                  <p className="text-[11px] text-zinc-500 mt-1">Automatic deterministic waitlist queues when full.</p>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
                    Registration Deadline
                  </label>
                  <input
                    type="datetime-local"
                    value={registrationDeadline}
                    onChange={(e) => setRegistrationDeadline(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-sm text-zinc-100 focus:outline-none focus:border-orange-500 transition-colors"
                  />
                  <p className="text-[11px] text-zinc-500 mt-1">Closes automatically at deadline.</p>
                </div>
              </div>

              {/* Online toggle */}
              <div className="pt-2 border-t border-white/10">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isOnline}
                    onChange={(e) => setIsOnline(e.target.checked)}
                    className="rounded border-white/20 text-orange-500 focus:ring-orange-500 accent-orange-500"
                  />
                  <span className="text-xs font-medium text-zinc-300">This is a virtual event (Online / Live Stream)</span>
                </label>
              </div>

              {isOnline ? (
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
                    Meeting / Stream URL
                  </label>
                  <input
                    type="url"
                    placeholder="https://meet.google.com/xyz or Zoom link"
                    value={meetingUrl}
                    onChange={(e) => setMeetingUrl(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-orange-500 transition-colors"
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
                    Physical Venue Location
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Level 4 Auditorium, Tech Park, San Francisco, CA"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-orange-500 transition-colors"
                  />
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2.5 text-sm font-medium text-zinc-400 hover:text-white hover:bg-white/5 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 text-sm font-semibold text-white bg-orange-500 hover:bg-orange-600 btn-orange-primary rounded-xl shadow-md shadow-orange-500/25 transition-all disabled:opacity-50 cursor-pointer"
                >
                  {submitting ? 'Publishing Event...' : 'Schedule Event'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ────────────────── MODAL: Edit Event ────────────────── */}
      {isEditModalOpen && editingEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in">
          <div className="glass-panel bg-[#0e111d] rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-white/10 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-amber-400" />
                Edit Community Event
              </h3>
              <button
                onClick={() => {
                  setIsEditModalOpen(false);
                  setEditingEvent(null);
                }}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdate} className="mt-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
                  Event Title *
                </label>
                <input
                  type="text"
                  required
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-orange-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
                  Description
                </label>
                <textarea
                  rows={3}
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-orange-500 transition-colors resize-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
                    Start Time *
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={editStartTime}
                    onChange={(e) => setEditStartTime(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-sm text-zinc-100 focus:outline-none focus:border-orange-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
                    End Time *
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={editEndTime}
                    onChange={(e) => setEditEndTime(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-sm text-zinc-100 focus:outline-none focus:border-orange-500 transition-colors"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
                    Maximum Capacity (Seats)
                  </label>
                  <input
                    type="number"
                    min="1"
                    placeholder="e.g. 50"
                    value={editMaxAttendees}
                    onChange={(e) => setEditMaxAttendees(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-sm text-zinc-100 focus:outline-none focus:border-orange-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
                    Registration Deadline
                  </label>
                  <input
                    type="datetime-local"
                    value={editRegistrationDeadline}
                    onChange={(e) => setEditRegistrationDeadline(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-sm text-zinc-100 focus:outline-none focus:border-orange-500 transition-colors"
                  />
                </div>
              </div>

              {/* Status Selector */}
              <div>
                <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
                  Event Status
                </label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-sm text-zinc-100 focus:outline-none focus:border-orange-500 transition-colors cursor-pointer"
                >
                  <option value="published" className="bg-zinc-900 text-zinc-100">Published (Open for registrations)</option>
                  <option value="draft" className="bg-zinc-900 text-zinc-100">Draft (Hidden)</option>
                  <option value="cancelled" className="bg-zinc-900 text-zinc-100">Cancelled (Notifies attendees)</option>
                  <option value="completed" className="bg-zinc-900 text-zinc-100">Completed (Archived)</option>
                </select>
              </div>

              {/* Online toggle */}
              <div className="pt-2 border-t border-white/10">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editIsOnline}
                    onChange={(e) => setEditIsOnline(e.target.checked)}
                    className="rounded border-white/20 text-orange-500 focus:ring-orange-500 accent-orange-500"
                  />
                  <span className="text-xs font-medium text-zinc-300">This is a virtual event (Online / Live Stream)</span>
                </label>
              </div>

              {editIsOnline ? (
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
                    Meeting / Stream URL
                  </label>
                  <input
                    type="url"
                    placeholder="https://meet.google.com/xyz or Zoom link"
                    value={editMeetingUrl}
                    onChange={(e) => setEditMeetingUrl(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-orange-500 transition-colors"
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
                    Physical Venue / Location
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Building 4, Hall B, Silicon Oasis"
                    value={editLocation}
                    onChange={(e) => setEditLocation(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-orange-500 transition-colors"
                  />
                </div>
              )}

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditModalOpen(false);
                    setEditingEvent(null);
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updating}
                  className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold shadow-lg shadow-amber-600/30 transition-all cursor-pointer disabled:opacity-50"
                >
                  {updating ? 'Saving Changes...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ────────────────── MODAL: Attendee QR Ticket Pass ────────────────── */}
      {activeTicket && ticketModalEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
          <div className="glass-panel bg-[#0e111d] rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-orange-500/30 relative overflow-hidden">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <span className="text-xs uppercase font-extrabold tracking-widest text-orange-400 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4" />
                Verified Attendance Pass
              </span>
              <button
                onClick={() => {
                  setActiveTicket(null);
                  setTicketModalEvent(null);
                }}
                className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Event Summary */}
            <div className="mt-4 text-center">
              <h3 className="text-xl font-bold text-white tracking-tight">
                {ticketModalEvent.title}
              </h3>
              <p className="text-xs text-zinc-400 mt-1 flex items-center justify-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-orange-400" />
                {formatDate(ticketModalEvent.start_time)}
              </p>
            </div>

            {/* Scannable QR Code */}
            <div className="mt-5 p-5 bg-white rounded-2xl flex flex-col items-center justify-center shadow-inner">
              {activeTicket.qrDataUrl ? (
                <img
                  src={activeTicket.qrDataUrl}
                  alt="Attendance QR Code Ticket"
                  className="w-56 h-56 object-contain"
                />
              ) : (
                <div className="w-56 h-56 flex items-center justify-center text-xs text-zinc-400">
                  Generating QR Pass...
                </div>
              )}
              <div className="mt-2 text-center">
                <span className="text-[10px] text-zinc-500 font-mono tracking-wider uppercase">
                  Present this QR code to the organizer at entrance
                </span>
              </div>
            </div>

            {/* Check-in status banner */}
            <div className="mt-4 p-3 rounded-xl border flex items-center justify-between text-xs">
              <span className="text-zinc-400">Entry Verification:</span>
              {activeTicket.isCheckedIn ? (
                <span className="flex items-center gap-1 font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/30">
                  <CheckCircle className="w-3.5 h-3.5" /> Checked In
                </span>
              ) : (
                <span className="flex items-center gap-1 font-semibold text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/30">
                  <Clock className="w-3.5 h-3.5" /> Ready for Scan
                </span>
              )}
            </div>

            {/* Cryptographic token representation */}
            <div className="mt-3 p-2.5 rounded-xl bg-white/[0.03] border border-white/5 flex items-center justify-between text-[11px] font-mono text-zinc-400">
              <span className="truncate pr-2">{activeTicket.ticketToken.substring(0, 28)}...</span>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(activeTicket.ticketToken);
                  showToast('Ticket token copied to clipboard!', 'success');
                }}
                className="text-orange-400 hover:text-orange-300 transition-colors shrink-0 flex items-center gap-1 cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5" />
                Copy
              </button>
            </div>

            {/* Cancel RSVP option */}
            <div className="mt-5 pt-3 border-t border-white/10 flex justify-between items-center text-xs">
              <button
                onClick={() => handleCancelRegistration(ticketModalEvent.id, activeTicket.registration.id)}
                className="text-rose-400 hover:text-rose-300 font-medium hover:underline transition-colors cursor-pointer"
              >
                Cancel my RSVP (Promote Waitlist)
              </button>
              <button
                onClick={() => {
                  setActiveTicket(null);
                  setTicketModalEvent(null);
                }}
                className="px-4 py-1.5 rounded-lg bg-orange-500 hover:bg-orange-600 btn-orange-primary text-white font-semibold transition-all cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ────────────────── MODAL: Organizer QR Scanner & Check-in (Admin or Event Creator Only) ────────────────── */}
      {scannerEvent && checkIsOrganizer(scannerEvent) && (
        <QrScannerModal
          event={scannerEvent}
          onClose={() => setScannerEvent(null)}
          onSuccess={() => loadEvents()}
        />
      )}

      {/* ────────────────── MODAL: Event Analytics & Predictions ────────────────── */}
      {analyticsEvent && (
        <EventAnalyticsModal
          event={analyticsEvent}
          data={analyticsData}
          loading={analyticsLoading}
          onClose={() => {
            setAnalyticsEvent(null);
            setAnalyticsData(null);
          }}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT: QR Scanner & Check-In Modal for Organizers
// ─────────────────────────────────────────────────────────────────────────────

function QrScannerModal({
  event,
  onClose,
  onSuccess,
}: {
  event: EventItem;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { showToast } = useToast();
  const [tokenInput, setTokenInput] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [lastVerified, setLastVerified] = useState<{
    user: any;
    checkedInAt: string;
    message: string;
  } | null>(null);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tokenInput.trim()) {
      showToast('Please enter or scan a ticket token', 'error');
      return;
    }

    setVerifying(true);
    try {
      const res = await verifyEventCheckIn(event.id, tokenInput.trim());
      if (res.data?.success) {
        showToast(res.data.message || 'Check-in verified successfully!', 'success');
        setLastVerified({
          user: res.data.user,
          checkedInAt: res.data.checkedInAt,
          message: res.data.message,
        });
        setTokenInput('');
        onSuccess();
      } else {
        showToast(res.error || 'Verification failed', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Verification error', 'error');
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
      <div className="glass-panel bg-[#0e111d] rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-white/10">
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <ScanLine className="w-5 h-5 text-orange-400" />
            Organizer Attendance Check-In
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-xs text-zinc-400 mt-3">
          Event: <strong className="text-zinc-200">{event.title}</strong>
        </p>

        <form onSubmit={handleVerify} className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
              Scan / Paste QR Ticket Token
            </label>
            <div className="relative">
              <input
                type="text"
                required
                autoFocus
                placeholder="Paste the ticket token or scan barcode here..."
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value)}
                className="w-full pl-3.5 pr-10 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-sm text-zinc-100 placeholder-zinc-500 font-mono focus:outline-none focus:border-orange-500 transition-colors"
              />
              <QrCode className="w-4 h-4 text-zinc-500 absolute right-3 top-3 pointer-events-none" />
            </div>
            <p className="text-[11px] text-zinc-500 mt-1">
              Backend validates cryptographic HMAC signature and prevents duplicate entry.
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-medium text-zinc-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
            >
              Close
            </button>
            <button
              type="submit"
              disabled={verifying}
              className="px-6 py-2 rounded-xl text-xs font-semibold text-white bg-orange-500 hover:bg-orange-600 btn-orange-primary shadow-md shadow-orange-500/25 transition-all disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
            >
              <CheckCircle className="w-3.5 h-3.5" />
              {verifying ? 'Verifying...' : 'Verify Ticket'}
            </button>
          </div>
        </form>

        {/* Real-time Verification Feedback Result */}
        {lastVerified && (
          <div className="mt-5 p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 animate-in fade-in">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                <CheckCircle className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h4 className="text-sm font-bold text-white leading-tight">
                  {lastVerified.user?.full_name || 'Verified Attendee'}
                </h4>
                <p className="text-xs text-emerald-300 mt-0.5">{lastVerified.message}</p>
                <span className="text-[10px] text-zinc-400">
                  Checked in at {new Date(lastVerified.checkedInAt).toLocaleTimeString()}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT: Event Analytics & Predictive Insights Modal (Features E & F)
// ─────────────────────────────────────────────────────────────────────────────

function EventAnalyticsModal({
  event,
  data,
  loading,
  onClose,
}: {
  event: EventItem;
  data: EventAnalyticsData | null;
  loading: boolean;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
      <div className="glass-panel bg-[#0e111d] rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-white/10 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-orange-400" />
              Live Event Attendance & Insights
            </h3>
            <p className="text-xs text-zinc-400 mt-0.5">{event.title}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {loading || !data ? (
          <div className="py-16 text-center text-sm text-zinc-400 animate-pulse">
            Aggregating live attendee records and computing statistical forecast...
          </div>
        ) : (
          <div className="mt-6 space-y-6">
            {/* Core Metrics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10">
                <span className="text-xs text-zinc-400 block">Confirmed RSVPs</span>
                <span className="text-2xl font-bold text-white mt-1 block">
                  {data.metrics.confirmed_registrations}
                </span>
                <span className="text-[10px] text-zinc-500">
                  of {data.metrics.total_capacity || '∞'} capacity
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10">
                <span className="text-xs text-zinc-400 block">Waitlist Queue</span>
                <span className="text-2xl font-bold text-amber-300 mt-1 block">
                  {data.metrics.waitlist_size}
                </span>
                <span className="text-[10px] text-zinc-500">Auto-promote ready</span>
              </div>

              <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10">
                <span className="text-xs text-zinc-400 block">Checked In</span>
                <span className="text-2xl font-bold text-emerald-400 mt-1 block">
                  {data.metrics.checked_in_count}
                </span>
                <span className="text-[10px] text-zinc-500">
                  {data.metrics.attendance_rate}% Show Rate
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10">
                <span className="text-xs text-zinc-400 block">No-Show Count</span>
                <span className="text-2xl font-bold text-rose-400 mt-1 block">
                  {data.metrics.no_show_count}
                </span>
                <span className="text-[10px] text-zinc-500">
                  {data.metrics.no_show_rate}% of RSVPs
                </span>
              </div>
            </div>

            {/* Attendance Rate Progress */}
            <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="font-semibold text-zinc-300">Live Attendance Rate</span>
                <span className="font-bold text-emerald-400">{data.metrics.attendance_rate}%</span>
              </div>
              <div className="w-full h-2.5 rounded-full bg-white/[0.06] overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-500"
                  style={{ width: `${Math.min(100, data.metrics.attendance_rate)}%` }}
                />
              </div>
              <p className="text-[11px] text-zinc-500">
                Formula: Actual checked-in attendees / confirmed registered attendees × 100
              </p>
            </div>

            {/* Feature F: Predictive Insights Card */}
            <div className="p-6 rounded-3xl bg-gradient-to-br from-orange-950/40 via-amber-950/30 to-stone-900 border border-orange-500/30 shadow-xl relative overflow-hidden space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-orange-400" />
                  <h4 className="text-sm font-bold text-white">
                    Intelligent Attendance Forecast
                  </h4>
                </div>
                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-orange-500/20 text-orange-300 border border-orange-500/30">
                  {data.predictive_insights.confidence_level} Confidence
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                <div className="p-4 rounded-xl bg-black/30 border border-white/5">
                  <span className="text-xs text-zinc-400">Predicted Actual Attendance</span>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-2xl font-extrabold text-orange-300">
                      ~{data.predictive_insights.predicted_attendance}
                    </span>
                    <span className="text-xs text-zinc-400">attendees</span>
                  </div>
                  <span className="text-[10px] text-zinc-500 block mt-1">
                    Based on {data.predictive_insights.historical_community_show_rate}% community historical show rate
                  </span>
                </div>

                <div className="p-4 rounded-xl bg-black/30 border border-white/5">
                  <span className="text-xs text-zinc-400">Expected No-Shows</span>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-2xl font-extrabold text-zinc-300">
                      ~{data.predictive_insights.expected_no_shows}
                    </span>
                    <span className="text-xs text-zinc-400">seats</span>
                  </div>
                  <span className="text-[10px] text-zinc-500 block mt-1">
                    Allows organizers to safely overbook or prepare buffer seats
                  </span>
                </div>
              </div>

              <p className="text-[11px] text-zinc-400 italic">
                ℹ️ {data.predictive_insights.model_description}. Estimates are probabilistic predictions and adjust dynamically as more members RSVP.
              </p>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={onClose}
                className="px-5 py-2 rounded-xl text-xs font-semibold text-white bg-white/10 hover:bg-white/15 transition-colors cursor-pointer"
              >
                Close Analytics
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
