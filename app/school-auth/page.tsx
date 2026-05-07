"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSchool } from '@/lib/school-context';
import { Building2, Mail, Phone, MapPin, ArrowRight, School, CheckCircle } from 'lucide-react';

export default function SchoolAuthPage() {
  const router = useRouter();
  const { schools, addSchool, setCurrentSchool } = useSchool();
  const [mode, setMode] = useState<'select' | 'register'>('select');
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    phone: '',
    email: '',
  });

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.email) {
      alert('Please fill in school name and email');
      return;
    }

    const newSchool = addSchool(formData);
    setCurrentSchool(newSchool);
    router.push('/dashboard');
  };

  const handleSelectSchool = (schoolId: string) => {
    const school = schools.find(s => s.id === schoolId);
    if (school) {
      setCurrentSchool(school);
      router.push('/dashboard');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 flex items-center justify-center p-4">
      <div className="max-w-6xl w-full grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Side - Branding */}
        <div className="flex flex-col justify-center space-y-6 text-center lg:text-left">
          <div className="flex items-center justify-center lg:justify-start gap-3">
            <div className="p-3 bg-blue-600 rounded-2xl">
              <School className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-4xl font-bold text-slate-900 dark:text-white">
              School Management SaaS
            </h1>
          </div>
          
          <p className="text-xl text-slate-600 dark:text-slate-300">
            Complete school management solution for modern educational institutions
          </p>

          <div className="space-y-4 pt-6">
            {[
              'Student & Staff Management',
              'Attendance Tracking',
              'Exam & Marks Management',
              'Performance Analytics',
              'Finance Management',
              'Communication Tools',
            ].map((feature, index) => (
              <div key={index} className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span className="text-slate-700 dark:text-slate-300">{feature}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right Side - Auth Form */}
        <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl p-8">
          <div className="flex gap-2 mb-6">
            <button
              onClick={() => setMode('select')}
              className={`flex-1 px-4 py-3 rounded-xl font-semibold transition-all ${
                mode === 'select'
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
              }`}
            >
              Select School
            </button>
            <button
              onClick={() => setMode('register')}
              className={`flex-1 px-4 py-3 rounded-xl font-semibold transition-all ${
                mode === 'register'
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
              }`}
            >
              Register New School
            </button>
          </div>

          {mode === 'select' ? (
            <div className="space-y-4">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">
                Select Your School
              </h2>
              
              {schools.length === 0 ? (
                <div className="text-center py-12">
                  <Building2 className="w-16 h-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
                  <p className="text-slate-600 dark:text-slate-400 mb-4">
                    No schools registered yet
                  </p>
                  <button
                    onClick={() => setMode('register')}
                    className="px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors"
                  >
                    Register Your School
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {schools.map((school) => (
                    <button
                      key={school.id}
                      onClick={() => handleSelectSchool(school.id)}
                      className="w-full p-4 border-2 border-slate-200 dark:border-slate-600 rounded-xl hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all text-left group"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-lg font-bold text-slate-900 dark:text-white group-hover:text-blue-600">
                            {school.name}
                          </h3>
                          <p className="text-sm text-slate-600 dark:text-slate-400">
                            {school.email}
                          </p>
                        </div>
                        <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <form onSubmit={handleRegister} className="space-y-4">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">
                Register Your School
              </h2>

              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  <Building2 className="w-4 h-4 inline mr-2" />
                  School Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Springfield High School"
                  className="w-full px-4 py-3 border-2 border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  <Mail className="w-4 h-4 inline mr-2" />
                  Email Address *
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="admin@school.com"
                  className="w-full px-4 py-3 border-2 border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  <Phone className="w-4 h-4 inline mr-2" />
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+1 (555) 123-4567"
                  className="w-full px-4 py-3 border-2 border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  <MapPin className="w-4 h-4 inline mr-2" />
                  Address
                </label>
                <textarea
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="123 Education Street, City, State, ZIP"
                  rows={3}
                  className="w-full px-4 py-3 border-2 border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <button
                type="submit"
                className="w-full px-6 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-bold text-lg shadow-lg transition-all"
              >
                Register School & Continue
              </button>

              <p className="text-sm text-slate-600 dark:text-slate-400 text-center">
                By registering, you agree to our Terms of Service and Privacy Policy
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
