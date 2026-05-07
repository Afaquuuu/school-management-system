"use client";

import { useState, useMemo } from "react";
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
} from "lucide-react";

type AnnouncementPriority = "low" | "normal" | "high" | "urgent";

type Announcement = {
  id: string;
  title: string;
  content: string;
  priority: AnnouncementPriority;
  author: string;
  publishedAt: string;
  targetAudience: string[];
  views: number;
  isPinned: boolean;
};

type Message = {
  id: string;
  sender: string;
  subject: string;
  preview: string;
  timestamp: string;
  isRead: boolean;
  hasAttachment: boolean;
};

const sampleAnnouncements: Announcement[] = [
  {
    id: "1",
    title: "Mid-Term Examination Schedule Released",
    content: "The mid-term examination schedule for all classes has been published. Please check the academic calendar for detailed timings.",
    priority: "high",
    author: "Principal Dr. K. Osei",
    publishedAt: "2026-05-05",
    targetAudience: ["Students", "Teachers", "Parents"],
    views: 245,
    isPinned: true,
  },
  {
    id: "2",
    title: "Parent-Teacher Meeting - May 15th",
    content: "All parents are invited to attend the quarterly parent-teacher meeting on May 15th at 2:00 PM in the school auditorium.",
    priority: "urgent",
    author: "Admin Office",
    publishedAt: "2026-05-04",
    targetAudience: ["Parents", "Teachers"],
    views: 189,
    isPinned: true,
  },
  {
    id: "3",
    title: "Sports Day Registration Open",
    content: "Registration for the annual sports day is now open. Students can register through their class teachers by May 10th.",
    priority: "normal",
    author: "Sports Department",
    publishedAt: "2026-05-03",
    targetAudience: ["Students"],
    views: 156,
    isPinned: false,
  },
  {
    id: "4",
    title: "Library Hours Extended",
    content: "The school library will now remain open until 6:00 PM on weekdays to accommodate students preparing for exams.",
    priority: "low",
    author: "Library Staff",
    publishedAt: "2026-05-02",
    targetAudience: ["Students", "Teachers"],
    views: 98,
    isPinned: false,
  },
];

const sampleMessages: Message[] = [
  {
    id: "1",
    sender: "A. Mensah (Math Teacher)",
    subject: "Assignment Submission Reminder",
    preview: "Please remind students to submit their calculus assignments by Friday...",
    timestamp: "2 hours ago",
    isRead: false,
    hasAttachment: true,
  },
  {
    id: "2",
    sender: "Parent - Mrs. Johnson",
    subject: "Regarding Ama's Attendance",
    preview: "I wanted to discuss my daughter's recent attendance record...",
    timestamp: "5 hours ago",
    isRead: false,
    hasAttachment: false,
  },
  {
    id: "3",
    sender: "Principal Office",
    subject: "Staff Meeting Minutes",
    preview: "Please find attached the minutes from yesterday's staff meeting...",
    timestamp: "1 day ago",
    isRead: true,
    hasAttachment: true,
  },
  {
    id: "4",
    sender: "S. Okafor (English Teacher)",
    subject: "Book Club Update",
    preview: "The next book club session will be held on Thursday at 3 PM...",
    timestamp: "2 days ago",
    isRead: true,
    hasAttachment: false,
  },
];

const priorityConfig: Record<AnnouncementPriority, { color: string; label: string; icon: any }> = {
  urgent: { color: "bg-red-100 text-red-700 border-red-200", label: "Urgent", icon: AlertCircle },
  high: { color: "bg-orange-100 text-orange-700 border-orange-200", label: "High Priority", icon: AlertCircle },
  normal: { color: "bg-blue-100 text-blue-700 border-blue-200", label: "Normal", icon: Bell },
  low: { color: "bg-slate-100 text-slate-700 border-slate-200", label: "Low Priority", icon: Bell },
};

