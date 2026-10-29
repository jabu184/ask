import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { adminApi, surveyApi } from '../services/api';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import {
  ShieldCheck,
  Users,
  FileText,
  MessageSquare,
  HelpCircle,
  TrendingUp,
  LineChart,
  Search,
  RefreshCw,
  ExternalLink,
  BarChart2,
  Edit2,
  Trash2,
  CheckCircle,
  XCircle,
  AlertTriangle,
  X,
  Lock,
  Mail,
  Calendar,
  Layers,
  ArrowUpRight,
  CopyPlus
} from 'lucide-react';

// Register Chart.js components for Line charts
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('users'); // 'users' | 'surveys' | 'polls' | 'activity'
  const [stats, setStats] = useState(null);
  const [trends, setTrends] = useState(null);
  const [trendModal, setTrendModal] = useState(null); // { type: 'users'|'surveys'|'polls'|'responses'|'questions', viewMode: 'cumulative'|'daily' }
  const [recentUsers, setRecentUsers] = useState([]);
  const [recentResponses, setRecentResponses] = useState([]);
  const [users, setUsers] = useState([]);
  const [surveys, setSurveys] = useState([]);
  const [polls, setPolls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Search & filter states
  const [userSearch, setUserSearch] = useState('');
  const [surveySearch, setSurveySearch] = useState('');
  const [surveyStatusFilter, setSurveyStatusFilter] = useState('all');
  const [pollSearch, setPollSearch] = useState('');
  const [pollStatusFilter, setPollStatusFilter] = useState('all');

  // Modal states
  const [viewingUser, setViewingUser] = useState(null); // for user details & surveys modal
  const [editingUser, setEditingUser] = useState(null); // for edit user modal
  const [editingSurvey, setEditingSurvey] = useState(null); // for edit survey modal
  const [deletingTarget, setDeletingTarget] = useState(null); // { type: 'user'|'survey', item }

  // Form states for edit user
  const [editUserEmail, setEditUserEmail] = useState('');
  const [editUserPassword, setEditUserPassword] = useState('');
  const [submittingUserEdit, setSubmittingUserEdit] = useState(false);

  // Form states for edit survey
  const [editSurveyTitle, setEditSurveyTitle] = useState('');
  const [editSurveyDesc, setEditSurveyDesc] = useState('');
  const [editSurveyActive, setEditSurveyActive] = useState(true);
  const [submittingSurveyEdit, setSubmittingSurveyEdit] = useState(false);

  // Action loading indicators
  const [actionLoading, setActionLoading] = useState(false);

  const fetchOverview = async () => {
    try {
      const data = await adminApi.getStats();
      setStats(data.stats);
      setTrends(data.trends || null);
      setRecentUsers(data.recentUsers || []);
      setRecentResponses(data.recentResponses || []);
    } catch (err) {
      console.error('Failed to load admin stats:', err);
      setError(err.response?.data?.error || 'Failed to load administrative statistics');
    }
  };

  const TREND_CONFIGS = {
    users: {
      title: 'Registered Creators Trend',
      subtitle: 'Growth of creator accounts registered over time',
      color: '#2563eb',
      bgGradient: 'rgba(37, 99, 235, 0.12)',
      unit: 'creators',
      icon: Users,
      iconBg: 'bg-blue-50 text-blue-600',
      total: stats?.totalUsers || 0
    },
    surveys: {
      title: 'Surveys Published Trend',
      subtitle: 'Number of questionnaires authored over time',
      color: '#7c3aed',
      bgGradient: 'rgba(124, 58, 237, 0.12)',
      unit: 'surveys',
      icon: FileText,
      iconBg: 'bg-purple-50 text-purple-600',
      total: stats?.totalSurveys || 0
    },
    polls: {
      title: 'Live Polls Created',
      subtitle: 'Number of interactive polls created over time',
      color: '#0284c7',
      bgGradient: 'rgba(2, 132, 199, 0.12)',
      unit: 'polls',
      icon: Layers,
      iconBg: 'bg-sky-50 text-sky-600',
      total: stats?.totalPolls || 0
    },
    responses: {
      title: 'Survey Responses Trend',
      subtitle: 'Submissions collected platform-wide over time',
      color: '#059669',
      bgGradient: 'rgba(5, 150, 105, 0.12)',
      unit: 'responses',
      icon: MessageSquare,
      iconBg: 'bg-emerald-50 text-emerald-600',
      total: stats?.totalResponses || 0
    },
    questions: {
      title: 'Questions Configured Trend',
      subtitle: 'Volume of survey questions created over time',
      color: '#d97706',
      bgGradient: 'rgba(217, 119, 6, 0.12)',
      unit: 'questions',
      icon: HelpCircle,
      iconBg: 'bg-amber-50 text-amber-600',
      total: stats?.totalQuestions || 0
    }
  };

  const openTrendModal = (type) => {
    setTrendModal({ type, viewMode: 'cumulative' });
  };

  const getTrendChartData = () => {
    if (!trendModal || !trends) return null;
    const config = TREND_CONFIGS[trendModal.type];
    const rawData = trends[trendModal.type] || [];

    if (rawData.length === 0) {
      return {
        labels: ['No Activity Recorded Yet'],
        datasets: [{
          label: config.title,
          data: [0],
          borderColor: config.color,
          backgroundColor: config.bgGradient,
          fill: true,
          tension: 0.3
        }]
      };
    }

    let running = 0;
    const sorted = [...rawData].sort((a, b) => a.date.localeCompare(b.date));

    const labels = sorted.map(item => {
      const parts = item.date.split('-');
      if (parts.length === 3) {
        const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
        return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      }
      return item.date;
    });

    const values = sorted.map(item => {
      if (trendModal.viewMode === 'cumulative') {
        running += item.count;
        return running;
      }
      return item.count;
    });

    return {
      labels,
      datasets: [
        {
          label: trendModal.viewMode === 'cumulative' ? `Cumulative Total (${config.unit})` : `New on this Date (${config.unit})`,
          data: values,
          borderColor: config.color,
          backgroundColor: config.bgGradient,
          fill: true,
          tension: 0.35,
          borderWidth: 2.5,
          pointBackgroundColor: config.color,
          pointBorderColor: '#ffffff',
          pointBorderWidth: 2,
          pointRadius: values.length === 1 ? 6 : 4,
          pointHoverRadius: 7
        }
      ]
    };
  };

  const getTrendChartOptions = () => {
    if (!trendModal) return {};
    const config = TREND_CONFIGS[trendModal.type];
    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          backgroundColor: '#0f172a',
          titleColor: '#ffffff',
          bodyColor: '#f8fafc',
          padding: 12,
          cornerRadius: 8,
          titleFont: { size: 12, weight: 'bold' },
          bodyFont: { size: 12 },
          callbacks: {
            label: (context) => {
              return ` ${context.parsed.y} ${config.unit} (${trendModal.viewMode === 'cumulative' ? 'total to date' : 'this date'})`;
            }
          }
        }
      },
      scales: {
        x: {
          grid: {
            display: false
          },
          ticks: {
            color: '#64748b',
            font: { size: 11 }
          }
        },
        y: {
          beginAtZero: true,
          grid: {
            color: '#f1f5f9'
          },
          ticks: {
            precision: 0,
            color: '#64748b',
            font: { size: 11 }
          }
        }
      }
    };
  };

  const fetchUsers = async () => {
    try {
      const data = await adminApi.getUsers(userSearch);
      setUsers(data.users || []);
    } catch (err) {
      console.error('Failed to load users:', err);
      setError(err.response?.data?.error || 'Failed to load users');
    }
  };

  const fetchSurveys = async () => {
    try {
      const data = await adminApi.getSurveys(surveySearch, surveyStatusFilter);
      setSurveys(data.surveys || []);
    } catch (err) {
      console.error('Failed to load surveys:', err);
      setError(err.response?.data?.error || 'Failed to load surveys');
    }
  };

  const fetchPolls = async () => {
    try {
      const data = await adminApi.getPolls(pollSearch, pollStatusFilter);
      setPolls(data.polls || []);
    } catch (err) {
      console.error('Failed to load polls:', err);
      setError(err.response?.data?.error || 'Failed to load polls');
    }
  };

  const loadAll = async () => {
    setLoading(true);
    setError('');
    try {
      await Promise.all([fetchOverview(), fetchUsers(), fetchSurveys(), fetchPolls()]);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([fetchOverview(), fetchUsers(), fetchSurveys(), fetchPolls()]);
      showSuccess('Data refreshed successfully');
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  // Re-fetch users when search changes (with slight debounce)
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchUsers();
    }, 300);
    return () => clearTimeout(timer);
  }, [userSearch]);

  // Re-fetch surveys when survey search or filter changes
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchSurveys();
    }, 300);
    return () => clearTimeout(timer);
  }, [surveySearch, surveyStatusFilter]);

  // Re-fetch polls when poll search or filter changes
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchPolls();
    }, 300);
    return () => clearTimeout(timer);
  }, [pollSearch, pollStatusFilter]);

  const showSuccess = (msg) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(''), 4000);
  };

  // Toggle survey status directly from survey list
  const handleToggleSurveyStatus = async (survey) => {
    try {
      const newStatus = survey.is_active === 1 ? false : true;
      await adminApi.updateSurvey(survey.id, { is_active: newStatus });
      setSurveys(prev =>
        prev.map(s => s.id === survey.id ? { ...s, is_active: newStatus ? 1 : 0 } : s)
      );
      if (viewingUser && viewingUser.surveys) {
        setViewingUser(prev => ({
          ...prev,
          surveys: prev.surveys.map(s => s.id === survey.id ? { ...s, is_active: newStatus ? 1 : 0 } : s)
        }));
      }
      fetchOverview();
      showSuccess(`Survey status changed to ${newStatus ? 'Active' : 'Closed'}`);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to update survey status');
    }
  };

  // Open user details modal
  const handleViewUser = async (user) => {
    try {
      const details = await adminApi.getUser(user.id);
      setViewingUser(details);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to fetch user details');
    }
  };

  // Open edit user modal
  const handleOpenEditUser = (user) => {
    setEditingUser(user);
    setEditUserEmail(user.email);
    setEditUserPassword('');
  };

  const handleSaveUserEdit = async (e) => {
    e.preventDefault();
    if (!editingUser) return;
    setSubmittingUserEdit(true);
    try {
      const payload = { email: editUserEmail };
      if (editUserPassword) {
        payload.password = editUserPassword;
      }
      await adminApi.updateUser(editingUser.id, payload);
      setEditingUser(null);
      fetchUsers();
      showSuccess('User updated successfully');
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to update user');
    } finally {
      setSubmittingUserEdit(false);
    }
  };

  // Open edit survey modal
  const handleOpenEditSurvey = (survey) => {
    setEditingSurvey(survey);
    setEditSurveyTitle(survey.title || '');
    setEditSurveyDesc(survey.description || '');
    setEditSurveyActive(survey.is_active === 1);
  };

  const handleSaveSurveyEdit = async (e) => {
    e.preventDefault();
    if (!editingSurvey) return;
    setSubmittingSurveyEdit(true);
    try {
      await adminApi.updateSurvey(editingSurvey.id, {
        title: editSurveyTitle,
        description: editSurveyDesc,
        is_active: editSurveyActive
      });
      setEditingSurvey(null);
      fetchSurveys();
      fetchOverview();
      showSuccess('Survey updated successfully');
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to update survey');
    } finally {
      setSubmittingSurveyEdit(false);
    }
  };

  // Duplicate survey handler
  const handleDuplicateSurvey = async (s) => {
    try {
      setActionLoading(true);
      const res = await surveyApi.duplicate(s.id);
      await Promise.all([fetchOverview(), fetchSurveys(), fetchUsers()]);
      if (viewingUser) {
        const updated = await adminApi.getUser(viewingUser.user.id);
        setViewingUser(updated);
      }
      showSuccess(`Survey "${s.title}" duplicated successfully as "${res.survey.title}".`);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to duplicate survey');
    } finally {
      setActionLoading(false);
    }
  };

  // Confirm delete handler
  const handleConfirmDelete = async () => {
    if (!deletingTarget) return;
    setActionLoading(true);
    try {
      if (deletingTarget.type === 'user') {
        await adminApi.deleteUser(deletingTarget.item.id);
        setDeletingTarget(null);
        if (viewingUser?.user?.id === deletingTarget.item.id) {
          setViewingUser(null);
        }
        await Promise.all([fetchOverview(), fetchUsers(), fetchSurveys()]);
        showSuccess(`User "${deletingTarget.item.email}" and all associated data deleted.`);
      } else if (deletingTarget.type === 'survey') {
        await adminApi.deleteSurvey(deletingTarget.item.id);
        setDeletingTarget(null);
        if (viewingUser) {
          setViewingUser(prev => ({
            ...prev,
            surveys: prev.surveys.filter(s => s.id !== deletingTarget.item.id)
          }));
        }
        await Promise.all([fetchOverview(), fetchSurveys(), fetchUsers()]);
        showSuccess(`Survey "${deletingTarget.item.title}" deleted.`);
      } else if (deletingTarget.type === 'poll') {
        await adminApi.deletePoll(deletingTarget.item.id);
        setDeletingTarget(null);
        if (viewingUser) {
          setViewingUser(prev => ({
            ...prev,
            surveys: prev.surveys.filter(s => s.id !== deletingTarget.item.id)
          }));
        }
        await Promise.all([fetchOverview(), fetchPolls(), fetchUsers()]);
        showSuccess(`Poll "${deletingTarget.item.title}" deleted.`);
      }
    } catch (err) {
      alert(err.response?.data?.error || 'Delete operation failed');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center space-y-4">
        <div className="w-10 h-10 border-3 border-brand-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-medium text-slate-500">Loading Administrator Portal...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
      {/* Top Banner / Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-6 border-b border-slate-200 mb-8">
        <div>
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-brand-50 text-brand-600 rounded-xl border border-brand-100 shadow-sm">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">Admin Control Center</h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
                  ADMIN ONLY
                </span>
              </div>
              <p className="text-sm text-slate-500 mt-0.5">
                Authenticated as <span className="font-semibold text-slate-700">jb@urspace.com</span>. Global system oversight and creator management.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="inline-flex items-center space-x-2 px-3.5 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 hover:border-slate-300 shadow-sm transition disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
          </button>
          <Link
            to="/dashboard"
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 text-sm font-semibold text-white bg-brand-600 hover:bg-brand-700 rounded-lg shadow-sm transition"
          >
            <span>My Dashboard</span>
            <ArrowUpRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* Notifications */}
      {error && (
        <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 flex items-start space-x-3 text-red-700 text-sm">
          <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div className="flex-1">{error}</div>
          <button onClick={() => setError('')} className="text-red-500 hover:text-red-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {successMessage && (
        <div className="mb-6 p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center space-x-3 text-emerald-800 text-sm animate-fadeIn">
          <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          <span className="font-medium">{successMessage}</span>
        </div>
      )}

      {/* KPI Stat Cards */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
          {/* Card 1: Total Users */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow transition">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Creators</span>
              <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                <Users className="w-5 h-5" />
              </div>
            </div>
            <div className="flex items-baseline justify-between mt-3">
              <p className="text-2xl sm:text-3xl font-bold text-slate-900">{stats.totalUsers}</p>
              <button
                onClick={() => openTrendModal('users')}
                className="inline-flex items-center space-x-1 text-xs font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200/60 px-2 py-1 rounded-lg transition"
                title="View registration timeline"
              >
                <LineChart className="w-3.5 h-3.5" />
                <span>Stats</span>
              </button>
            </div>
            <div className="flex items-center justify-between text-xs text-slate-500 mt-3 pt-3 border-t border-slate-100">
              <span>Avg {stats.avgSurveysPerUser} surveys / user</span>
            </div>
          </div>

          {/* Card 2: Total Surveys */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow transition">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Surveys</span>
              <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
                <FileText className="w-5 h-5" />
              </div>
            </div>
            <div className="flex items-baseline justify-between mt-3">
              <p className="text-2xl sm:text-3xl font-bold text-slate-900">{stats.totalSurveys}</p>
              <button
                onClick={() => openTrendModal('surveys')}
                className="inline-flex items-center space-x-1 text-xs font-semibold text-purple-600 hover:text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200/60 px-2 py-1 rounded-lg transition"
                title="View survey creation timeline"
              >
                <LineChart className="w-3.5 h-3.5" />
                <span>Stats</span>
              </button>
            </div>
            <div className="flex items-center space-x-2 text-xs text-slate-600 mt-3 pt-3 border-t border-slate-100">
              <span className="inline-flex items-center text-emerald-600 font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5"></span>
                {stats.activeSurveys} Active
              </span>
              <span className="text-slate-300">•</span>
              <span className="inline-flex items-center text-slate-500">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400 mr-1.5"></span>
                {stats.inactiveSurveys} Closed
              </span>
            </div>
          </div>

          {/* Card 3: Total Polls */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow transition">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Polls</span>
              <div className="p-2 bg-sky-50 text-sky-600 rounded-lg">
                <Layers className="w-5 h-5" />
              </div>
            </div>
            <div className="flex items-baseline justify-between mt-3">
              <p className="text-2xl sm:text-3xl font-bold text-slate-900">{stats.totalPolls || 0}</p>
              <button
                onClick={() => openTrendModal('polls')}
                className="inline-flex items-center space-x-1 text-xs font-semibold text-sky-600 hover:text-sky-700 bg-sky-50 hover:bg-sky-100 border border-sky-200/60 px-2 py-1 rounded-lg transition"
                title="View poll creation timeline"
              >
                <LineChart className="w-3.5 h-3.5" />
                <span>Stats</span>
              </button>
            </div>
            <div className="flex items-center space-x-2 text-xs text-slate-600 mt-3 pt-3 border-t border-slate-100">
              <span className="inline-flex items-center text-emerald-600 font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5"></span>
                {stats.activePolls || 0} Live
              </span>
              <span className="text-slate-300">•</span>
              <span className="inline-flex items-center text-slate-500">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400 mr-1.5"></span>
                {(stats.draftPolls || 0) + (stats.closedPolls || 0)} Draft/Closed
              </span>
            </div>
          </div>

          {/* Card 4: Total Responses */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow transition">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Responses</span>
              <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                <MessageSquare className="w-5 h-5" />
              </div>
            </div>
            <div className="flex items-baseline justify-between mt-3">
              <p className="text-2xl sm:text-3xl font-bold text-slate-900">{stats.totalResponses}</p>
              <button
                onClick={() => openTrendModal('responses')}
                className="inline-flex items-center space-x-1 text-xs font-semibold text-emerald-600 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200/60 px-2 py-1 rounded-lg transition"
                title="View response submission timeline"
              >
                <LineChart className="w-3.5 h-3.5" />
                <span>Stats</span>
              </button>
            </div>
            <div className="flex items-center justify-between text-xs text-slate-500 mt-3 pt-3 border-t border-slate-100">
              <span>Surveys & live polls</span>
            </div>
          </div>

          {/* Card 5: Total Questions */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow transition">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Questions Built</span>
              <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
                <HelpCircle className="w-5 h-5" />
              </div>
            </div>
            <div className="flex items-baseline justify-between mt-3">
              <p className="text-2xl sm:text-3xl font-bold text-slate-900">{stats.totalQuestions}</p>
              <button
                onClick={() => openTrendModal('questions')}
                className="inline-flex items-center space-x-1 text-xs font-semibold text-amber-600 hover:text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200/60 px-2 py-1 rounded-lg transition"
                title="View question creation timeline"
              >
                <LineChart className="w-3.5 h-3.5" />
                <span>Stats</span>
              </button>
            </div>
            <div className="flex items-center justify-between text-xs text-slate-500 mt-3 pt-3 border-t border-slate-100">
              <span>Surveys & live polls</span>
            </div>
          </div>

          {/* Card 6: Response Emails Sent */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow transition">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Emails Sent</span>
              <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                <Mail className="w-5 h-5" />
              </div>
            </div>
            <div className="flex items-baseline justify-between mt-3">
              <p className="text-2xl sm:text-3xl font-bold text-slate-900">{stats.totalEmailsSent || 0}</p>
            </div>
            <div className="flex items-center justify-between text-xs text-slate-500 mt-3 pt-3 border-t border-slate-100">
              <span>Notifications sent</span>
            </div>
          </div>
        </div>
      )}

      {/* Tabs Control */}
      <div className="flex items-center space-x-2 border-b border-slate-200 mb-6">
        <button
          onClick={() => setActiveTab('users')}
          className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition flex items-center space-x-2 ${
            activeTab === 'users'
              ? 'border-brand-600 text-brand-600'
              : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>User Accounts ({users.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('surveys')}
          className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition flex items-center space-x-2 ${
            activeTab === 'surveys'
              ? 'border-brand-600 text-brand-600'
              : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>All Surveys ({surveys.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('polls')}
          className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition flex items-center space-x-2 ${
            activeTab === 'polls'
              ? 'border-brand-600 text-brand-600'
              : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>All Polls ({polls.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('activity')}
          className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition flex items-center space-x-2 ${
            activeTab === 'activity'
              ? 'border-brand-600 text-brand-600'
              : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          <span>Recent Activity</span>
        </button>
      </div>

      {/* TAB 1: USERS MANAGEMENT */}
      {activeTab === 'users' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {/* User Search Bar */}
          <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                placeholder="Search users by email..."
                className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-600 bg-white"
              />
              {userSearch && (
                <button
                  onClick={() => setUserSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="text-xs text-slate-500 font-medium">
              Showing {users.length} registered {users.length === 1 ? 'user' : 'users'}
            </div>
          </div>

          {/* Users Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-100/75 text-xs uppercase font-bold text-slate-600 tracking-wider border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3.5">User Email</th>
                  <th className="px-6 py-3.5">Joined Date</th>
                  <th className="px-6 py-3.5 text-center">Surveys</th>
                  <th className="px-6 py-3.5 text-center">Responses</th>
                  <th className="px-6 py-3.5 text-center">Emails Sent</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-12 text-center text-slate-500">
                      No users match the search criteria.
                    </td>
                  </tr>
                ) : (
                  users.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50/80 transition">
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-2">
                          <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 font-bold text-xs uppercase">
                            {u.email[0]}
                          </div>
                          <div>
                            <div className="font-semibold text-slate-900 flex items-center space-x-1.5">
                              <span>{u.email}</span>
                              {u.is_admin && (
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                                  ADMIN
                                </span>
                              )}
                            </div>
                            <span className="text-xs text-slate-400">ID: {u.id}</span>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap text-slate-500 text-xs">
                        {new Date(u.created_at).toLocaleDateString(undefined, {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </td>

                      <td className="px-6 py-4 text-center">
                        <div className="flex flex-col items-center gap-1">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">
                            {u.survey_count} surveys
                          </span>
                          {u.poll_count > 0 && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-sky-50 text-sky-700 border border-sky-200">
                              {u.poll_count} polls
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="px-6 py-4 text-center font-semibold text-slate-900">
                        {u.response_count}
                      </td>

                      <td className="px-6 py-4 text-center">
                        <span
                          className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200"
                          title="Response notification emails sent to this creator"
                        >
                          <Mail className="w-3.5 h-3.5 text-blue-500" />
                          <span>{u.emails_sent || 0}</span>
                        </span>
                      </td>

                      <td className="px-6 py-4 text-right whitespace-nowrap space-x-2">
                        <button
                          onClick={() => handleViewUser(u)}
                          title="View user's surveys and live polls"
                          className="px-2.5 py-1.5 text-xs font-semibold text-brand-700 bg-brand-50 hover:bg-brand-100 border border-brand-200 rounded-lg transition"
                        >
                          View Surveys & Polls ({u.total_items_count ?? (u.survey_count + (u.poll_count || 0))})
                        </button>

                        <button
                          onClick={() => handleOpenEditUser(u)}
                          title="Edit user credentials"
                          className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => setDeletingTarget({ type: 'user', item: u })}
                          disabled={u.is_admin}
                          title={u.is_admin ? "Cannot delete primary admin account" : "Delete user and all surveys"}
                          className={`p-1.5 rounded-lg transition ${
                            u.is_admin
                              ? 'text-slate-300 cursor-not-allowed'
                              : 'text-slate-400 hover:text-red-600 hover:bg-red-50'
                          }`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: ALL SURVEYS MANAGEMENT */}
      {activeTab === 'surveys' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {/* Survey Controls Bar */}
          <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={surveySearch}
                onChange={(e) => setSurveySearch(e.target.value)}
                placeholder="Filter by title, description or author..."
                className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-600 bg-white"
              />
              {surveySearch && (
                <button
                  onClick={() => setSurveySearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center space-x-2">
              <span className="text-xs font-semibold text-slate-500 uppercase">Status:</span>
              <select
                value={surveyStatusFilter}
                onChange={(e) => setSurveyStatusFilter(e.target.value)}
                className="text-xs font-semibold px-3 py-2 rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-600 text-slate-700"
              >
                <option value="all">All Surveys</option>
                <option value="active">Active Only</option>
                <option value="inactive">Closed Only</option>
              </select>
            </div>
          </div>

          {/* Surveys Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-100/75 text-xs uppercase font-bold text-slate-600 tracking-wider border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3.5">Survey Title</th>
                  <th className="px-6 py-3.5">Author</th>
                  <th className="px-6 py-3.5 text-center">Status</th>
                  <th className="px-6 py-3.5 text-center">Questions</th>
                  <th className="px-6 py-3.5 text-center">Responses</th>
                  <th className="px-6 py-3.5">Created</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {surveys.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-6 py-12 text-center text-slate-500">
                      No surveys found matching filters.
                    </td>
                  </tr>
                ) : (
                  surveys.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50/80 transition">
                      <td className="px-6 py-4">
                        <div className="font-semibold text-slate-900 max-w-xs truncate" title={s.title}>
                          {s.title}
                        </div>
                        {s.description && (
                          <div className="text-xs text-slate-400 max-w-xs truncate" title={s.description}>
                            {s.description}
                          </div>
                        )}
                        <span className="text-[11px] text-slate-400 font-mono">/s/{s.id}</span>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-xs font-medium text-slate-700">{s.author_email}</span>
                      </td>

                      <td className="px-6 py-4 text-center whitespace-nowrap">
                        <button
                          onClick={() => handleToggleSurveyStatus(s)}
                          title="Click to toggle status"
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold cursor-pointer transition ${
                            s.is_active === 1
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                              : 'bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                              s.is_active === 1 ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'
                            }`}
                          ></span>
                          {s.is_active === 1 ? 'Active' : 'Closed'}
                        </button>
                      </td>

                      <td className="px-6 py-4 text-center font-medium text-slate-700">
                        {s.question_count}
                      </td>

                      <td className="px-6 py-4 text-center font-bold text-slate-900">
                        {s.response_count}
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-500">
                        {new Date(s.created_at).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </td>

                      <td className="px-6 py-4 text-right whitespace-nowrap space-x-1.5">
                        <a
                          href={`/s/${s.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Open public survey"
                          className="p-1.5 text-slate-400 hover:text-brand-600 hover:bg-slate-100 rounded-lg inline-flex items-center transition"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>

                        <Link
                          to={`/surveys/${s.id}/analytics`}
                          title="View survey analytics & individual responses"
                          className="p-1.5 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg inline-flex items-center transition"
                        >
                          <BarChart2 className="w-4 h-4" />
                        </Link>

                        <button
                          onClick={() => handleOpenEditSurvey(s)}
                          title="Edit survey title & description"
                          className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg inline-flex items-center transition"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => handleDuplicateSurvey(s)}
                          title="Duplicate survey"
                          className="p-1.5 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg inline-flex items-center transition"
                        >
                          <CopyPlus className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => setDeletingTarget({ type: 'survey', item: s })}
                          title="Delete survey"
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg inline-flex items-center transition"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: ALL POLLS MANAGEMENT */}
      {activeTab === 'polls' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {/* Poll Controls Bar */}
          <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={pollSearch}
                onChange={(e) => setPollSearch(e.target.value)}
                placeholder="Filter by title, description, code or author..."
                className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-600 bg-white"
              />
              {pollSearch && (
                <button
                  onClick={() => setPollSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center space-x-2">
              <span className="text-xs font-semibold text-slate-500 uppercase">Status:</span>
              <select
                value={pollStatusFilter}
                onChange={(e) => setPollStatusFilter(e.target.value)}
                className="text-xs font-semibold px-3 py-2 rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-600 text-slate-700"
              >
                <option value="all">All Polls</option>
                <option value="live">Live Only</option>
                <option value="draft">Draft Only</option>
                <option value="closed">Closed Only</option>
              </select>
            </div>
          </div>

          {/* Polls Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-100/75 text-xs uppercase font-bold text-slate-600 tracking-wider border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3.5">Poll Title</th>
                  <th className="px-6 py-3.5">Author</th>
                  <th className="px-6 py-3.5 text-center">Status</th>
                  <th className="px-6 py-3.5 text-center">Questions</th>
                  <th className="px-6 py-3.5 text-center">Votes Recorded</th>
                  <th className="px-6 py-3.5">Created</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {polls.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-6 py-12 text-center text-slate-500">
                      No polls found matching filters.
                    </td>
                  </tr>
                ) : (
                  polls.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/80 transition">
                      <td className="px-6 py-4">
                        <div className="font-semibold text-slate-900 max-w-xs truncate" title={p.title}>
                          {p.title}
                        </div>
                        {p.description && (
                          <div className="text-xs text-slate-400 max-w-xs truncate" title={p.description}>
                            {p.description}
                          </div>
                        )}
                        <span className="text-[11px] text-slate-400 font-mono">PIN: {p.code} • /join/{p.code}</span>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-xs font-medium text-slate-700">{p.author_email}</span>
                      </td>

                      <td className="px-6 py-4 text-center whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                            p.status === 'live'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : p.status === 'draft'
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : 'bg-slate-100 text-slate-600 border border-slate-200'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                              p.status === 'live' ? 'bg-emerald-500 animate-pulse' : p.status === 'draft' ? 'bg-amber-500' : 'bg-slate-400'
                            }`}
                          ></span>
                          {p.status ? p.status.charAt(0).toUpperCase() + p.status.slice(1) : 'Draft'}
                        </span>
                      </td>

                      <td className="px-6 py-4 text-center font-medium text-slate-700">
                        {p.question_count}
                      </td>

                      <td className="px-6 py-4 text-center font-bold text-slate-900">
                        {p.response_count}
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-500">
                        {new Date(p.created_at).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </td>

                      <td className="px-6 py-4 text-right whitespace-nowrap space-x-1.5">
                        <a
                          href={`/join/${p.code}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Open participant join screen"
                          className="p-1.5 text-slate-400 hover:text-brand-600 hover:bg-slate-100 rounded-lg inline-flex items-center transition"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>

                        <a
                          href={`/p/${p.code}/present`}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Open presenter view"
                          className="p-1.5 text-slate-400 hover:text-sky-600 hover:bg-sky-50 rounded-lg inline-flex items-center transition"
                        >
                          <Layers className="w-4 h-4" />
                        </a>

                        <Link
                          to={`/polls/${p.id}/host`}
                          title="Open host controller"
                          className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg inline-flex items-center transition"
                        >
                          <ShieldCheck className="w-4 h-4" />
                        </Link>

                        <Link
                          to={`/polls/${p.id}/analytics`}
                          title="View poll results & analytics"
                          className="p-1.5 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg inline-flex items-center transition"
                        >
                          <BarChart2 className="w-4 h-4" />
                        </Link>

                        <button
                          onClick={() => setDeletingTarget({ type: 'poll', item: p })}
                          title="Delete poll"
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg inline-flex items-center transition"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: RECENT ACTIVITY */}
      {activeTab === 'activity' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Latest Creator Registrations */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                <Users className="w-5 h-5 text-brand-600" />
                <span>Latest Registered Creators</span>
              </h3>
              <span className="text-xs text-slate-400">Last 5 signups</span>
            </div>

            <div className="divide-y divide-slate-100">
              {recentUsers.length === 0 ? (
                <p className="py-6 text-sm text-center text-slate-400">No users registered yet.</p>
              ) : (
                recentUsers.map((ru) => (
                  <div key={ru.id} className="py-3 flex items-center justify-between text-sm">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-xs text-slate-600">
                        {ru.email[0].toUpperCase()}
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900">{ru.email}</p>
                        <p className="text-xs text-slate-400 font-mono">ID: {ru.id}</p>
                      </div>
                    </div>
                    <div className="text-right text-xs text-slate-500">
                      {new Date(ru.created_at).toLocaleString()}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Latest Submissions (Surveys & Polls) */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                <MessageSquare className="w-5 h-5 text-emerald-600" />
                <span>Latest Submissions & Votes</span>
              </h3>
              <span className="text-xs text-slate-400">Latest platform activity</span>
            </div>

            <div className="divide-y divide-slate-100">
              {recentResponses.length === 0 ? (
                <p className="py-6 text-sm text-center text-slate-400">No submissions recorded yet.</p>
              ) : (
                recentResponses.map((rr) => (
                  <div key={rr.id} className="py-3 flex items-center justify-between text-sm">
                    <div>
                      <div className="flex items-center space-x-2">
                        <p className="font-semibold text-slate-900">{rr.survey_title}</p>
                        <span
                          className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                            rr.type === 'poll'
                              ? 'bg-sky-50 text-sky-700 border border-sky-200'
                              : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          }`}
                        >
                          {rr.type === 'poll' ? 'Poll Vote' : 'Survey'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500">Creator: {rr.author_email}</p>
                    </div>
                    <div className="text-right">
                      <span className="inline-block px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        Received
                      </span>
                      <p className="text-xs text-slate-400 mt-1">
                        {new Date(rr.submitted_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ================= MODALS ================= */}

      {/* MODAL 1: VIEW USER'S SURVEYS & POLLS */}
      {viewingUser && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full border border-slate-200 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
              <div>
                <h3 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
                  <Users className="w-5 h-5 text-brand-600" />
                  <span>Surveys & Polls by {viewingUser.user.email}</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Joined on {new Date(viewingUser.user.created_at).toLocaleDateString()} • {viewingUser.surveys?.length || 0} total items • {viewingUser.user.emails_sent || 0} response emails sent
                </p>
              </div>
              <button
                onClick={() => setViewingUser(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto divide-y divide-slate-100 flex-1">
              {(!viewingUser.surveys || viewingUser.surveys.length === 0) ? (
                <div className="text-center py-10 text-slate-500">
                  <FileText className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                  <p className="text-sm font-semibold text-slate-700">No surveys or polls created yet</p>
                  <p className="text-xs text-slate-400 mt-1">This user has not authored any questionnaires or interactive polls.</p>
                </div>
              ) : (
                viewingUser.surveys.map((s) => (
                  <div key={`${s.type}-${s.id}`} className="py-4 flex items-center justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center space-x-2">
                        <span
                          className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                            s.type === 'poll'
                              ? 'bg-sky-100 text-sky-800 border border-sky-200'
                              : 'bg-purple-100 text-purple-800 border border-purple-200'
                          }`}
                        >
                          {s.type === 'poll' ? 'Poll' : 'Survey'}
                        </span>
                        <p className="font-semibold text-slate-900 text-sm truncate">{s.title}</p>
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                            s.type === 'poll'
                              ? (s.status === 'live'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : s.status === 'draft'
                                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                : 'bg-slate-100 text-slate-500 border border-slate-200')
                              : (s.is_active === 1
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-slate-100 text-slate-500 border border-slate-200')
                          }`}
                        >
                          {s.type === 'poll' ? (s.status ? s.status.charAt(0).toUpperCase() + s.status.slice(1) : 'Draft') : (s.is_active === 1 ? 'Live' : 'Closed')}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {s.question_count} questions • {s.response_count} responses/votes • Created {new Date(s.created_at).toLocaleDateString()}
                        {s.type === 'poll' && s.code && <span className="ml-2 font-mono text-[11px] text-slate-500">PIN: {s.code}</span>}
                      </p>
                    </div>

                    <div className="flex items-center space-x-1.5">
                      {s.type === 'poll' ? (
                        <>
                          <a
                            href={`/join/${s.code || s.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-2 py-1 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition inline-flex items-center space-x-1"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            <span>Join</span>
                          </a>

                          <a
                            href={`/p/${s.code}/present`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-2 py-1 text-xs font-semibold text-sky-700 bg-sky-50 hover:bg-sky-100 border border-sky-200 rounded-lg transition inline-flex items-center space-x-1"
                          >
                            <Layers className="w-3.5 h-3.5" />
                            <span>Present</span>
                          </a>

                          <Link
                            to={`/polls/${s.id}/host`}
                            className="px-2 py-1 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition inline-flex items-center space-x-1"
                          >
                            <ShieldCheck className="w-3.5 h-3.5" />
                            <span>Host</span>
                          </Link>

                          <Link
                            to={`/polls/${s.id}/analytics`}
                            className="px-2 py-1 text-xs font-semibold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-lg transition inline-flex items-center space-x-1"
                          >
                            <BarChart2 className="w-3.5 h-3.5" />
                            <span>Analytics</span>
                          </Link>

                          <button
                            onClick={() => setDeletingTarget({ type: 'poll', item: s })}
                            title="Delete poll"
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      ) : (
                        <>
                          <a
                            href={`/s/${s.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition inline-flex items-center space-x-1"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            <span>View</span>
                          </a>

                          <Link
                            to={`/surveys/${s.id}/analytics`}
                            className="px-2.5 py-1.5 text-xs font-semibold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-lg transition inline-flex items-center space-x-1"
                          >
                            <BarChart2 className="w-3.5 h-3.5" />
                            <span>Analytics</span>
                          </Link>

                          <button
                            onClick={() => handleDuplicateSurvey(s)}
                            title="Duplicate survey"
                            className="px-2.5 py-1.5 text-xs font-semibold text-brand-700 bg-brand-50 hover:bg-brand-100 border border-brand-200 rounded-lg transition inline-flex items-center space-x-1"
                          >
                            <CopyPlus className="w-3.5 h-3.5" />
                            <span>Duplicate</span>
                          </button>

                          <button
                            onClick={() => handleToggleSurveyStatus(s)}
                            className="px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 border border-slate-200 rounded-lg transition"
                          >
                            {s.is_active === 1 ? 'Deactivate' : 'Activate'}
                          </button>

                          <button
                            onClick={() => setDeletingTarget({ type: 'survey', item: s })}
                            title="Delete survey"
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="p-4 border-t border-slate-200 bg-slate-50/50 flex justify-end">
              <button
                onClick={() => setViewingUser(null)}
                className="px-4 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: EDIT USER */}
      {editingUser && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-2xl p-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 rounded-lg bg-brand-50 text-brand-600">
                  <Edit2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Edit User Account</h3>
                  <p className="text-xs text-slate-400">ID: {editingUser.id}</p>
                </div>
              </div>
              <button
                onClick={() => setEditingUser(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveUserEdit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={editUserEmail}
                    onChange={(e) => setEditUserEmail(e.target.value)}
                    className="w-full pl-9 pr-3.5 py-2.5 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Reset Password <span className="text-slate-400 normal-case">(leave blank to keep current)</span>
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    placeholder="New password (min 6 chars)"
                    value={editUserPassword}
                    onChange={(e) => setEditUserPassword(e.target.value)}
                    className="w-full pl-9 pr-3.5 py-2.5 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-600"
                  />
                </div>
              </div>

              <div className="pt-4 flex items-center justify-end space-x-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingUserEdit}
                  className="px-5 py-2 text-sm font-semibold text-white bg-brand-600 hover:bg-brand-700 rounded-lg shadow-sm transition disabled:opacity-50"
                >
                  {submittingUserEdit ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: EDIT SURVEY */}
      {editingSurvey && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-2xl p-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 rounded-lg bg-brand-50 text-brand-600">
                  <Edit2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Edit Survey Details</h3>
                  <p className="text-xs text-slate-400">Author: {editingSurvey.author_email}</p>
                </div>
              </div>
              <button
                onClick={() => setEditingSurvey(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveSurveyEdit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Survey Title
                </label>
                <input
                  type="text"
                  required
                  value={editSurveyTitle}
                  onChange={(e) => setEditSurveyTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Description
                </label>
                <textarea
                  rows="3"
                  value={editSurveyDesc}
                  onChange={(e) => setEditSurveyDesc(e.target.value)}
                  placeholder="Optional survey description..."
                  className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-600 resize-none"
                />
              </div>

              <div className="pt-2">
                <label className="inline-flex items-center space-x-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editSurveyActive}
                    onChange={(e) => setEditSurveyActive(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                  />
                  <span className="text-sm font-semibold text-slate-700">Survey is Active (Open for responses)</span>
                </label>
              </div>

              <div className="pt-4 flex items-center justify-end space-x-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingSurvey(null)}
                  className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingSurveyEdit}
                  className="px-5 py-2 text-sm font-semibold text-white bg-brand-600 hover:bg-brand-700 rounded-lg shadow-sm transition disabled:opacity-50"
                >
                  {submittingSurveyEdit ? 'Saving...' : 'Update Survey'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: DELETE CONFIRMATION */}
      {deletingTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-2xl p-6">
            <div className="flex items-start space-x-3 mb-4">
              <div className="p-2 rounded-xl bg-red-50 text-red-600 flex-shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  {deletingTarget.type === 'user'
                    ? 'Delete User Account'
                    : deletingTarget.type === 'survey'
                    ? 'Delete Survey'
                    : 'Delete Poll'}
                </h3>
                <p className="text-sm text-slate-600 mt-1">
                  {deletingTarget.type === 'user' ? (
                    <>
                      Are you sure you want to permanently delete user{' '}
                      <span className="font-semibold text-slate-900">{deletingTarget.item.email}</span>?
                      <br />
                      <span className="text-red-600 font-semibold mt-1 inline-block">
                        Warning: All surveys, polls, questions, and responses authored by this user will be irrevocably destroyed.
                      </span>
                    </>
                  ) : deletingTarget.type === 'survey' ? (
                    <>
                      Are you sure you want to permanently delete survey{' '}
                      <span className="font-semibold text-slate-900">"{deletingTarget.item.title}"</span>?
                      <br />
                      <span className="text-red-600 font-semibold mt-1 inline-block">
                        Warning: All questions and collected responses will be permanently removed.
                      </span>
                    </>
                  ) : (
                    <>
                      Are you sure you want to permanently delete live poll{' '}
                      <span className="font-semibold text-slate-900">"{deletingTarget.item.title}"</span>?
                      <br />
                      <span className="text-red-600 font-semibold mt-1 inline-block">
                        Warning: All poll questions and participant submissions will be permanently removed.
                      </span>
                    </>
                  )}
                </p>
              </div>
            </div>

            <div className="pt-4 flex items-center justify-end space-x-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDeletingTarget(null)}
                disabled={actionLoading}
                className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={actionLoading}
                className="px-5 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg shadow-sm transition disabled:opacity-50"
              >
                {actionLoading ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 5: STATS TREND SPLASH WINDOW */}
      {trendModal && (() => {
        const config = TREND_CONFIGS[trendModal.type];
        const IconComponent = config.icon;
        const chartData = getTrendChartData();
        const chartOptions = getTrendChartOptions();
        const rawPoints = (trends && trends[trendModal.type]) || [];

        return (
          <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
            <div className="bg-white rounded-2xl max-w-2xl w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
              {/* Splash Window Header */}
              <div className="p-6 border-b border-slate-200 flex items-center justify-between bg-slate-50/60">
                <div className="flex items-center space-x-3">
                  <div className={`p-2.5 rounded-xl ${config.iconBg} border border-slate-200 shadow-sm`}>
                    <IconComponent className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">{config.title}</h3>
                    <p className="text-xs text-slate-500 mt-0.5">{config.subtitle}</p>
                  </div>
                </div>

                <button
                  onClick={() => setTrendModal(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200 transition"
                  title="Close window"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Splash Window Controls & Metrics */}
              <div className="px-6 py-4 bg-white border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-baseline space-x-2">
                  <span className="text-2xl font-extrabold text-slate-900">{config.total}</span>
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total {config.unit}</span>
                </div>

                {/* Toggle Cumulative vs Daily */}
                <div className="inline-flex p-1 bg-slate-100 rounded-xl border border-slate-200 text-xs font-semibold">
                  <button
                    onClick={() => setTrendModal(prev => ({ ...prev, viewMode: 'cumulative' }))}
                    className={`px-3 py-1.5 rounded-lg transition ${
                      trendModal.viewMode === 'cumulative'
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Cumulative Growth
                  </button>
                  <button
                    onClick={() => setTrendModal(prev => ({ ...prev, viewMode: 'daily' }))}
                    className={`px-3 py-1.5 rounded-lg transition ${
                      trendModal.viewMode === 'daily'
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Daily Activity
                  </button>
                </div>
              </div>

              {/* Splash Window Chart Body */}
              <div className="p-6 bg-slate-50/30 flex-1 overflow-y-auto">
                <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-sm h-72 w-full">
                  {chartData ? (
                    <Line data={chartData} options={chartOptions} />
                  ) : (
                    <div className="h-full flex items-center justify-center text-sm text-slate-400">
                      No historical timeline data available yet.
                    </div>
                  )}
                </div>

                {rawPoints.length > 0 && (
                  <div className="flex items-center justify-between text-xs text-slate-500 mt-3 px-1">
                    <span>
                      Tracking started: <strong className="text-slate-700">{rawPoints[0]?.date}</strong>
                    </span>
                    <span>
                      Latest record: <strong className="text-slate-700">{rawPoints[rawPoints.length - 1]?.date}</strong>
                    </span>
                  </div>
                )}
              </div>

              {/* Splash Window Footer */}
              <div className="p-4 border-t border-slate-200 bg-slate-50/60 flex items-center justify-between">
                <span className="text-xs text-slate-500">
                  {trendModal.viewMode === 'cumulative'
                    ? 'Showing cumulative trajectory over time.'
                    : 'Showing individual daily activity count.'}
                </span>
                <button
                  onClick={() => setTrendModal(null)}
                  className="px-4 py-2 text-sm font-semibold text-white bg-slate-800 hover:bg-slate-900 rounded-lg shadow-sm transition"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
