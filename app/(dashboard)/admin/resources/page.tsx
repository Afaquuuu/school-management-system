"use client";

import { useState, useEffect, useMemo } from "react";
import { Plus, Edit, Trash2, AlertCircle, X, Save, CheckCircle } from "lucide-react";
import { useSchool, getScopedItem, setScopedItem } from "@/lib/school-context";
import {
  detectTimetableConflicts,
  formatTimeRange,
  groupEntriesByDay,
  loadTimetableEntries,
  saveTimetableEntries,
  TIMETABLE_DAYS,
  type TimetableEntry,
} from "@/lib/timetable";

type ResourceType = "Classroom" | "Lab" | "Facility";

type Resource = {
  id: string;
  code: string;
  name: string;
  capacity: number;
  type: ResourceType;
  available: boolean;
};

const sampleResources: Resource[] = [
  { id: "1", code: "R-101", name: "Classroom 1", capacity: 45, type: "Classroom", available: true },
  { id: "2", code: "R-102", name: "Classroom 2", capacity: 42, type: "Classroom", available: true },
  { id: "3", code: "LAB-01", name: "Science Lab", capacity: 30, type: "Lab", available: false },
  { id: "4", code: "LAB-02", name: "Computer Lab", capacity: 28, type: "Lab", available: true },
  { id: "5", code: "GYM-01", name: "Gymnasium", capacity: 100, type: "Facility", available: true },
];

