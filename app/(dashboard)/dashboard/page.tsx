"use client";

import { useEffect, useState, useMemo } from "react";
import { 
  Activity, 
  CalendarCheck, 
  GraduationCap, 
  Users2, 
  TrendingUp, 
  TrendingDown,
  AlertCircle,
  CheckCircle,
  Clock,
  DollarSign,
  UserCheck,
  BookOpen,
  Bell,
  ArrowRight,
  Calendar,
  Users,
  Award,
  Target,
  BarChart3,
  PieChart
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useSchool, getScopedItem } from "@/lib/school-context";

type Student = {
  id: string;
  studentId: string;
  firstName: string;
  lastName: string;
  class: string;
  section: string;
  status: string;
};

type AttendanceRecord = {
  id: string;
  date: string;
  class: string;
  studentId: string;
  status: string;
};

export default function DashboardPage() {
  const router = useRouter();
  const { currentSchool } = useSchool();
  const [students, setStudents] = useState<Student[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Load data from scoped localStorage
  useEffect(() => {
    if (typeof window !== 'undefined' && currentSchool) {
      const storedStudents = getScopedItem(currentSchool.id, 'school_students');
      const storedAttendance = getScopedItem(currentSchool.id, 'attendance_records');
      
      if (storedStudents) {
        setStudents(JSON.parse(storedStudents));
      }
      
      if (storedAttendance) {
        setAttendanceRecords(JSON.parse(storedAttendance));
      }
    }

    // Update time every minute
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, [currentSchool]);

  // Calculate metrics
  const metrics = useMemo(() => {
    const totalStudents = students.length;
    const activeStudents = students.filter(s => s.status === 'active').length;
    
    // Get today's attendance
    const today = new Date().toISOString().split('T')[0];
    const todayRecords = attendanceRecords.filter(r => r.date === today);
    const presentToday = todayRecords.filter(r => r.status === 'present' || r.status === 'late').length;
    const attendanceRate = todayRecords.length > 0 
      ? ((presentToday / todayRecords.length) * 100).toFixed(1)
      : '0.0';
    
    // Calculate alerts
    const absentStudents = todayRecords.filter(r => r.status === 'absent').length;
    
    // Get classes
    const uniqueClasses = new Set(students.map(s => `${s.class} ${s.section}`));
    
    return {
      totalStudents,
      activeStudents,
      attendanceRate,
      absentStudents,
      totalClasses: uniqueClasses.size,
      todayRecords: todayRecords.length,
    };
  }, [students, attendanceRecords]);

  // Recent activity
  const recentActivity = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const todayRecords = attendanceRecords
      .filter(r => r.date === today)
      .slice(-5)
      .reverse();
    
    return todayRecords.map(record => {
      const student = students.find(s => s.id === record.studentId);
      return {
        ...record,
        studentName: student ? `${student.firstName} ${student.lastName}` : 'Unknown',
        className: student ? `${student.class} ${student.section}` : 'Unknown',
      };
    });
  }, [students, attendanceRecords]);

  // Class breakdown
  const classBreakdown = useMemo(() => {
    const breakdown: Record<string, number> = {};
    students.forEach(s => {
      const className = `${s.class} ${s.section}`;
      breakdown[className] = (breakdown[className] || 0) + 1;
    });
    return Object.entries(breakdown)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6);
  }, [students]);

  // Attendance trend (last 7 days)
  const attendanceTrend = useMemo(() => {
    const trend = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      const dayRecords = attendanceRecords.filter(r => r.date === dateStr);
      const present = dayRecords.filter(r => r.status === 'present' || r.status === 'late').length;
      const rate = dayRecords.length > 0 ? (present / dayRecords.length) * 100 : 0;
      
      trend.push({
        date: dateStr,
        day: date.toLocaleDateString('en-US', { weekday: 'short' }),
        rate: Math.round(rate),
      });
    }
    return trend;
  }, [attendanceRecords]);

  const statusConfig = {
    present: { color: 'bg-emerald-500', label: 'Present', icon: CheckCircle },
    absent: { color: 'bg-red-500', label: 'Absent', icon: AlertCircle },
    late: { color: 'bg-amber-500', label: 'Late', icon: Clock },
    excused: { color: 'bg-blue-500', label: 'Excused', icon: CheckCircle },
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 -m-6 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-50">Dashboard</h1>
            <p className="text-slate-600 dark:text-slate-400 mt-1">
              {currentTime.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="px-4 py-2 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
              <p className="text-sm text-slate-600 dark:text-slate-400">Current Time</p>
              <p className="text-lg font-bold text-slate-900 dark:text-slate-50">
                {currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 hover:shadow-lg transition-all duration-300 group cursor-pointer"
               onClick={() => router.push('/students')}>
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl group-hover:scale-110 transition-transform">
                <Users2 className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <TrendingUp className="w-5 h-5 text-green-600" />
            </div>
            <p className="text-sm font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">Total Students</p>
            <p className="text-4xl font-bold text-slate-900 dark:text-slate-50 mt-2">{metrics.totalStudents}</p>
            <p className="text-sm text-green-600 dark:text-green-400 mt-2 font-medium">
              {metrics.activeStudents} active
            </p>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 hover:shadow-lg transition-all duration-300 group cursor-pointer"
               onClick={() => router.push('/attendance')}>
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl group-hover:scale-110 transition-transform">
                <CalendarCheck className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
              </div>
              <TrendingUp className="w-5 h-5 text-green-600" />
            </div>
            <p className="text-sm font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">Attendance Rate</p>
            <p className="text-4xl font-bold text-slate-900 dark:text-slate-50 mt-2">{metrics.attendanceRate}%</p>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">
              {metrics.todayRecords} records today
            </p>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 hover:shadow-lg transition-all duration-300 group">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-xl group-hover:scale-110 transition-transform">
                <BookOpen className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
              <Award className="w-5 h-5 text-purple-600" />
            </div>
            <p className="text-sm font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">Total Classes</p>
            <p className="text-4xl font-bold text-slate-900 dark:text-slate-50 mt-2">{metrics.totalClasses}</p>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">
              Active sections
            </p>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 hover:shadow-lg transition-all duration-300 group">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-xl group-hover:scale-110 transition-transform">
                <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
              {metrics.absentStudents > 0 ? (
                <TrendingDown className="w-5 h-5 text-red-600" />
              ) : (
                <CheckCircle className="w-5 h-5 text-green-600" />
              )}
            </div>
            <p className="text-sm font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">Absent Today</p>
            <p className="text-4xl font-bold text-slate-900 dark:text-slate-50 mt-2">{metrics.absentStudents}</p>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">
              {metrics.absentStudents === 0 ? 'All present!' : 'Needs attention'}
            </p>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Attendance Trend Chart */}
          <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-slate-50">Attendance Trend</h2>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">Last 7 days performance</p>
              </div>
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <BarChart3 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
            
            <div className="space-y-3">
              {attendanceTrend.map((day, index) => (
                <div key={index} className="flex items-center gap-4">
                  <div className="w-12 text-sm font-medium text-slate-600 dark:text-slate-400">
                    {day.day}
                  </div>
                  <div className="flex-1">
                    <div className="h-10 bg-slate-100 dark:bg-slate-700 rounded-lg overflow-hidden relative">
                      <div 
                        className={`h-full rounded-lg transition-all duration-500 ${
                          day.rate >= 95 ? 'bg-emerald-500' :
                          day.rate >= 85 ? 'bg-amber-500' :
                          'bg-red-500'
                        }`}
                        style={{ width: `${day.rate}%` }}
                      />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-sm font-bold text-slate-900 dark:text-slate-50">
                          {day.rate}%
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="w-20 text-right text-sm text-slate-600 dark:text-slate-400">
                    {new Date(day.date).getDate()}/{new Date(day.date).getMonth() + 1}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="space-y-6">
            <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl p-6 text-white">
              <h3 className="text-lg font-bold mb-4">Quick Actions</h3>
              <div className="space-y-3">
                <button
                  onClick={() => router.push('/attendance')}
                  className="w-full px-4 py-3 bg-white/20 hover:bg-white/30 rounded-xl transition-all flex items-center justify-between group"
                >
                  <span className="font-medium">Take Attendance</span>
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </button>
                <button
                  onClick={() => router.push('/students')}
                  className="w-full px-4 py-3 bg-white/20 hover:bg-white/30 rounded-xl transition-all flex items-center justify-between group"
                >
                  <span className="font-medium">Add Student</span>
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </button>
                <button
                  onClick={() => router.push('/finance')}
                  className="w-full px-4 py-3 bg-white/20 hover:bg-white/30 rounded-xl transition-all flex items-center justify-between group"
                >
                  <span className="font-medium">Create Invoice</span>
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-50">Class Distribution</h3>
                <PieChart className="w-5 h-5 text-slate-400" />
              </div>
              <div className="space-y-3">
                {classBreakdown.length === 0 ? (
                  <p className="text-sm text-slate-600 dark:text-slate-400 text-center py-4">
                    No students yet
                  </p>
                ) : (
                  classBreakdown.map(([className, count], index) => (
                    <div key={className} className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${
                        index === 0 ? 'bg-blue-500' :
                        index === 1 ? 'bg-emerald-500' :
                        index === 2 ? 'bg-purple-500' :
                        index === 3 ? 'bg-amber-500' :
                        index === 4 ? 'bg-red-500' :
                        'bg-slate-500'
                      }`} />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-slate-900 dark:text-slate-50">{className}</p>
                      </div>
                      <span className="text-sm font-bold text-slate-900 dark:text-slate-50">{count}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Recent Activity & Alerts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Activity */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-slate-50">Recent Activity</h2>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">Latest attendance records</p>
              </div>
              <Activity className="w-5 h-5 text-slate-400" />
            </div>
            
            <div className="space-y-3">
              {recentActivity.length === 0 ? (
                <div className="text-center py-8">
                  <Calendar className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                  <p className="text-slate-600 dark:text-slate-400">No attendance records yet</p>
                  <button
                    onClick={() => router.push('/attendance')}
                    className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Take Attendance
                  </button>
                </div>
              ) : (
                recentActivity.map((activity) => {
                  const config = statusConfig[activity.status as keyof typeof statusConfig];
                  const StatusIcon = config?.icon || CheckCircle;
                  
                  return (
                    <div key={activity.id} className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-700/50 rounded-xl border border-slate-200 dark:border-slate-600">
                      <div className={`w-10 h-10 rounded-full ${config?.color || 'bg-slate-500'} flex items-center justify-center`}>
                        <StatusIcon className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-slate-900 dark:text-slate-50">{activity.studentName}</p>
                        <p className="text-sm text-slate-600 dark:text-slate-400">{activity.className}</p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${config?.color || 'bg-slate-500'} text-white`}>
                        {config?.label || activity.status}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* System Alerts */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-slate-50">System Alerts</h2>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">Important notifications</p>
              </div>
              <Bell className="w-5 h-5 text-slate-400" />
            </div>
            
            <div className="space-y-3">
              {metrics.absentStudents > 0 && (
                <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-xl">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-red-900 dark:text-red-50">
                        {metrics.absentStudents} student{metrics.absentStudents > 1 ? 's' : ''} absent today
                      </p>
                      <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                        Review attendance and contact guardians if needed
                      </p>
                    </div>
                  </div>
                </div>
              )}
              
              {metrics.totalStudents === 0 && (
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-xl">
                  <div className="flex items-start gap-3">
                    <Users className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-blue-900 dark:text-blue-50">
                        No students enrolled yet
                      </p>
                      <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                        Start by adding students to the system
                      </p>
                      <button
                        onClick={() => router.push('/test-data')}
                        className="mt-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        Add test students →
                      </button>
                    </div>
                  </div>
                </div>
              )}
              
              {metrics.totalStudents > 0 && metrics.todayRecords === 0 && (
                <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl">
                  <div className="flex items-start gap-3">
                    <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-amber-900 dark:text-amber-50">
                        No attendance taken today
                      </p>
                      <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                        Take attendance to track student presence
                      </p>
                    </div>
                  </div>
                </div>
              )}
              
              {metrics.totalStudents > 0 && metrics.todayRecords > 0 && metrics.absentStudents === 0 && (
                <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-700 rounded-xl">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-emerald-900 dark:text-emerald-50">
                        All systems operational
                      </p>
                      <p className="text-sm text-emerald-700 dark:text-emerald-300 mt-1">
                        No critical alerts at this time
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