export default function CommunicationPage() {
  const [selectedTab, setSelectedTab] = useState<"announcements" | "messages" | "compose">("announcements");
  const [searchTerm, setSearchTerm] = useState("");
  const [showComposeAnnouncement, setShowComposeAnnouncement] = useState(false);
  const [showComposeMessage, setShowComposeMessage] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null);
  
  // State management
  const [announcements, setAnnouncements] = useState<Announcement[]>(sampleAnnouncements);
  const [messages, setMessages] = useState<Message[]>(sampleMessages);
  
  // Compose form states
  const [composeRecipient, setComposeRecipient] = useState("");
  const [composeSubject, setComposeSubject] = useState("");
  const [composeMessage, setComposeMessage] = useState("");
  const [announcementTitle, setAnnouncementTitle] = useState("");
  const [announcementContent, setAnnouncementContent] = useState("");
  const [announcementPriority, setAnnouncementPriority] = useState<AnnouncementPriority>("normal");
  const [announcementAudience, setAnnouncementAudience] = useState<string[]>([]);
  const [filterPriority, setFilterPriority] = useState<string>("all");
  const [showFilterMenu, setShowFilterMenu] = useState(false);

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

  const filteredMessages = useMemo(() =>
    messages.filter(
      (message) =>
        message.sender.toLowerCase().includes(searchTerm.toLowerCase()) ||
        message.subject.toLowerCase().includes(searchTerm.toLowerCase())
    ),
    [messages, searchTerm]
  );

  const unreadCount = useMemo(() => messages.filter((m) => !m.isRead).length, [messages]);

  const markAsRead = (messageId: string) => {
    setMessages(prev => prev.map(msg => 
      msg.id === messageId ? { ...msg, isRead: true } : msg
    ));
  };

  const deleteMessage = (messageId: string) => {
    setMessages(prev => prev.filter(msg => msg.id !== messageId));
    setSelectedMessage(null);
  };

  const togglePin = (announcementId: string) => {
    setAnnouncements(prev => prev.map(ann => 
      ann.id === announcementId ? { ...ann, isPinned: !ann.isPinned } : ann
    ));
  };

  const deleteAnnouncement = (announcementId: string) => {
    setAnnouncements(prev => prev.filter(ann => ann.id !== announcementId));
    setSelectedAnnouncement(null);
  };

  const handleSendMessage = () => {
    if (!composeRecipient || !composeSubject || !composeMessage) {
      alert("Please fill in all fields");
      return;
    }

    const newMessage: Message = {
      id: Date.now().toString(),
      sender: "You",
      subject: composeSubject,
      preview: composeMessage.substring(0, 100) + "...",
      timestamp: "Just now",
      isRead: true,
      hasAttachment: false,
    };

    setMessages([newMessage, ...messages]);
    setComposeRecipient("");
    setComposeSubject("");
    setComposeMessage("");
    setShowComposeMessage(false);
    alert("Message sent successfully!");
  };

  const handleSaveDraft = () => {
    if (!composeSubject && !composeMessage) {
      alert("Nothing to save");
      return;
    }
    alert("Draft saved successfully!");
  };

  const handleReply = (message: Message) => {
    setComposeRecipient(message.sender);
    setComposeSubject(`Re: ${message.subject}`);
    setComposeMessage("");
    setSelectedMessage(null);
    setSelectedTab("compose");
  };

  const handleCreateAnnouncement = () => {
    if (!announcementTitle || !announcementContent || announcementAudience.length === 0) {
      alert("Please fill in all required fields");
      return;
    }

    const newAnnouncement: Announcement = {
      id: Date.now().toString(),
      title: announcementTitle,
      content: announcementContent,
      priority: announcementPriority,
      author: "You",
      publishedAt: new Date().toISOString().split('T')[0],
      targetAudience: announcementAudience,
      views: 0,
      isPinned: false,
    };

    setAnnouncements([newAnnouncement, ...announcements]);
    setAnnouncementTitle("");
    setAnnouncementContent("");
    setAnnouncementPriority("normal");
    setAnnouncementAudience([]);
    setShowComposeAnnouncement(false);
    alert("Announcement published successfully!");
  };

  const toggleAudience = (audience: string) => {
    setAnnouncementAudience(prev => 
      prev.includes(audience) 
        ? prev.filter(a => a !== audience)
        : [...prev, audience]
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
                <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-50">Communication Center</h1>
              </div>
              <p className="text-slate-600 dark:text-slate-400 ml-14">
                Manage announcements, messages, and notifications for all school stakeholders
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowComposeMessage(true)}
                className="flex items-center gap-2 px-5 py-2.5 border-2 border-slate-300 dark:border-slate-600 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 hover:border-slate-400 dark:hover:border-slate-500 transition-all font-medium text-slate-700 dark:text-slate-200"
              >
                <Mail className="w-4 h-4" />
                New Message
              </button>
              <button
                onClick={() => setShowComposeAnnouncement(true)}
                className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-5 py-2.5 rounded-xl transition-all font-medium shadow-lg shadow-blue-500/30"
              >
                <Megaphone className="w-4 h-4" />
                New Announcement
              </button>
            </div>
          </div>
        </div>

      {/* Quick Stats */}
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
            {messages.length} total messages
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

      {/* Tabs */}
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

      {/* Search Bar */}
      {selectedTab !== "compose" && (
        <div className="flex gap-4 relative px-2">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder={`Search ${selectedTab}...`}
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
              <p className="text-slate-600 dark:text-slate-400">Try adjusting your search or filter criteria</p>
            </div>
          ) : (
            filteredAnnouncements.map((announcement) => {
              const config = priorityConfig[announcement.priority];
              const PriorityIcon = config.icon;

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
                        <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400 font-medium">
                          <div className="p-1.5 bg-slate-100 dark:bg-slate-700 rounded-lg">
                            <Users className="w-4 h-4" />
                          </div>
                          <span>{announcement.author}</span>
                        </div>
                        <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                          <Calendar className="w-4 h-4" />
                          <span>{announcement.publishedAt}</span>
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
                        <button
                          onClick={() => togglePin(announcement.id)}
                          className="p-2 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-all"
                          title={announcement.isPinned ? "Unpin" : "Pin"}
                        >
                          <Pin className={`w-4 h-4 ${announcement.isPinned ? 'text-blue-600 fill-blue-600' : 'text-slate-400'}`} />
                        </button>
                        <button
                          onClick={() => setSelectedAnnouncement(announcement)}
                          className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-all"
                          title="View details"
                        >
                          <Eye className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                        </button>
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
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm p-2">
          {filteredMessages.length === 0 ? (
            <div className="p-12 text-center">
              <Mail className="w-16 h-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-50 mb-2">No messages found</h3>
              <p className="text-slate-600 dark:text-slate-400">Try adjusting your search criteria</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-200 dark:divide-slate-700">
              {filteredMessages.map((message) => (
                <div
                  key={message.id}
                  onClick={() => {
                    setSelectedMessage(message);
                    markAsRead(message.id);
                  }}
                  className={`p-5 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-all cursor-pointer rounded-xl ${
                    !message.isRead ? "bg-blue-50 dark:bg-blue-900/10" : ""
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        {!message.isRead && (
                          <div className="w-2.5 h-2.5 bg-blue-600 rounded-full animate-pulse"></div>
                        )}
                        <h4 className={`font-bold text-base ${!message.isRead ? "text-slate-900 dark:text-slate-50" : "text-slate-700 dark:text-slate-300"}`}>
                          {message.sender}
                        </h4>
                        {message.hasAttachment && (
                          <div className="p-1 bg-slate-100 dark:bg-slate-700 rounded">
                            <Paperclip className="w-3 h-3 text-slate-600 dark:text-slate-400" />
                          </div>
                        )}
                      </div>
                      <p className={`text-sm mb-2 font-semibold ${!message.isRead ? "text-slate-900 dark:text-slate-50" : "text-slate-600 dark:text-slate-400"}`}>
                        {message.subject}
                      </p>
                      <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2">{message.preview}</p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <span className="text-xs text-slate-500 dark:text-slate-400 font-medium whitespace-nowrap">{message.timestamp}</span>
                      {!message.isRead && (
                        <span className="px-3 py-1 bg-blue-600 text-white text-xs font-bold rounded-full">New</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
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
                <option value="">Select recipient...</option>
                <option value="all_teachers">All Teachers</option>
                <option value="all_parents">All Parents</option>
                <option value="all_students">All Students</option>
                <option value="grade_8a">Grade 8A</option>
                <option value="grade_8b">Grade 8B</option>
              </select>
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
            <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <h3 className="text-xl font-bold text-slate-900 dark:text-slate-50">{selectedMessage.subject}</h3>
              <button onClick={() => setSelectedMessage(null)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto flex-1">
              <div className="mb-4">
                <p className="text-sm text-slate-600 dark:text-slate-400">From: <span className="font-semibold text-slate-900 dark:text-slate-50">{selectedMessage.sender}</span></p>
                <p className="text-sm text-slate-600 dark:text-slate-400">Time: {selectedMessage.timestamp}</p>
              </div>
              <div className="prose dark:prose-invert max-w-none">
                <p className="text-slate-700 dark:text-slate-300">{selectedMessage.preview}</p>
              </div>
            </div>
            <div className="p-6 border-t border-slate-200 dark:border-slate-700 flex gap-3">
              <button 
                onClick={() => handleReply(selectedMessage)}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                Reply
              </button>
              <button 
                onClick={() => deleteMessage(selectedMessage.id)}
                className="px-4 py-2 border border-red-300 dark:border-red-600 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
              >
                Delete
              </button>
            </div>
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
              <div className="mb-4 flex items-center gap-3">
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
                <p className="text-sm text-slate-600 dark:text-slate-400">By: <span className="font-semibold">{selectedAnnouncement.author}</span></p>
                <p className="text-sm text-slate-600 dark:text-slate-400">Published: {selectedAnnouncement.publishedAt}</p>
                <p className="text-sm text-slate-600 dark:text-slate-400">Views: {selectedAnnouncement.views}</p>
              </div>
              <div className="prose dark:prose-invert max-w-none">
                <p className="text-slate-700 dark:text-slate-300">{selectedAnnouncement.content}</p>
              </div>
            </div>
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
          </div>
        </div>
      )}

      {/* Compose Announcement Modal */}
      {showComposeAnnouncement && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <h3 className="text-xl font-bold text-slate-900 dark:text-slate-50">Create Announcement</h3>
              <button onClick={() => setShowComposeAnnouncement(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto flex-1 space-y-4">
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
                  <option value="urgent">Urgent</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Target Audience *</label>
                <div className="flex flex-wrap gap-2">
                  {["Students", "Teachers", "Parents"].map((audience) => (
                    <button
                      key={audience}
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
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-semibold"
              >
                Publish Announcement
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
                  <option value="">Select recipient...</option>
                  <option value="all_teachers">All Teachers</option>
                  <option value="all_parents">All Parents</option>
                  <option value="all_students">All Students</option>
                  <option value="grade_8a">Grade 8A</option>
                  <option value="grade_8b">Grade 8B</option>
                  <option value="principal">Principal</option>
                  <option value="admin">Admin Office</option>
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