export default function ResourcesPage() {
  const { currentSchool } = useSchool();
  const [selectedTab, setSelectedTab] = useState<"classrooms" | "schedule" | "conflicts">("classrooms");
  const [resources, setResources] = useState<Resource[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedResource, setSelectedResource] = useState<Resource | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [timetableEntries, setTimetableEntries] = useState<TimetableEntry[]>([]);
  const [selectedRoomFilter, setSelectedRoomFilter] = useState("all");
  
  // Form state
  const [formData, setFormData] = useState<Partial<Resource>>({
    code: "",
    name: "",
    capacity: 30,
    type: "Classroom",
    available: true,
  });

  // Load resources from localStorage
  useEffect(() => {
    if (currentSchool) {
      const stored = getScopedItem(currentSchool.id, 'school_resources');
      if (stored) {
        setResources(JSON.parse(stored));
      } else {
        // Initialize with sample data
        setResources(sampleResources);
        setScopedItem(currentSchool.id, 'school_resources', JSON.stringify(sampleResources));
      }

      setTimetableEntries(loadTimetableEntries(currentSchool.id));
    }
  }, [currentSchool]);

  const reloadTimetable = () => {
    if (!currentSchool) return;
    setTimetableEntries(loadTimetableEntries(currentSchool.id));
  };

  const scheduleByDay = useMemo(() => groupEntriesByDay(timetableEntries), [timetableEntries]);
  const scheduleConflicts = useMemo(
    () => detectTimetableConflicts(timetableEntries),
    [timetableEntries],
  );

  const filteredScheduleByDay = useMemo(() => {
    if (selectedRoomFilter === "all") return scheduleByDay;

    const filtered = Object.fromEntries(
      TIMETABLE_DAYS.map((day) => [day, [] as TimetableEntry[]]),
    ) as Record<(typeof TIMETABLE_DAYS)[number], TimetableEntry[]>;

    for (const day of TIMETABLE_DAYS) {
      filtered[day] = scheduleByDay[day].filter((entry) => entry.roomCode === selectedRoomFilter);
    }

    return filtered;
  }, [scheduleByDay, selectedRoomFilter]);

  const resolveConflict = (conflictId: string) => {
    if (!currentSchool) return;
    const conflict = scheduleConflicts.find((item) => item.id === conflictId);
    if (!conflict || conflict.entryIds.length < 2) return;

    const entryToRemove = conflict.entryIds[1];
    const nextEntries = timetableEntries.filter((entry) => entry.id !== entryToRemove);
    setTimetableEntries(nextEntries);
    saveTimetableEntries(currentSchool.id, nextEntries);
    showSuccessNotification("Conflicting slot removed. Update the timetable in Academics → Timetable.");
  };

  // Save resources to localStorage
  const saveResources = (updatedResources: Resource[]) => {
    if (currentSchool) {
      setResources(updatedResources);
      setScopedItem(currentSchool.id, 'school_resources', JSON.stringify(updatedResources));
    }
  };

  const showSuccessNotification = (message: string) => {
    setSuccessMessage(message);
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
  };

  const handleAddResource = () => {
    if (!formData.code || !formData.name || !formData.capacity) {
      alert("Please fill in all required fields");
      return;
    }

    // Check for duplicate code
    if (resources.some(r => r.code.toLowerCase() === formData.code?.toLowerCase())) {
      alert("Resource code already exists");
      return;
    }

    const newResource: Resource = {
      id: `resource_${Date.now()}`,
      code: formData.code!,
      name: formData.name!,
      capacity: formData.capacity!,
      type: formData.type as ResourceType || "Classroom",
      available: formData.available ?? true,
    };

    const updatedResources = [...resources, newResource];
    saveResources(updatedResources);
    
    setShowAddModal(false);
    resetForm();
    showSuccessNotification(`${newResource.code} added successfully!`);
  };

  const handleEditResource = () => {
    if (!selectedResource || !formData.code || !formData.name || !formData.capacity) {
      alert("Please fill in all required fields");
      return;
    }

    // Check for duplicate code (excluding current resource)
    if (resources.some(r => r.id !== selectedResource.id && r.code.toLowerCase() === formData.code?.toLowerCase())) {
      alert("Resource code already exists");
      return;
    }

    const updatedResources = resources.map(r =>
      r.id === selectedResource.id
        ? {
            ...r,
            code: formData.code!,
            name: formData.name!,
            capacity: formData.capacity!,
            type: formData.type as ResourceType || r.type,
            available: formData.available ?? r.available,
          }
        : r
    );

    saveResources(updatedResources);
    setShowEditModal(false);
    setSelectedResource(null);
    resetForm();
    showSuccessNotification(`${formData.code} updated successfully!`);
  };

  const handleDeleteResource = (resource: Resource) => {
    if (confirm(`Delete ${resource.code} - ${resource.name}?`)) {
      const updatedResources = resources.filter(r => r.id !== resource.id);
      saveResources(updatedResources);
      showSuccessNotification(`${resource.code} deleted successfully!`);
    }
  };

  const openEditModal = (resource: Resource) => {
    setSelectedResource(resource);
    setFormData({
      code: resource.code,
      name: resource.name,
      capacity: resource.capacity,
      type: resource.type,
      available: resource.available,
    });
    setShowEditModal(true);
  };

  const resetForm = () => {
    setFormData({
      code: "",
      name: "",
      capacity: 30,
      type: "Classroom",
      available: true,
    });
  };

  const closeAddModal = () => {
    setShowAddModal(false);
    resetForm();
  };

  const closeEditModal = () => {
    setShowEditModal(false);
    setSelectedResource(null);
    resetForm();
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-50">Resource Management</h1>
          <p className="mt-1 text-slate-600 dark:text-slate-400">Manage classrooms, labs, and detect scheduling conflicts</p>
        </div>
      </div>

      {/* Success Notification */}
      {showSuccess && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-xl p-4 flex items-center gap-3">
          <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
          <div>
            <p className="font-semibold text-green-900 dark:text-green-50">Success</p>
            <p className="text-sm text-green-700 dark:text-green-300">{successMessage}</p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-4 border-b border-slate-200 dark:border-slate-700">
        {(["classrooms", "schedule", "conflicts"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setSelectedTab(tab)}
            className={`px-4 py-2 font-medium border-b-2 transition-colors ${
              selectedTab === tab
                ? "border-blue-600 text-blue-600 dark:text-blue-400"
                : "border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Classrooms Tab */}
      {selectedTab === "classrooms" && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Total Resources: <span className="font-semibold text-slate-900 dark:text-slate-50">{resources.length}</span>
            </p>
            <button 
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors font-semibold"
            >
              <Plus className="w-4 h-4" />
              Add Classroom
            </button>
          </div>

          {resources.length === 0 ? (
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-12 text-center">
              <AlertCircle className="w-16 h-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-50 mb-2">No Resources Found</h3>
              <p className="text-slate-600 dark:text-slate-400 mb-4">
                Add classrooms, labs, or facilities to get started
              </p>
              <button 
                onClick={() => setShowAddModal(true)}
                className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition-all"
              >
                <Plus className="w-5 h-5" />
                Add First Resource
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {resources.map((room) => (
                <div
                  key={room.id}
                  className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-6 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-2xl font-bold text-slate-900 dark:text-slate-50">{room.code}</span>
                        <span
                          className={`px-2 py-1 text-xs font-semibold rounded ${
                            room.type === "Classroom"
                              ? "bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200"
                              : room.type === "Lab"
                              ? "bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200"
                              : "bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200"
                          }`}
                        >
                          {room.type}
                        </span>
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-400">{room.name}</p>
                    </div>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        room.available
                          ? "bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200"
                          : "bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200"
                      }`}
                    >
                      {room.available ? "Available" : "In Use"}
                    </span>
                  </div>
                  <div className="pt-4 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center">
                    <p className="text-sm text-slate-600 dark:text-slate-400">Capacity: {room.capacity} seats</p>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => openEditModal(room)}
                        className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition-colors"
                        title="Edit resource"
                      >
                        <Edit className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      </button>
                      <button 
                        onClick={() => handleDeleteResource(room)}
                        className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition-colors"
                        title="Delete resource"
                      >
                        <Trash2 className="w-4 h-4 text-red-600 dark:text-red-400" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Schedule Tab */}
      {selectedTab === "schedule" && (
        <div className="space-y-4">
          <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded-lg p-4 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              Live room allocation from Academics → Timetable. Assign periods there to update this schedule.
            </p>
            <div className="flex items-center gap-3">
              <label className="text-sm font-medium text-blue-900 dark:text-blue-100">Room</label>
              <select
                value={selectedRoomFilter}
                onChange={(event) => setSelectedRoomFilter(event.target.value)}
                className="rounded-lg border border-blue-200 bg-white px-3 py-2 text-sm dark:border-blue-700 dark:bg-slate-800 dark:text-slate-50"
              >
                <option value="all">All rooms</option>
                {resources.map((room) => (
                  <option key={room.id} value={room.code}>
                    {room.code}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={reloadTimetable}
                className="rounded-lg border border-blue-300 px-3 py-2 text-sm font-medium text-blue-700 hover:bg-blue-100 dark:border-blue-700 dark:text-blue-200 dark:hover:bg-blue-900/40"
              >
                Refresh
              </button>
            </div>
          </div>

          {timetableEntries.length === 0 ? (
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-12 text-center">
              <AlertCircle className="w-16 h-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-50 mb-2">No Timetable Entries Yet</h3>
              <p className="text-slate-600 dark:text-slate-400">
                Go to Academics → Timetable to assign subjects and rooms for each class period.
              </p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
              {TIMETABLE_DAYS.map((day) => (
                <div key={day} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-6">
                  <h3 className="font-bold text-slate-900 dark:text-slate-50 mb-4">{day}</h3>
                  {filteredScheduleByDay[day].length === 0 ? (
                    <p className="text-sm text-slate-500">No bookings for this filter.</p>
                  ) : (
                    <div className="space-y-3">
                      {filteredScheduleByDay[day].map((entry) => (
                        <div key={entry.id} className="bg-slate-50 dark:bg-slate-700 p-3 rounded text-sm">
                          <p className="font-medium text-slate-900 dark:text-slate-50">
                            {formatTimeRange(entry.startTime, entry.endTime)}
                          </p>
                          <p className="text-slate-600 dark:text-slate-400">
                            {entry.roomCode} — {entry.classLabel}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                            {entry.subject} • {entry.teacher}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Conflicts Tab */}
      {selectedTab === "conflicts" && (
        <div className="space-y-4">
          {scheduleConflicts.length > 0 ? (
            <div className="bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-700 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-yellow-900 dark:text-yellow-200">{scheduleConflicts.length} Scheduling Conflict(s) Detected</p>
                  <p className="text-sm text-yellow-800 dark:text-yellow-300 mt-1">
                    These come from overlapping room bookings in the weekly timetable.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-green-900 dark:text-green-100">No room conflicts detected</p>
                  <p className="text-sm text-green-800 dark:text-green-300 mt-1">
                    All assigned rooms have unique bookings for each period.
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-3">
            {scheduleConflicts.map((conflict) => (
              <div
                key={conflict.id}
                className={`border rounded-lg p-6 ${
                  conflict.severity === "high"
                    ? "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700"
                    : "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-700"
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-slate-50">{conflict.message}</p>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">Suggested: {conflict.resolution}</p>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      conflict.severity === "high"
                        ? "bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200"
                        : "bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200"
                    }`}
                  >
                    {conflict.severity.charAt(0).toUpperCase() + conflict.severity.slice(1)}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => resolveConflict(conflict.id)}
                  className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline mt-3"
                >
                  Remove later conflicting slot
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Add Resource Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between sticky top-0 bg-white dark:bg-slate-800">
              <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-50">Add New Resource</h3>
              <button 
                onClick={closeAddModal}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                    Resource Code *
                  </label>
                  <input
                    type="text"
                    value={formData.code || ""}
                    onChange={(e) => setFormData({...formData, code: e.target.value})}
                    placeholder="e.g., R-101, LAB-01"
                    className="w-full px-4 py-3 border-2 border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                    Resource Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name || ""}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    placeholder="e.g., Classroom 1, Science Lab"
                    className="w-full px-4 py-3 border-2 border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                    Type *
                  </label>
                  <select
                    value={formData.type || "Classroom"}
                    onChange={(e) => setFormData({...formData, type: e.target.value as ResourceType})}
                    className="w-full px-4 py-3 border-2 border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="Classroom">Classroom</option>
                    <option value="Lab">Lab</option>
                    <option value="Facility">Facility</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                    Capacity (seats) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.capacity || 30}
                    onChange={(e) => setFormData({...formData, capacity: parseInt(e.target.value)})}
                    className="w-full px-4 py-3 border-2 border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="flex items-center gap-3 rounded-xl border-2 border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 px-4 py-3 text-sm font-medium text-slate-700 dark:text-slate-300 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                  <input
                    type="checkbox"
                    checked={formData.available ?? true}
                    onChange={(e) => setFormData({...formData, available: e.target.checked})}
                    className="h-5 w-5 rounded border-slate-300 text-blue-600 focus:ring-2 focus:ring-blue-500"
                  />
                  Mark as available
                </label>
              </div>
            </div>

            <div className="p-6 border-t border-slate-200 dark:border-slate-700 flex gap-3 justify-end">
              <button
                onClick={closeAddModal}
                className="px-6 py-3 border-2 border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-xl font-semibold hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddResource}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition-colors flex items-center gap-2"
              >
                <Save className="w-5 h-5" />
                Add Resource
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Resource Modal */}
      {showEditModal && selectedResource && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between sticky top-0 bg-white dark:bg-slate-800">
              <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-50">Edit Resource</h3>
              <button 
                onClick={closeEditModal}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                    Resource Code *
                  </label>
                  <input
                    type="text"
                    value={formData.code || ""}
                    onChange={(e) => setFormData({...formData, code: e.target.value})}
                    placeholder="e.g., R-101, LAB-01"
                    className="w-full px-4 py-3 border-2 border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                    Resource Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name || ""}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    placeholder="e.g., Classroom 1, Science Lab"
                    className="w-full px-4 py-3 border-2 border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                    Type *
                  </label>
                  <select
                    value={formData.type || "Classroom"}
                    onChange={(e) => setFormData({...formData, type: e.target.value as ResourceType})}
                    className="w-full px-4 py-3 border-2 border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="Classroom">Classroom</option>
                    <option value="Lab">Lab</option>
                    <option value="Facility">Facility</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                    Capacity (seats) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.capacity || 30}
                    onChange={(e) => setFormData({...formData, capacity: parseInt(e.target.value)})}
                    className="w-full px-4 py-3 border-2 border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="flex items-center gap-3 rounded-xl border-2 border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 px-4 py-3 text-sm font-medium text-slate-700 dark:text-slate-300 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                  <input
                    type="checkbox"
                    checked={formData.available ?? true}
                    onChange={(e) => setFormData({...formData, available: e.target.checked})}
                    className="h-5 w-5 rounded border-slate-300 text-blue-600 focus:ring-2 focus:ring-blue-500"
                  />
                  Mark as available
                </label>
              </div>
            </div>

            <div className="p-6 border-t border-slate-200 dark:border-slate-700 flex gap-3 justify-end">
              <button
                onClick={closeEditModal}
                className="px-6 py-3 border-2 border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-xl font-semibold hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleEditResource}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition-colors flex items-center gap-2"
              >
                <Save className="w-5 h-5" />
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
