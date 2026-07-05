"use client";

import { useState, useMemo, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import {
  Bell,
  MessageSquare,
  Megaphone,
  Send,
  Users,
  Search,
  Filter,
  Plus,
  Clock,
  CheckCircle,
  AlertCircle,
  Mail,
  Phone,
  Calendar,
  Pin,
  Eye,
  Trash2,
  X,
  Paperclip,
  CornerUpLeft,
  SendHorizontal,
} from "lucide-react";
import { formatDate } from "@/lib/date-format";
import { useSchool } from "@/lib/school-context";
import {
  canManageAnnouncement,
  canPublishAnyAnnouncement,
  canPublishClassAnnouncements,
  canPublishSchoolAnnouncements,
  createSchoolAnnouncement,
  deleteSchoolAnnouncement,
  getAnnouncementScopeLabel,
  getAnnouncementsPageDescription,
  getTeacherAnnouncementClasses,
  getVisibleAnnouncements,
  SCHOOL_WIDE_AUDIENCE_OPTIONS,
  CLASS_AUDIENCE_OPTIONS,
  toggleSchoolAnnouncementPin,
  type AnnouncementAudience,
  type AnnouncementPriority,
  type SchoolAnnouncement,
} from "@/lib/school-announcements";
import { getUserSession, type UserSession } from "@/lib/teacher-check-in";
import {
  deleteSchoolMessage,
  deleteSchoolMessages,
  getComposeRecipientOptions,
  getInboxMessages,
  getSentMessages,
  loadSchoolMessages,
  markSchoolMessageRead,
  sendSchoolMessage,
  sendSchoolReply,
  type SchoolMessage,
} from "@/lib/school-messages";

function isReplyMessage(message: SchoolMessage): boolean {
  return Boolean(message.replyToId) || message.subject.trim().toLowerCase().startsWith("re:");
}

type Message = SchoolMessage;

const priorityConfig: Record<AnnouncementPriority, { color: string; label: string; icon: any }> = {
  urgent: { color: "bg-red-100 text-red-700 border-red-200", label: "Urgent", icon: AlertCircle },
  high: { color: "bg-orange-100 text-orange-700 border-orange-200", label: "High Priority", icon: AlertCircle },
  normal: { color: "bg-blue-100 text-blue-700 border-blue-200", label: "Normal", icon: Bell },
  low: { color: "bg-slate-100 text-slate-700 border-slate-200", label: "Low Priority", icon: Bell },
};

export default function CommunicationPage() {
  const { currentSchool } = useSchool();
  const searchParams = useSearchParams();
  const tabFromUrl = searchParams.get("tab");
  const isSectionView =
    tabFromUrl === "announcements" ||
    tabFromUrl === "messages" ||
    tabFromUrl === "compose";

  const sectionTitles = {
    announcements: "Announcements",
    messages: "Messages",
    compose: "Compose",
  } as const;

  const sectionDescriptions = {
    announcements: "Publish and manage school-wide announcements",
    messages: "Read received messages and review messages you have sent",
    compose: "Send a new direct message",
  } as const;

  const [selectedTab, setSelectedTab] = useState<"announcements" | "messages" | "compose">("announcements");
  const [messageFolder, setMessageFolder] = useState<"inbox" | "sent">("inbox");
  const [selectedMessageIds, setSelectedMessageIds] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [showComposeAnnouncement, setShowComposeAnnouncement] = useState(false);
  const [showComposeMessage, setShowComposeMessage] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<SchoolAnnouncement | null>(null);
  
  // State management
  const [announcements, setAnnouncements] = useState<SchoolAnnouncement[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [sentMessages, setSentMessages] = useState<Message[]>([]);
  const [session, setSession] = useState<UserSession | null>(null);
  const [replyText, setReplyText] = useState("");
  
  // Compose form states
  const [composeRecipient, setComposeRecipient] = useState("");
  const [composeSubject, setComposeSubject] = useState("");
  const [composeMessage, setComposeMessage] = useState("");
  const [announcementTitle, setAnnouncementTitle] = useState("");
  const [announcementContent, setAnnouncementContent] = useState("");
  const [announcementPriority, setAnnouncementPriority] = useState<AnnouncementPriority>("normal");
  const [announcementAudience, setAnnouncementAudience] = useState<AnnouncementAudience[]>([]);
  const [announcementClassId, setAnnouncementClassId] = useState("");
  const [filterPriority, setFilterPriority] = useState<string>("all");
  const [showFilterMenu, setShowFilterMenu] = useState(false);

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab === "announcements" || tab === "messages" || tab === "compose") {
      setSelectedTab(tab);
    }
  }, [searchParams]);

  useEffect(() => {
    setSession(getUserSession());
  }, []);

  const refreshMessages = () => {
    if (!currentSchool || !session) return;
    setMessages(getInboxMessages(currentSchool.id, session.email));
    setSentMessages(getSentMessages(currentSchool.id, session.email));
  };

  useEffect(() => {
    if (!currentSchool || !session) return;
    refreshMessages();
  }, [currentSchool, session]);

  const refreshAnnouncements = () => {
    if (!currentSchool || !session) return;
    setAnnouncements(getVisibleAnnouncements(currentSchool.id, session));
  };

  useEffect(() => {
    if (!currentSchool || !session) return;
    refreshAnnouncements();
  }, [currentSchool, session]);

  useEffect(() => {
    if (!selectedMessage) {
      setReplyText("");
    }
  }, [selectedMessage]);

  const isAdminPublisher = canPublishSchoolAnnouncements(session);
  const isTeacherPublisher = canPublishClassAnnouncements(currentSchool?.id ?? "", session);
  const canPublishAnnouncements = canPublishAnyAnnouncement(currentSchool?.id ?? "", session);

  const teacherClassOptions = useMemo(
    () =>
      currentSchool && session
        ? getTeacherAnnouncementClasses(currentSchool.id, session.name)
        : [],
    [currentSchool, session],
  );

  const composeAudienceOptions = isAdminPublisher
    ? SCHOOL_WIDE_AUDIENCE_OPTIONS
    : CLASS_AUDIENCE_OPTIONS;

  const openComposeAnnouncement = () => {
    setAnnouncementTitle("");
    setAnnouncementContent("");
    setAnnouncementPriority("normal");
    setAnnouncementAudience([]);
    setAnnouncementClassId(teacherClassOptions[0]?.id ?? "");
    setShowComposeAnnouncement(true);
  };

  const filteredAnnouncements = useMemo(() => 
    announcements.filter(
      (announcement) => {
        const matchesSearch = announcement.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          announcement.content.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesPriority = filterPriority === "all" || announcement.priority === filterPriority;
        return matchesSearch && matchesPriority;
      }
    ),
    [announcements, searchTerm, filterPriority]
  );

  const activeMessages = messageFolder === "inbox" ? messages : sentMessages;

  const filteredMessages = useMemo(() =>
    activeMessages.filter(
      (message) => {
        const search = searchTerm.toLowerCase();
        const contactName =
          messageFolder === "inbox" ? message.senderName : message.recipientName;
        return (
          contactName.toLowerCase().includes(search) ||
          message.subject.toLowerCase().includes(search) ||
          message.body.toLowerCase().includes(search) ||
          message.preview.toLowerCase().includes(search)
        );
      },
    ),
    [activeMessages, searchTerm, messageFolder]
  );

  const unreadCount = useMemo(() => messages.filter((m) => !m.isRead).length, [messages]);
  const sentCount = sentMessages.length;

  useEffect(() => {
    setSelectedMessageIds([]);
  }, [messageFolder, searchTerm]);

  const filteredMessageIds = useMemo(
    () => filteredMessages.map((message) => message.id),
    [filteredMessages],
  );

  const allFilteredSelected =
    filteredMessageIds.length > 0 &&
    filteredMessageIds.every((id) => selectedMessageIds.includes(id));

  const toggleMessageSelection = (messageId: string) => {
    setSelectedMessageIds((current) =>
      current.includes(messageId)
        ? current.filter((id) => id !== messageId)
        : [...current, messageId],
    );
  };

  const toggleSelectAllFiltered = () => {
    if (allFilteredSelected) {
      setSelectedMessageIds((current) =>
        current.filter((id) => !filteredMessageIds.includes(id)),
      );
      return;
    }

    setSelectedMessageIds((current) => [
      ...new Set([...current, ...filteredMessageIds]),
    ]);
  };

  const deleteSelectedMessages = () => {
    if (!currentSchool || selectedMessageIds.length === 0) return;

    const count = selectedMessageIds.length;
    const label = count === 1 ? "this message" : `${count} messages`;
    if (!confirm(`Delete ${label}? This action cannot be undone.`)) return;

    deleteSchoolMessages(currentSchool.id, selectedMessageIds);
    setSelectedMessageIds([]);
    setSelectedMessage(null);
    refreshMessages();
  };

  const originalReplyMessage = useMemo(() => {
    if (!currentSchool || !selectedMessage?.replyToId) return null;
    return (
      loadSchoolMessages(currentSchool.id).find(
        (message) => message.id === selectedMessage.replyToId,
      ) ?? null
    );
  }, [currentSchool, selectedMessage]);

  const composeRecipientOptions = useMemo(() => {
    if (!currentSchool || !session) {
      return [{ value: "", label: "Select recipient..." }];
    }
    return getComposeRecipientOptions(currentSchool.id, session);
  }, [currentSchool, session]);

  const markAsRead = (messageId: string) => {
    if (!currentSchool || messageFolder !== "inbox") return;
    markSchoolMessageRead(currentSchool.id, messageId);
    refreshMessages();
  };

  const deleteMessage = (messageId: string) => {
    if (!currentSchool || !session) return;
    deleteSchoolMessage(currentSchool.id, messageId);
    refreshMessages();
    setSelectedMessage(null);
  };

  const togglePin = (announcementId: string) => {
    if (!currentSchool || !session) return;
    if (!toggleSchoolAnnouncementPin(currentSchool.id, session, announcementId)) return;
    refreshAnnouncements();
    setSelectedAnnouncement((current) =>
      current?.id === announcementId ? { ...current, isPinned: !current.isPinned } : current,
    );
  };

  const deleteAnnouncement = (announcementId: string) => {
    if (!currentSchool || !session) return;
    if (!deleteSchoolAnnouncement(currentSchool.id, session, announcementId)) return;
    refreshAnnouncements();
    setSelectedAnnouncement(null);
  };

  const handleSendMessage = () => {
    if (!currentSchool || !session) {
      alert("Please sign in again to send messages.");
      return;
    }

    if (!composeRecipient || !composeSubject || !composeMessage) {
      alert("Please fill in all fields");
      return;
    }

    const result = sendSchoolMessage({
      schoolId: currentSchool.id,
      sender: {
        id: session.id,
        name: session.name,
        email: session.email,
        role: session.role,
      },
      recipientValue: composeRecipient,
      subject: composeSubject,
      body: composeMessage,
    });

    if (result.sentCount === 0) {
      alert(result.errorReason ?? "Could not send the message. Please choose a valid recipient.");
      return;
    }

    setComposeRecipient("");
    setComposeSubject("");
    setComposeMessage("");
    setShowComposeMessage(false);
    refreshMessages();
    setMessageFolder("sent");
    setSelectedTab("messages");
    alert(`Message sent to ${result.recipientLabel}.`);
  };

  const handleSaveDraft = () => {
    if (!composeSubject && !composeMessage) {
      alert("Nothing to save");
      return;
    }
    alert("Draft saved successfully!");
  };

  const handleSendReply = () => {
    if (!currentSchool || !session || !selectedMessage) return;

    if (!replyText.trim()) {
      alert("Please enter your reply message.");
      return;
    }

    sendSchoolReply({
      schoolId: currentSchool.id,
      originalMessage: selectedMessage,
      sender: {
        id: session.id,
        name: session.name,
        email: session.email,
        role: session.role,
      },
      body: replyText.trim(),
    });

    alert(`Reply sent to ${selectedMessage.senderName}.`);
    setReplyText("");
    setSelectedMessage(null);
    setMessageFolder("sent");
    refreshMessages();
  };

  const handleCreateAnnouncement = () => {
    if (!currentSchool || !session) return;

    const result = createSchoolAnnouncement({
      schoolId: currentSchool.id,
      session,
      title: announcementTitle,
      content: announcementContent,
      priority: announcementPriority,
      scope: isAdminPublisher ? "school" : "class",
      classId: isAdminPublisher ? undefined : announcementClassId,
      targetAudience: announcementAudience,
    });

    if (!result.success) {
      alert(result.error);
      return;
    }

    setAnnouncementTitle("");
    setAnnouncementContent("");
    setAnnouncementPriority("normal");
    setAnnouncementAudience([]);
    setAnnouncementClassId(teacherClassOptions[0]?.id ?? "");
    setShowComposeAnnouncement(false);
    refreshAnnouncements();
    alert(
      isAdminPublisher
        ? "School-wide announcement published successfully!"
        : "Class announcement published successfully!",
    );
  };

  const toggleAudience = (audience: AnnouncementAudience) => {
    setAnnouncementAudience((prev) =>
      prev.includes(audience) ? prev.filter((item) => item !== audience) : [...prev, audience],
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 -m-6 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
                  <MessageSquare className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-50">
                  {isSectionView ? sectionTitles[selectedTab] : "Communication Center"}
                </h1>
              </div>
              <p className="text-slate-600 dark:text-slate-400 ml-14">
                {isSectionView
                  ? selectedTab === "announcements"
                    ? getAnnouncementsPageDescription(session)
                    : sectionDescriptions[selectedTab]
                  : "Manage announcements, messages, and notifications for all school stakeholders"}
              </p>
            </div>
            {!isSectionView && (
            <div className="flex gap-3">
              <button
                onClick={() => setShowComposeMessage(true)}
                className="flex items-center gap-2 px-5 py-2.5 border-2 border-slate-300 dark:border-slate-600 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 hover:border-slate-400 dark:hover:border-slate-500 transition-all font-medium text-slate-700 dark:text-slate-200"
              >
                <Mail className="w-4 h-4" />
                New Message
              </button>
              {canPublishAnnouncements && (
                <button
                  onClick={openComposeAnnouncement}
                  className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-5 py-2.5 rounded-xl transition-all font-medium shadow-lg shadow-blue-500/30"
                >
                  <Megaphone className="w-4 h-4" />
                  {isTeacherPublisher && !isAdminPublisher ? "New Class Announcement" : "New Announcement"}
                </button>
              )}
            </div>
            )}
            {isSectionView && selectedTab === "announcements" && canPublishAnnouncements && (
              <button
                type="button"
                onClick={openComposeAnnouncement}
                className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-5 py-2.5 rounded-xl transition-all font-medium shadow-lg shadow-blue-500/30"
              >
                <Megaphone className="w-4 h-4" />
                {isTeacherPublisher && !isAdminPublisher ? "New Class Announcement" : "New Announcement"}
              </button>
            )}
            {isSectionView && selectedTab === "messages" && (
              <button
                type="button"
                onClick={() => setSelectedTab("compose")}
                className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-5 py-2.5 rounded-xl transition-all font-medium shadow-lg shadow-blue-500/30"
              >
                <Send className="w-4 h-4" />
                Compose
              </button>
            )}
          </div>
        </div>

      {/* Quick Stats */}
      {!isSectionView && (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 hover:shadow-lg transition-all duration-300 group">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">Active Announcements</span>
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-xl group-hover:scale-110 transition-transform">
              <Megaphone className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
          <p className="text-4xl font-bold text-slate-900 dark:text-slate-50 mb-1">{announcements.length}</p>
          <p className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-1">
            <Pin className="w-3 h-3" />
            {announcements.filter((a) => a.isPinned).length} pinned items
          </p>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 hover:shadow-lg transition-all duration-300 group">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">Unread Messages</span>
            <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-xl group-hover:scale-110 transition-transform">
              <Mail className="w-5 h-5 text-orange-600 dark:text-orange-400" />
            </div>
          </div>
          <p className="text-4xl font-bold text-slate-900 dark:text-slate-50 mb-1">{unreadCount}</p>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {messages.length} received · {sentCount} sent
          </p>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 hover:shadow-lg transition-all duration-300 group">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">Total Views</span>
            <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl group-hover:scale-110 transition-transform">
              <Eye className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
          </div>
          <p className="text-4xl font-bold text-slate-900 dark:text-slate-50 mb-1">
            {announcements.reduce((sum, a) => sum + a.views, 0)}
          </p>
          <p className="text-sm text-slate-500 dark:text-slate-400">Announcement views</p>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 hover:shadow-lg transition-all duration-300 group">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">Urgent Items</span>
            <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-xl group-hover:scale-110 transition-transform">
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
            </div>
          </div>
          <p className="text-4xl font-bold text-slate-900 dark:text-slate-50 mb-1">
            {announcements.filter((a) => a.priority === "urgent" || a.priority === "high").length}
          </p>
          <p className="text-sm text-slate-500 dark:text-slate-400">Require attention</p>
        </div>
      </div>
      )}

      {/* Tabs */}
      {!isSectionView && (
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
        <div className="flex gap-1 p-2 border-b border-slate-200 dark:border-slate-700">
          {(["announcements", "messages", "compose"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setSelectedTab(tab)}
              className={`flex-1 px-6 py-3 font-semibold rounded-xl transition-all capitalize relative ${
                selectedTab === tab
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-500/30"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
              }`}
            >
              <span className="flex items-center justify-center gap-2">
                {tab === "announcements" && <Megaphone className="w-4 h-4" />}
                {tab === "messages" && <MessageSquare className="w-4 h-4" />}
                {tab === "compose" && <Send className="w-4 h-4" />}
                {tab}
              </span>
              {tab === "messages" && unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 px-2 py-0.5 bg-red-600 text-white text-xs font-bold rounded-full min-w-[20px] text-center">
                  {unreadCount}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>
      )}

      {/* Search Bar */}
      {selectedTab !== "compose" && (
        <div className="flex gap-4 relative px-2">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder={
                selectedTab === "messages"
                  ? `Search ${messageFolder === "inbox" ? "received" : "sent"} messages...`
                  : `Search ${selectedTab}...`
              }
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 border-2 border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-50 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
            />
          </div>
          <button 
            onClick={() => setShowFilterMenu(!showFilterMenu)}
            className={`flex items-center gap-2 px-5 py-3 border-2 rounded-xl font-medium transition-all ${
              showFilterMenu || filterPriority !== "all"
                ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-600"
                : "border-slate-200 dark:border-slate-600 hover:border-slate-300 dark:hover:border-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700"
            }`}
          >
            <Filter className="w-4 h-4" />
            Filter
            {filterPriority !== "all" && (
              <span className="px-2 py-0.5 bg-blue-600 text-white text-xs rounded-full">1</span>
            )}
          </button>
          {selectedTab === "announcements" && showFilterMenu && (
            <div className="absolute right-0 top-14 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-600 rounded-xl shadow-2xl p-3 z-10 min-w-[220px]">
              <div className="space-y-1">
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide px-3 py-2">Filter by Priority</p>
                <button
                  onClick={() => { setFilterPriority("all"); setShowFilterMenu(false); }}
                  className={`w-full text-left px-3 py-2.5 rounded-lg font-medium transition-all ${filterPriority === "all" ? "bg-blue-600 text-white shadow-lg" : "hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300"}`}
                >
                  All Priorities
                </button>
                <button
                  onClick={() => { setFilterPriority("urgent"); setShowFilterMenu(false); }}
                  className={`w-full text-left px-3 py-2.5 rounded-lg font-medium transition-all flex items-center gap-2 ${filterPriority === "urgent" ? "bg-blue-600 text-white shadow-lg" : "hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300"}`}
                >
                  <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                  Urgent
                </button>
                <button
                  onClick={() => { setFilterPriority("high"); setShowFilterMenu(false); }}
                  className={`w-full text-left px-3 py-2.5 rounded-lg font-medium transition-all flex items-center gap-2 ${filterPriority === "high" ? "bg-blue-600 text-white shadow-lg" : "hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300"}`}
                >
                  <span className="w-2 h-2 bg-orange-500 rounded-full"></span>
                  High Priority
                </button>
                <button
                  onClick={() => { setFilterPriority("normal"); setShowFilterMenu(false); }}
                  className={`w-full text-left px-3 py-2.5 rounded-lg font-medium transition-all flex items-center gap-2 ${filterPriority === "normal" ? "bg-blue-600 text-white shadow-lg" : "hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300"}`}
                >
                  <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                  Normal
                </button>
                <button
                  onClick={() => { setFilterPriority("low"); setShowFilterMenu(false); }}
                  className={`w-full text-left px-3 py-2.5 rounded-lg font-medium transition-all flex items-center gap-2 ${filterPriority === "low" ? "bg-blue-600 text-white shadow-lg" : "hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300"}`}
                >
                  <span className="w-2 h-2 bg-slate-500 rounded-full"></span>
                  Low Priority
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Announcements Tab */}
      {selectedTab === "announcements" && (
        <div className="space-y-4 p-2">
          {filteredAnnouncements.length === 0 ? (
            <div className="bg-white dark:bg-slate-800 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-600 p-12 text-center">
              <Megaphone className="w-16 h-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-50 mb-2">No announcements found</h3>
              <p className="text-slate-600 dark:text-slate-400">
                {searchTerm || filterPriority !== "all"
                  ? "Try adjusting your search or filter criteria"
                  : "School-wide announcements will appear here."}
              </p>
              {canPublishAnnouncements && !searchTerm && filterPriority === "all" && (
                <button
                  type="button"
                  onClick={openComposeAnnouncement}
                  className="mt-4 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                >
                  <Megaphone className="h-4 w-4" />
                  {isTeacherPublisher && !isAdminPublisher ? "Create Class Announcement" : "Create Announcement"}
                </button>
              )}
            </div>
          ) : (
            filteredAnnouncements.map((announcement) => {
              const config = priorityConfig[announcement.priority];
              const PriorityIcon = config.icon;
              const canManage = session ? canManageAnnouncement(session, announcement) : false;

              return (
                <div
                  key={announcement.id}
                  className={`bg-white dark:bg-slate-800 rounded-2xl border-2 border-slate-200 dark:border-slate-700 p-6 hover:shadow-xl transition-all duration-300 ${
                    announcement.isPinned ? "ring-2 ring-blue-500 border-blue-300 dark:border-blue-600" : ""
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        {announcement.isPinned && (
                          <div className="p-1.5 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                            <Pin className="w-4 h-4 text-blue-600 dark:text-blue-400 fill-blue-600 dark:fill-blue-400" />
                          </div>
                        )}
                        <h3 className="text-xl font-bold text-slate-900 dark:text-slate-50">
                          {announcement.title}
                        </h3>
                      </div>
                      <p className="text-slate-600 dark:text-slate-400 mb-4 leading-relaxed">{announcement.content}</p>
                      <div className="flex flex-wrap items-center gap-4 text-sm">
                        <span className="inline-flex items-center rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-700 dark:text-slate-200">
                          {getAnnouncementScopeLabel(announcement)}
                        </span>
                        <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400 font-medium">
                          <div className="p-1.5 bg-slate-100 dark:bg-slate-700 rounded-lg">
                            <Users className="w-4 h-4" />
                          </div>
                          <span>{announcement.authorName}</span>
                        </div>
                        <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                          <Calendar className="w-4 h-4" />
                          <span>{formatDate(announcement.publishedAt)}</span>
                        </div>
                        <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                          <Eye className="w-4 h-4" />
                          <span>{announcement.views} views</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-3">
                      <span className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold border-2 ${config.color} shadow-sm`}>
                        <PriorityIcon className="w-3.5 h-3.5" />
                        {config.label}
                      </span>
                      <div className="flex flex-wrap gap-2 justify-end">
                        {announcement.targetAudience.map((audience) => (
                          <span
                            key={audience}
                            className="px-3 py-1 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-lg"
                          >
                            {audience}
                          </span>
                        ))}
                      </div>
                      <div className="flex gap-2 mt-2">
                        {canManage && (
                          <button
                            onClick={() => togglePin(announcement.id)}
                            className="p-2 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-all"
                            title={announcement.isPinned ? "Unpin" : "Pin"}
                          >
                            <Pin className={`w-4 h-4 ${announcement.isPinned ? 'text-blue-600 fill-blue-600' : 'text-slate-400'}`} />
                          </button>
                        )}
                        <button
                          onClick={() => setSelectedAnnouncement(announcement)}
                          className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-all"
                          title="View details"
                        >
                          <Eye className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                        </button>
                        {canManage && (
                          <button
                            onClick={() => {
                              if (confirm("Are you sure you want to delete this announcement?")) {
                                deleteAnnouncement(announcement.id);
                              }
                            }}
                            className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4 text-red-600 dark:text-red-400" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Messages Tab */}
      {selectedTab === "messages" && (
        <div className="space-y-4 p-2">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm dark:border-slate-700 dark:bg-slate-800">
            <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => setMessageFolder("inbox")}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all ${
                messageFolder === "inbox"
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-500/30"
                  : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700"
              }`}
            >
              <Mail className="h-4 w-4" />
              Received
              {unreadCount > 0 && (
                <span className="rounded-full bg-red-500 px-2 py-0.5 text-[11px] font-bold text-white">
                  {unreadCount}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => setMessageFolder("sent")}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all ${
                messageFolder === "sent"
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-500/30"
                  : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700"
              }`}
            >
              <SendHorizontal className="h-4 w-4" />
              Sent
              <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[11px] font-bold text-slate-700 dark:bg-slate-700 dark:text-slate-200">
                {sentCount}
              </span>
            </button>
            </div>

            {filteredMessages.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 px-1">
                <button
                  type="button"
                  onClick={toggleSelectAllFiltered}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700"
                >
                  {allFilteredSelected ? "Deselect All" : "Select All"}
                </button>
                <button
                  type="button"
                  onClick={deleteSelectedMessages}
                  disabled={selectedMessageIds.length === 0}
                  className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300 dark:hover:bg-red-950/50"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete
                  {selectedMessageIds.length > 0 ? ` (${selectedMessageIds.length})` : ""}
                </button>
              </div>
            )}
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
          {filteredMessages.length === 0 ? (
            <div className="p-12 text-center">
              <Mail className="mx-auto mb-4 h-16 w-16 text-slate-300 dark:text-slate-600" />
              <h3 className="mb-2 text-lg font-semibold text-slate-900 dark:text-slate-50">
                {messageFolder === "inbox" ? "No received messages" : "No sent messages"}
              </h3>
              <p className="text-slate-600 dark:text-slate-400">
                {messageFolder === "inbox"
                  ? "Messages sent to you will appear here."
                  : "Messages you compose and send will appear here."}
              </p>
              {messageFolder === "sent" && (
                <button
                  type="button"
                  onClick={() => setSelectedTab("compose")}
                  className="mt-4 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                >
                  <Send className="h-4 w-4" />
                  Compose Message
                </button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-slate-200 dark:divide-slate-700">
              {filteredMessages.map((message) => {
                const isReply = isReplyMessage(message);
                const isSentFolder = messageFolder === "sent";
                const contactLabel = isSentFolder ? message.recipientName : message.senderName;

                const isSelected = selectedMessageIds.includes(message.id);

                return (
                <div
                  key={message.id}
                  onClick={() => {
                    setSelectedMessage(message);
                    if (!isSentFolder) {
                      markAsRead(message.id);
                    }
                  }}
                  className={`cursor-pointer rounded-xl border-l-4 p-5 transition-all ${
                    isSelected ? "ring-2 ring-blue-300 dark:ring-blue-700" : ""
                  } ${
                    isSentFolder
                      ? "border-l-sky-500 hover:bg-sky-50/60 dark:hover:bg-sky-950/20 bg-white dark:bg-slate-800"
                      : isReply
                        ? `border-l-emerald-500 hover:bg-emerald-50/60 dark:hover:bg-emerald-950/20 ${
                            !message.isRead ? "bg-emerald-50/80 dark:bg-emerald-950/30" : "bg-white dark:bg-slate-800"
                          }`
                        : `border-l-indigo-500 hover:bg-indigo-50/60 dark:hover:bg-indigo-950/20 ${
                            !message.isRead ? "bg-indigo-50/80 dark:bg-indigo-950/30" : "bg-white dark:bg-slate-800"
                          }`
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex flex-1 items-start gap-3">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onClick={(event) => event.stopPropagation()}
                        onChange={() => toggleMessageSelection(message.id)}
                        className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        aria-label={`Select message ${message.subject}`}
                      />
                    <div className="flex-1">
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        {!isSentFolder && !message.isRead && (
                          <div className={`h-2.5 w-2.5 animate-pulse rounded-full ${isReply ? "bg-emerald-500" : "bg-indigo-500"}`} />
                        )}
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide ${
                            isSentFolder
                              ? "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300"
                              : isReply
                                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                                : "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300"
                          }`}
                        >
                          {isSentFolder ? (
                            <>
                              <SendHorizontal className="h-3 w-3" />
                              Sent
                            </>
                          ) : isReply ? (
                            <>
                              <CornerUpLeft className="h-3 w-3" />
                              Reply
                            </>
                          ) : (
                            <>
                              <Mail className="h-3 w-3" />
                              Received
                            </>
                          )}
                        </span>
                        <h4 className={`text-base font-bold ${!isSentFolder && !message.isRead ? "text-slate-900 dark:text-slate-50" : "text-slate-700 dark:text-slate-300"}`}>
                          {isSentFolder ? `To: ${contactLabel}` : contactLabel}
                        </h4>
                        {message.hasAttachment && (
                          <div className="rounded bg-slate-100 p-1 dark:bg-slate-700">
                            <Paperclip className="h-3 w-3 text-slate-600 dark:text-slate-400" />
                          </div>
                        )}
                      </div>
                      <p className={`mb-2 text-sm font-semibold ${!isSentFolder && !message.isRead ? "text-slate-900 dark:text-slate-50" : "text-slate-600 dark:text-slate-400"}`}>
                        {message.subject}
                      </p>
                      <p className="line-clamp-2 text-sm text-slate-500 dark:text-slate-400">
                        {message.preview}
                      </p>
                    </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <span className="whitespace-nowrap text-xs font-medium text-slate-500 dark:text-slate-400">{message.timestamp}</span>
                      {!isSentFolder && !message.isRead && (
                        <span className={`rounded-full px-3 py-1 text-xs font-bold text-white ${isReply ? "bg-emerald-600" : "bg-indigo-600"}`}>
                          New
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
              })}
            </div>
          )}
          </div>
        </div>
      )}

      {/* Compose Tab */}
      {selectedTab === "compose" && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-8 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
              <Send className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-50">Compose New Message</h3>
          </div>
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                Recipients *
              </label>
              <select 
                value={composeRecipient}
                onChange={(e) => setComposeRecipient(e.target.value)}
                className="w-full px-4 py-3 border-2 border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all font-medium"
              >
                {composeRecipientOptions.map((option) => (
                  <option key={option.value || "placeholder"} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              {session?.role.toLowerCase() === "student" && (
                <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                  You can message your principal, your class teachers, or your entire class.
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                Subject *
              </label>
              <input
                type="text"
                value={composeSubject}
                onChange={(e) => setComposeSubject(e.target.value)}
                placeholder="Enter message subject..."
                className="w-full px-4 py-3 border-2 border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-50 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                Message *
              </label>
              <textarea
                rows={10}
                value={composeMessage}
                onChange={(e) => setComposeMessage(e.target.value)}
                placeholder="Type your message here..."
                className="w-full px-4 py-3 border-2 border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-50 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all resize-none"
              />
            </div>

            <div className="flex items-center gap-4 pt-4">
              <button 
                onClick={handleSendMessage}
                className="flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-xl transition-all font-bold shadow-lg shadow-blue-500/30"
              >
                <Send className="w-5 h-5" />
                Send Message
              </button>
              <button 
                onClick={handleSaveDraft}
                className="px-8 py-3 border-2 border-slate-300 dark:border-slate-600 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 hover:border-slate-400 dark:hover:border-slate-500 transition-all font-semibold"
              >
                Save Draft
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Message Detail Modal */}
      {selectedMessage && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            {(() => {
              const isSentMessage =
                session &&
                selectedMessage.senderEmail.toLowerCase() === session.email.toLowerCase();
              const isReply = isReplyMessage(selectedMessage);

              return (
                <>
            <div
              className={`p-6 border-b flex items-center justify-between gap-4 ${
                isSentMessage
                  ? "border-sky-200 bg-sky-50 dark:border-sky-900 dark:bg-sky-950/40"
                  : isReply
                    ? "border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/40"
                    : "border-indigo-200 bg-indigo-50 dark:border-indigo-900 dark:bg-indigo-950/40"
              }`}
            >
              <div className="flex items-start gap-3 min-w-0">
                <div
                  className={`rounded-xl p-2.5 shrink-0 ${
                    isSentMessage
                      ? "bg-sky-100 text-sky-700 dark:bg-sky-900/50 dark:text-sky-300"
                      : isReply
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300"
                        : "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300"
                  }`}
                >
                  {isSentMessage ? (
                    <SendHorizontal className="w-5 h-5" />
                  ) : isReply ? (
                    <CornerUpLeft className="w-5 h-5" />
                  ) : (
                    <Mail className="w-5 h-5" />
                  )}
                </div>
                <div className="min-w-0">
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide mb-2 ${
                      isSentMessage
                        ? "bg-sky-200/70 text-sky-800 dark:bg-sky-900/60 dark:text-sky-200"
                        : isReply
                          ? "bg-emerald-200/70 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200"
                          : "bg-indigo-200/70 text-indigo-800 dark:bg-indigo-900/60 dark:text-indigo-200"
                    }`}
                  >
                    {isSentMessage ? "Sent Message" : isReply ? "Reply Received" : "Received Message"}
                  </span>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-slate-50 truncate">
                    {selectedMessage.subject}
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                    {isSentMessage
                      ? `To ${selectedMessage.recipientName} · ${selectedMessage.timestamp}`
                      : `From ${selectedMessage.senderName} · ${selectedMessage.timestamp}`}
                  </p>
                </div>
              </div>
              <button onClick={() => setSelectedMessage(null)} className="p-2 hover:bg-white/60 dark:hover:bg-slate-700 rounded-lg shrink-0">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto flex-1">
              <div
                className={`rounded-xl border p-4 mb-6 ${
                  isSentMessage
                    ? "border-sky-200 bg-sky-50/50 dark:border-sky-900 dark:bg-sky-950/20"
                    : isReply
                      ? "border-emerald-200 bg-emerald-50/50 dark:border-emerald-900 dark:bg-emerald-950/20"
                      : "border-indigo-200 bg-indigo-50/50 dark:border-indigo-900 dark:bg-indigo-950/20"
                }`}
              >
                <p className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                  {selectedMessage.body || selectedMessage.preview}
                </p>
              </div>

              {!isSentMessage && isReply && originalReplyMessage && (
                <div className="mb-6 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900/40">
                  <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Your original message
                  </p>
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-50 mb-1">
                    {originalReplyMessage.subject}
                  </p>
                  <p className="text-sm text-slate-600 dark:text-slate-400 whitespace-pre-wrap line-clamp-4">
                    {originalReplyMessage.body || originalReplyMessage.preview}
                  </p>
                </div>
              )}

              {!isSentMessage && (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900/40">
                  <label className="mb-2 block text-sm font-semibold text-slate-900 dark:text-slate-50">
                    Reply to {selectedMessage.senderName}
                  </label>
                  <p className="mb-3 text-xs text-slate-500 dark:text-slate-400">
                    Your reply will be sent directly to {selectedMessage.senderName} and appear in your Sent folder.
                  </p>
                  <textarea
                    rows={5}
                    value={replyText}
                    onChange={(event) => setReplyText(event.target.value)}
                    placeholder={`Write your reply to ${selectedMessage.senderName}...`}
                    className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-50"
                  />
                </div>
              )}
            </div>
            <div className="p-6 border-t border-slate-200 dark:border-slate-700 flex gap-3">
              {!isSentMessage && (
                <button 
                  type="button"
                  onClick={handleSendReply}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-semibold"
                >
                  <Send className="w-4 h-4" />
                  Send Reply
                </button>
              )}
              {isSentMessage && (
                <button
                  type="button"
                  onClick={() => setSelectedTab("compose")}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-semibold"
                >
                  <Send className="w-4 h-4" />
                  Compose New
                </button>
              )}
              <button 
                type="button"
                onClick={() => deleteMessage(selectedMessage.id)}
                className="px-4 py-2 border border-red-300 dark:border-red-600 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
              >
                Delete
              </button>
            </div>
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* Announcement Detail Modal */}
      {selectedAnnouncement && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <h3 className="text-xl font-bold text-slate-900 dark:text-slate-50">{selectedAnnouncement.title}</h3>
              <button onClick={() => setSelectedAnnouncement(null)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto flex-1">
              <div className="mb-4 flex flex-wrap items-center gap-3">
                <span className="inline-flex items-center rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-700 dark:text-slate-200">
                  {getAnnouncementScopeLabel(selectedAnnouncement)}
                </span>
                <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold border ${priorityConfig[selectedAnnouncement.priority].color}`}>
                  {priorityConfig[selectedAnnouncement.priority].label}
                </span>
                {selectedAnnouncement.targetAudience.map((audience) => (
                  <span key={audience} className="px-2 py-1 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs rounded">
                    {audience}
                  </span>
                ))}
              </div>
              <div className="mb-4">
                <p className="text-sm text-slate-600 dark:text-slate-400">By: <span className="font-semibold">{selectedAnnouncement.authorName}</span></p>
                <p className="text-sm text-slate-600 dark:text-slate-400">Published: {formatDate(selectedAnnouncement.publishedAt)}</p>
                <p className="text-sm text-slate-600 dark:text-slate-400">Views: {selectedAnnouncement.views}</p>
              </div>
              <div className="prose dark:prose-invert max-w-none">
                <p className="text-slate-700 dark:text-slate-300">{selectedAnnouncement.content}</p>
              </div>
            </div>
            {session && canManageAnnouncement(session, selectedAnnouncement) && (
              <div className="p-6 border-t border-slate-200 dark:border-slate-700 flex gap-3">
                <button 
                  onClick={() => togglePin(selectedAnnouncement.id)}
                  className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                >
                  {selectedAnnouncement.isPinned ? "Unpin" : "Pin"}
                </button>
                <button 
                  onClick={() => {
                    if (confirm("Are you sure you want to delete this announcement?")) {
                      deleteAnnouncement(selectedAnnouncement.id);
                    }
                  }}
                  className="px-4 py-2 border border-red-300 dark:border-red-600 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                >
                  Delete
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Compose Announcement Modal */}
      {showComposeAnnouncement && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-slate-50">
                  {isAdminPublisher ? "Create School Announcement" : "Create Class Announcement"}
                </h3>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  {isAdminPublisher
                    ? "This notice will be visible school-wide to the audiences you select."
                    : "This notice will only be visible to the class you are in charge of."}
                </p>
              </div>
              <button onClick={() => setShowComposeAnnouncement(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto flex-1 space-y-4">
              {!isAdminPublisher && (
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Class *</label>
                  {teacherClassOptions.length === 0 ? (
                    <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
                      You are not set as class teacher for any class yet. Ask an administrator to assign you as class in-charge in Academics.
                    </p>
                  ) : (
                    <select
                      value={announcementClassId}
                      onChange={(e) => setAnnouncementClassId(e.target.value)}
                      className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {teacherClassOptions.map((option) => (
                        <option key={option.id} value={option.id}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              )}
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Title *</label>
                <input
                  type="text"
                  value={announcementTitle}
                  onChange={(e) => setAnnouncementTitle(e.target.value)}
                  placeholder="Enter announcement title..."
                  className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Content *</label>
                <textarea
                  rows={6}
                  value={announcementContent}
                  onChange={(e) => setAnnouncementContent(e.target.value)}
                  placeholder="Enter announcement content..."
                  className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Priority</label>
                <select
                  value={announcementPriority}
                  onChange={(e) => setAnnouncementPriority(e.target.value as AnnouncementPriority)}
                  className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="low">Low Priority</option>
                  <option value="normal">Normal</option>
                  <option value="high">High Priority</option>
                  {isAdminPublisher && <option value="urgent">Urgent</option>}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Target Audience *</label>
                <div className="flex flex-wrap gap-2">
                  {composeAudienceOptions.map((audience) => (
                    <button
                      key={audience}
                      type="button"
                      onClick={() => toggleAudience(audience)}
                      className={`px-4 py-2 rounded-lg border-2 transition-colors ${
                        announcementAudience.includes(audience)
                          ? "bg-blue-600 border-blue-600 text-white"
                          : "border-slate-300 dark:border-slate-600 hover:border-blue-400"
                      }`}
                    >
                      {audience}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-slate-200 dark:border-slate-700 flex gap-3">
              <button 
                onClick={handleCreateAnnouncement}
                disabled={!isAdminPublisher && teacherClassOptions.length === 0}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 text-white rounded-lg transition-colors font-semibold"
              >
                {isAdminPublisher ? "Publish School Announcement" : "Publish Class Announcement"}
              </button>
              <button 
                onClick={() => setShowComposeAnnouncement(false)}
                className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Compose Message Modal */}
      {showComposeMessage && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <h3 className="text-xl font-bold text-slate-900 dark:text-slate-50">Compose New Message</h3>
              <button onClick={() => setShowComposeMessage(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto flex-1 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Recipients *</label>
                <select 
                  value={composeRecipient}
                  onChange={(e) => setComposeRecipient(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {composeRecipientOptions.map((option) => (
                    <option key={option.value || "placeholder"} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Subject *</label>
                <input
                  type="text"
                  value={composeSubject}
                  onChange={(e) => setComposeSubject(e.target.value)}
                  placeholder="Enter message subject..."
                  className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Message *</label>
                <textarea
                  rows={8}
                  value={composeMessage}
                  onChange={(e) => setComposeMessage(e.target.value)}
                  placeholder="Type your message here..."
                  className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="p-6 border-t border-slate-200 dark:border-slate-700 flex gap-3">
              <button 
                onClick={handleSendMessage}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-semibold"
              >
                <Send className="w-4 h-4" />
                Send Message
              </button>
              <button 
                onClick={handleSaveDraft}
                className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
              >
                Save Draft
              </button>
              <button 
                onClick={() => setShowComposeMessage(false)}
                className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
