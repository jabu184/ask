import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { surveyApi } from '../services/api';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';
import {
  ArrowLeft,
  Download,
  FileSpreadsheet,
  FileText,
  Users,
  CheckCircle2,
  Lock,
  ExternalLink,
  Share2,
  Calendar,
  AlertCircle,
  MessageSquare,
  Star,
  Eye,
  Edit,
  Trash2,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  X,
  Check,
  Sliders,
  ListOrdered,
  Square,
  BarChart3
} from 'lucide-react';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

export default function SurveyAnalytics() {
  const { surveyId } = useParams();
  const [data, setData] = useState(null);
  const [responsesData, setResponsesData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  // Active tab: 'summary' | 'individual'
  const [activeTab, setActiveTab] = useState('summary');

  // Individual response modals state
  const [viewingIndex, setViewingIndex] = useState(null); // index in responsesData.responses
  const [editingResponse, setEditingResponse] = useState(null); // { id, answers: {} }
  const [savingEdit, setSavingEdit] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [analyticsResult, responsesResult] = await Promise.all([
        surveyApi.getAnalytics(surveyId),
        surveyApi.getResponses(surveyId)
      ]);
      setData(analyticsResult);
      setResponsesData(responsesResult);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load survey analytics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [surveyId]);

  const handleCopyLink = () => {
    const url = `${window.location.origin}/s/${surveyId}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatDateTime = (isoString) => {
    if (!isoString) return '—';
    try {
      const date = new Date(isoString.replace(' ', 'T') + 'Z');
      return date.toLocaleString(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short'
      });
    } catch (e) {
      return isoString;
    }
  };

  const handleDeleteResponse = async (responseId) => {
    if (!window.confirm('Are you sure you want to delete this response? This action cannot be undone.')) {
      return;
    }

    try {
      setDeletingId(responseId);
      await surveyApi.deleteResponse(surveyId, responseId);
      if (viewingIndex !== null) {
        setViewingIndex(null);
      }
      await fetchData();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete response');
    } finally {
      setDeletingId(null);
    }
  };

  const handleStartEdit = (resp) => {
    // Clone answers object and parse JSON strings for array types
    const initialAnswers = {};
    const questions = responsesData?.questions || [];

    questions.forEach(q => {
      const raw = resp.answers[q.id];
      if (['checkboxes', 'ranking'].includes(q.question_type)) {
        try {
          initialAnswers[q.id] = raw ? JSON.parse(raw) : (q.question_type === 'ranking' ? [...q.options] : []);
        } catch (e) {
          initialAnswers[q.id] = raw ? [raw] : [];
        }
      } else {
        initialAnswers[q.id] = raw !== undefined && raw !== null ? String(raw) : '';
      }
    });

    setEditingResponse({
      id: resp.id,
      submitted_at: resp.submitted_at,
      answers: initialAnswers
    });
  };

  const handleSaveEdit = async () => {
    if (!editingResponse) return;

    try {
      setSavingEdit(true);
      await surveyApi.updateResponse(surveyId, editingResponse.id, editingResponse.answers);
      setEditingResponse(null);
      await fetchData();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to update response');
    } finally {
      setSavingEdit(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-3">
        <div className="w-8 h-8 border-3 border-brand-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-slate-500 font-medium">Aggregating responses & analytics...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="p-6 rounded-2xl bg-red-50 border border-red-200 text-red-700 flex items-start space-x-3">
          <AlertCircle className="w-6 h-6 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="text-base font-bold">Failed to load analytics</h3>
            <p className="text-sm mt-1">{error}</p>
            <Link to="/dashboard" className="inline-block mt-4 text-xs font-semibold text-red-800 underline">
              Back to Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const { survey, total_responses, questions } = data;
  const responsesList = responsesData?.responses || [];
  const surveyQuestions = responsesData?.questions || questions;
  const isActive = survey.is_active === 1;

  // Selected response for "View Single Response" modal
  const viewingResponse = viewingIndex !== null && responsesList[viewingIndex] ? responsesList[viewingIndex] : null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Header & Back link */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-8">
        <div>
          <Link
            to="/dashboard"
            className="inline-flex items-center space-x-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 mb-2 transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Dashboard</span>
          </Link>
          <div className="flex items-center space-x-3">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
              {survey.title}
            </h1>
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                isActive
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-slate-100 text-slate-600 border border-slate-200'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${isActive ? 'bg-emerald-500' : 'bg-slate-400'}`} />
              {isActive ? 'Live' : 'Closed'}
            </span>
          </div>
          {survey.description && (
            <p className="text-sm text-slate-500 mt-1 max-w-2xl">{survey.description}</p>
          )}
        </div>

        {/* Action Buttons: Export CSV / Excel, Share Link */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleCopyLink}
            className="inline-flex items-center space-x-1.5 px-3 py-2 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-sm transition"
          >
            <Share2 className="w-3.5 h-3.5 text-slate-400" />
            <span>{copied ? 'Link Copied!' : 'Share Link'}</span>
          </button>

          <a
            href={`/s/${survey.id}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center space-x-1.5 px-3 py-2 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-sm transition"
          >
            <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
            <span>Open Survey</span>
          </a>

          <a
            href={surveyApi.getCsvExportUrl(survey.id)}
            download
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold shadow-sm transition"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Download CSV</span>
          </a>

          <a
            href={surveyApi.getXlsxExportUrl(survey.id)}
            download
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm transition"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Download Excel</span>
          </a>
        </div>
      </div>

      {/* Overview Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-8">
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Responses</span>
            <div className="w-9 h-9 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-slate-900 mt-3">{total_responses}</div>
          <p className="text-xs text-slate-400 mt-1">Completed survey submissions</p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Questions</span>
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-slate-900 mt-3">{questions.length}</div>
          <p className="text-xs text-slate-400 mt-1">Configured questionnaire items</p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Live Status</span>
            <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              {isActive ? <CheckCircle2 className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
            </div>
          </div>
          <div className="text-xl font-bold text-slate-900 mt-3">
            {isActive ? 'Accepting Submissions' : 'Closed'}
          </div>
          <p className="text-xs text-slate-400 mt-1">
            {isActive ? 'Public link is live' : 'Responses paused'}
          </p>
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <div className="flex items-center space-x-3 border-b border-slate-200 mb-8">
        <button
          onClick={() => setActiveTab('summary')}
          className={`pb-3.5 px-2 text-sm font-bold border-b-2 transition flex items-center space-x-2 ${
            activeTab === 'summary'
              ? 'border-brand-600 text-brand-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span>Summary & Visualizations</span>
        </button>

        <button
          onClick={() => setActiveTab('individual')}
          className={`pb-3.5 px-2 text-sm font-bold border-b-2 transition flex items-center space-x-2 ${
            activeTab === 'individual'
              ? 'border-brand-600 text-brand-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <span>Individual Responses</span>
          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
            activeTab === 'individual' ? 'bg-brand-50 text-brand-700' : 'bg-slate-100 text-slate-600'
          }`}>
            {responsesList.length}
          </span>
        </button>
      </div>

      {/* TAB 1: SUMMARY & CHARTS */}
      {activeTab === 'summary' && (
        <>
          {total_responses === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center max-w-lg mx-auto shadow-sm">
              <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-500 mx-auto flex items-center justify-center mb-3">
                <Users className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">No responses collected yet</h3>
              <p className="text-xs text-slate-500 mt-1 mb-6">
                Share the public survey link with your audience to begin populating real-time charts and metric distributions.
              </p>
              <button
                onClick={handleCopyLink}
                className="inline-flex items-center space-x-2 px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold shadow-sm transition"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>{copied ? 'Link Copied!' : 'Copy Public Survey Link'}</span>
              </button>
            </div>
          ) : (
            <div className="space-y-8">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {questions.map((q, idx) => {
                  return (
                    <div
                      key={q.id}
                      className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm flex flex-col justify-between"
                    >
                      <div className="mb-4">
                        <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                          <span className="font-semibold uppercase tracking-wider text-brand-700">
                            Question {idx + 1} • {q.question_type.replace('_', ' ')}
                          </span>
                          <span>{q.answered_count} answered</span>
                        </div>
                        <h3 className="text-base font-bold text-slate-900">{q.question_text}</h3>
                      </div>

                      {/* Multiple Choice: Bar Chart & table */}
                      {q.question_type === 'multiple_choice' && (
                        <div>
                          <div className="h-64 relative flex items-center justify-center">
                            <Bar
                              data={{
                                labels: (q.breakdown || []).map((b) => b.option),
                                datasets: [
                                  {
                                    label: 'Responses',
                                    data: (q.breakdown || []).map((b) => b.count),
                                    backgroundColor: 'rgba(34, 197, 94, 0.75)',
                                    borderColor: 'rgb(22, 163, 74)',
                                    borderWidth: 1.5,
                                    borderRadius: 6,
                                  },
                                ],
                              }}
                              options={{
                                responsive: true,
                                maintainAspectRatio: false,
                                plugins: {
                                  legend: { display: false },
                                  tooltip: {
                                    callbacks: {
                                      afterLabel: (item) => {
                                        const bd = q.breakdown[item.dataIndex];
                                        return `${bd.percentage}% of respondents`;
                                      },
                                    },
                                  },
                                },
                                scales: {
                                  y: {
                                    beginAtZero: true,
                                    ticks: { precision: 0 },
                                  },
                                },
                              }}
                            />
                          </div>

                          <div className="mt-4 pt-4 border-t border-slate-100 space-y-1.5">
                            {(q.breakdown || []).map((b, i) => (
                              <div key={i} className="flex items-center justify-between text-xs">
                                <span className="text-slate-700 font-medium truncate mr-2">{b.option}</span>
                                <div className="flex items-center space-x-2 flex-shrink-0">
                                  <span className="font-bold text-slate-900">{b.count}</span>
                                  <span className="text-slate-400">({b.percentage}%)</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Checkboxes: Multi-select distribution Bar Chart */}
                      {q.question_type === 'checkboxes' && (
                        <div>
                          <div className="h-64 relative flex items-center justify-center">
                            <Bar
                              data={{
                                labels: (q.breakdown || []).map((b) => b.option),
                                datasets: [
                                  {
                                    label: 'Times Selected',
                                    data: (q.breakdown || []).map((b) => b.count),
                                    backgroundColor: 'rgba(16, 185, 129, 0.75)',
                                    borderColor: 'rgb(5, 150, 105)',
                                    borderWidth: 1.5,
                                    borderRadius: 6,
                                  },
                                ],
                              }}
                              options={{
                                responsive: true,
                                maintainAspectRatio: false,
                                plugins: {
                                  legend: { display: false },
                                  tooltip: {
                                    callbacks: {
                                      afterLabel: (item) => {
                                        const bd = q.breakdown[item.dataIndex];
                                        return `${bd.percentage}% of respondents`;
                                      },
                                    },
                                  },
                                },
                                scales: {
                                  y: {
                                    beginAtZero: true,
                                    ticks: { precision: 0 },
                                  },
                                },
                              }}
                            />
                          </div>

                          <div className="mt-4 pt-4 border-t border-slate-100 space-y-1.5">
                            {(q.breakdown || []).map((b, i) => (
                              <div key={i} className="flex items-center justify-between text-xs">
                                <span className="text-slate-700 font-medium truncate mr-2">{b.option}</span>
                                <div className="flex items-center space-x-2 flex-shrink-0">
                                  <span className="font-bold text-slate-900">{b.count} picks</span>
                                  <span className="text-slate-400">({b.percentage}%)</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Star Rating: Average score card + 1-5 star distribution */}
                      {q.question_type === 'star_rating' && (
                        <div>
                          <div className="mb-4 p-4 rounded-xl bg-amber-50/70 border border-amber-200/70 flex items-center justify-between">
                            <div>
                              <span className="text-xs font-bold text-amber-800 uppercase tracking-wider">
                                Average Star Rating
                              </span>
                              <div className="flex items-center space-x-2 mt-1">
                                <span className="text-3xl font-extrabold text-amber-900">
                                  {q.average_score || 0}
                                </span>
                                <div className="flex items-center text-amber-400">
                                  {[1, 2, 3, 4, 5].map((star) => (
                                    <Star
                                      key={star}
                                      className={`w-4 h-4 ${
                                        star <= Math.round(q.average_score || 0)
                                          ? 'fill-amber-400 text-amber-400'
                                          : 'text-amber-200'
                                      }`}
                                    />
                                  ))}
                                </div>
                              </div>
                            </div>
                            <div className="text-right text-xs text-amber-700">
                              <span className="font-bold">{q.answered_count}</span> ratings recorded
                            </div>
                          </div>

                          <div className="h-48 relative">
                            <Bar
                              data={{
                                labels: ['1 Star', '2 Stars', '3 Stars', '4 Stars', '5 Stars'],
                                datasets: [
                                  {
                                    label: 'Rating Count',
                                    data: [1, 2, 3, 4, 5].map(
                                      (n) => (q.distribution && q.distribution[n]) || 0
                                    ),
                                    backgroundColor: 'rgba(245, 158, 11, 0.75)',
                                    borderColor: 'rgb(217, 119, 6)',
                                    borderWidth: 1.5,
                                    borderRadius: 4,
                                  },
                                ],
                              }}
                              options={{
                                responsive: true,
                                maintainAspectRatio: false,
                                plugins: { legend: { display: false } },
                                scales: {
                                  y: { beginAtZero: true, ticks: { precision: 0 } },
                                },
                              }}
                            />
                          </div>
                        </div>
                      )}

                      {/* Slider: Metrics Card + Range Buckets */}
                      {q.question_type === 'slider' && (
                        <div>
                          <div className="mb-4 p-4 rounded-xl bg-brand-50/70 border border-brand-200/70 grid grid-cols-3 gap-2 text-center">
                            <div>
                              <span className="text-[11px] font-bold text-brand-800 uppercase tracking-wider block">
                                Average
                              </span>
                              <span className="text-2xl font-extrabold text-brand-900">
                                {q.average_score || 0}
                              </span>
                            </div>
                            <div>
                              <span className="text-[11px] font-bold text-brand-800 uppercase tracking-wider block">
                                Lowest
                              </span>
                              <span className="text-2xl font-extrabold text-brand-900">
                                {q.min || 0}
                              </span>
                            </div>
                            <div>
                              <span className="text-[11px] font-bold text-brand-800 uppercase tracking-wider block">
                                Highest
                              </span>
                              <span className="text-2xl font-extrabold text-brand-900">
                                {q.max || 0}
                              </span>
                            </div>
                          </div>

                          <div className="h-48 relative">
                            <Bar
                              data={{
                                labels: ['1–20', '21–40', '41–60', '61–80', '81–100'],
                                datasets: [
                                  {
                                    label: 'Responses',
                                    data: ['1-20', '21-40', '41-60', '61-80', '81-100'].map(
                                      (k) => (q.distribution && q.distribution[k]) || 0
                                    ),
                                    backgroundColor: 'rgba(59, 130, 246, 0.75)',
                                    borderColor: 'rgb(37, 99, 235)',
                                    borderWidth: 1.5,
                                    borderRadius: 4,
                                  },
                                ],
                              }}
                              options={{
                                responsive: true,
                                maintainAspectRatio: false,
                                plugins: { legend: { display: false } },
                                scales: {
                                  y: { beginAtZero: true, ticks: { precision: 0 } },
                                },
                              }}
                            />
                          </div>
                        </div>
                      )}

                      {/* Ranking / Ordering: Leaderboard Table */}
                      {q.question_type === 'ranking' && (
                        <div>
                          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 mb-3 text-xs text-slate-500">
                            Lower average rank score indicates higher overall preference (Rank #1 is best).
                          </div>
                          <div className="space-y-2">
                            {(q.breakdown || []).map((item, rankIdx) => (
                              <div
                                key={rankIdx}
                                className="flex items-center justify-between p-3 rounded-xl border border-slate-100 bg-white hover:border-slate-200 transition text-xs"
                              >
                                <div className="flex items-center space-x-3">
                                  <span className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs ${
                                    rankIdx === 0
                                      ? 'bg-amber-100 text-amber-800'
                                      : rankIdx === 1
                                      ? 'bg-slate-200 text-slate-800'
                                      : rankIdx === 2
                                      ? 'bg-amber-50 text-amber-700'
                                      : 'bg-slate-100 text-slate-600'
                                  }`}>
                                    #{rankIdx + 1}
                                  </span>
                                  <span className="font-semibold text-slate-800">{item.item}</span>
                                </div>
                                <div className="flex items-center space-x-4 text-right">
                                  <div>
                                    <span className="text-slate-400 block text-[10px] uppercase">Avg Rank</span>
                                    <span className="font-bold text-slate-900">{item.average_rank || '—'}</span>
                                  </div>
                                  <div>
                                    <span className="text-slate-400 block text-[10px] uppercase">#1 Votes</span>
                                    <span className="font-bold text-brand-600">{item.first_choice_count}</span>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* True / False: Doughnut Chart */}
                      {q.question_type === 'true_false' && (
                        <div>
                          <div className="h-60 relative flex items-center justify-center">
                            <Doughnut
                              data={{
                                labels: ['True', 'False'],
                                datasets: [
                                  {
                                    data: [q.true_count || 0, q.false_count || 0],
                                    backgroundColor: ['rgba(34, 197, 94, 0.8)', 'rgba(239, 68, 68, 0.8)'],
                                    borderColor: ['rgb(22, 163, 74)', 'rgb(220, 38, 38)'],
                                    borderWidth: 1.5,
                                  },
                                ],
                              }}
                              options={{
                                responsive: true,
                                maintainAspectRatio: false,
                                plugins: {
                                  legend: {
                                    position: 'bottom',
                                    labels: { boxWidth: 12, padding: 16, font: { size: 12 } },
                                  },
                                },
                              }}
                            />
                          </div>

                          <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-2 gap-3 text-center text-xs">
                            <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-800">
                              <span className="font-semibold block">True</span>
                              <span className="text-base font-extrabold">{q.true_count || 0}</span>
                              <span className="text-xs text-emerald-600 block">({q.true_percentage || 0}%)</span>
                            </div>
                            <div className="p-2.5 rounded-xl bg-red-50 text-red-800">
                              <span className="font-semibold block">False</span>
                              <span className="text-base font-extrabold">{q.false_count || 0}</span>
                              <span className="text-xs text-red-600 block">({q.false_percentage || 0}%)</span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* 1–10 Rating Scale */}
                      {q.question_type === 'rating_1_10' && (
                        <div>
                          <div className="mb-4 p-4 rounded-xl bg-brand-50/70 border border-brand-200/70 flex items-center justify-between">
                            <div>
                              <span className="text-xs font-bold text-brand-800 uppercase tracking-wider">
                                Computed Average Score
                              </span>
                              <div className="flex items-baseline space-x-1 mt-0.5">
                                <span className="text-3xl font-extrabold text-brand-900">
                                  {q.average_score || 0}
                                </span>
                                <span className="text-xs text-brand-700 font-semibold">/ 10</span>
                              </div>
                            </div>
                            <div className="text-right text-xs text-brand-700">
                              <span className="font-semibold">{q.answered_count}</span> ratings recorded
                            </div>
                          </div>

                          <div className="h-48 relative">
                            <Bar
                              data={{
                                labels: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'],
                                datasets: [
                                  {
                                    label: 'Score Count',
                                    data: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(
                                      (n) => (q.distribution && q.distribution[n]) || 0
                                    ),
                                    backgroundColor: 'rgba(59, 130, 246, 0.75)',
                                    borderColor: 'rgb(37, 99, 235)',
                                    borderWidth: 1.5,
                                    borderRadius: 4,
                                  },
                                ],
                              }}
                              options={{
                                responsive: true,
                                maintainAspectRatio: false,
                                plugins: { legend: { display: false } },
                                scales: {
                                  y: { beginAtZero: true, ticks: { precision: 0 } },
                                },
                              }}
                            />
                          </div>
                        </div>
                      )}

                      {/* Text / Single Text / Comment Box */}
                      {['text', 'single_text', 'comment_box'].includes(q.question_type) && (
                        <div className="flex-1 flex flex-col justify-between">
                          <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-100">
                            <div className="flex items-center space-x-1.5 text-xs font-semibold text-slate-600">
                              <MessageSquare className="w-3.5 h-3.5 text-brand-600" />
                              <span>Text Responses ({q.responses?.length || 0})</span>
                            </div>
                            <span className="text-[11px] text-slate-400">Feed</span>
                          </div>

                          {q.responses && q.responses.length > 0 ? (
                            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                              {q.responses.map((resp, respIdx) => (
                                <div
                                  key={respIdx}
                                  className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-xs text-slate-800 leading-relaxed break-words"
                                >
                                  “{resp}”
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="py-12 text-center bg-slate-50/70 rounded-xl border border-dashed border-slate-200 text-xs text-slate-400">
                              No text responses submitted yet.
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}

      {/* TAB 2: INDIVIDUAL RESPONSES TABLE */}
      {activeTab === 'individual' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Individual Submissions</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Inspect, edit, or remove responses one at a time.
              </p>
            </div>
            <div className="text-xs text-slate-500 font-medium">
              Showing {responsesList.length} response{responsesList.length === 1 ? '' : 's'}
            </div>
          </div>

          {responsesList.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center max-w-md mx-auto shadow-sm">
              <Users className="w-10 h-10 text-slate-400 mx-auto mb-3" />
              <h3 className="text-base font-bold text-slate-900">No individual responses yet</h3>
              <p className="text-xs text-slate-500 mt-1">
                Responses will show up here once submitted through your survey link.
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-600">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold uppercase tracking-wider text-[11px]">
                    <tr>
                      <th className="py-3.5 px-4 w-12 text-center">#</th>
                      <th className="py-3.5 px-4">Date & Time of Submission</th>
                      <th className="py-3.5 px-4">Response ID</th>
                      <th className="py-3.5 px-4">Answers Preview</th>
                      <th className="py-3.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {responsesList.map((resp, index) => {
                      const firstQ = surveyQuestions[0];
                      const firstAns = firstQ ? resp.answers[firstQ.id] : null;

                      let previewText = 'No answer';
                      if (firstAns) {
                        try {
                          const parsed = JSON.parse(firstAns);
                          if (Array.isArray(parsed)) {
                            previewText = parsed.join(', ');
                          } else {
                            previewText = String(firstAns);
                          }
                        } catch (e) {
                          previewText = String(firstAns);
                        }
                      }

                      return (
                        <tr key={resp.id} className="hover:bg-slate-50/70 transition">
                          <td className="py-3 px-4 font-bold text-slate-400 text-center">
                            {index + 1}
                          </td>
                          <td className="py-3 px-4 text-slate-800 font-medium whitespace-nowrap">
                            <div className="flex items-center space-x-1.5">
                              <Calendar className="w-3.5 h-3.5 text-slate-400" />
                              <span>{formatDateTime(resp.submitted_at)}</span>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <span className="px-2 py-0.5 rounded bg-slate-100 font-mono text-[11px] text-slate-600">
                              {resp.id}
                            </span>
                          </td>
                          <td className="py-3 px-4 max-w-xs truncate text-slate-700 font-medium">
                            {previewText}
                          </td>
                          <td className="py-3 px-4 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end space-x-1.5">
                              <button
                                onClick={() => setViewingIndex(index)}
                                className="inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold transition"
                                title="View individual response"
                              >
                                <Eye className="w-3.5 h-3.5 text-slate-500" />
                                <span>View</span>
                              </button>

                              <button
                                onClick={() => handleStartEdit(resp)}
                                className="inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold transition"
                                title="Edit response answers"
                              >
                                <Edit className="w-3.5 h-3.5 text-blue-600" />
                                <span>Edit</span>
                              </button>

                              <button
                                onClick={() => handleDeleteResponse(resp.id)}
                                disabled={deletingId === resp.id}
                                className="inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 font-semibold transition disabled:opacity-50"
                                title="Delete response"
                              >
                                <Trash2 className="w-3.5 h-3.5 text-red-600" />
                                <span>Delete</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* MODAL 1: VIEW SINGLE RESPONSE AT A TIME */}
      {viewingResponse && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-fadeIn">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-brand-700">
                    Response #{viewingIndex + 1} of {responsesList.length}
                  </span>
                  <span className="text-slate-300">•</span>
                  <span className="font-mono text-xs text-slate-400">{viewingResponse.id}</span>
                </div>
                <p className="text-xs text-slate-500 mt-1 flex items-center space-x-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <span>Submitted on: {formatDateTime(viewingResponse.submitted_at)}</span>
                </p>
              </div>

              <div className="flex items-center space-x-2">
                {/* Previous & Next Navigation Buttons */}
                <button
                  onClick={() => setViewingIndex(viewingIndex - 1)}
                  disabled={viewingIndex === 0}
                  className="p-1.5 rounded-lg border border-slate-200 hover:bg-white text-slate-600 disabled:opacity-30 transition"
                  title="Previous Response"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewingIndex(viewingIndex + 1)}
                  disabled={viewingIndex === responsesList.length - 1}
                  className="p-1.5 rounded-lg border border-slate-200 hover:bg-white text-slate-600 disabled:opacity-30 transition"
                  title="Next Response"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
                <div className="h-4 w-px bg-slate-200 mx-1" />
                <button
                  onClick={() => setViewingIndex(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-white transition"
                  title="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body: Answer Cards */}
            <div className="p-6 overflow-y-auto space-y-6">
              {surveyQuestions.map((q, qIdx) => {
                const rawVal = viewingResponse.answers[q.id];

                let parsedVal = rawVal;
                let isArray = false;
                if (typeof rawVal === 'string' && rawVal.startsWith('[') && rawVal.endsWith(']')) {
                  try {
                    parsedVal = JSON.parse(rawVal);
                    isArray = Array.isArray(parsedVal);
                  } catch (e) {
                    parsedVal = rawVal;
                  }
                }

                return (
                  <div key={q.id} className="p-4 rounded-2xl bg-slate-50/70 border border-slate-200/80 space-y-2">
                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <span className="font-semibold uppercase tracking-wider text-slate-500">
                        Q{qIdx + 1} • {q.question_type.replace('_', ' ')}
                      </span>
                    </div>
                    <h4 className="text-sm font-bold text-slate-900">{q.question_text}</h4>

                    <div className="pt-2">
                      {rawVal === undefined || rawVal === null || rawVal === '' ? (
                        <span className="text-xs italic text-slate-400">No response provided</span>
                      ) : q.question_type === 'checkboxes' && isArray ? (
                        <div className="flex flex-wrap gap-1.5">
                          {parsedVal.map((item, i) => (
                            <span
                              key={i}
                              className="px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 text-xs font-semibold"
                            >
                              {item}
                            </span>
                          ))}
                        </div>
                      ) : q.question_type === 'ranking' && isArray ? (
                        <ol className="space-y-1.5">
                          {parsedVal.map((item, i) => (
                            <li
                              key={i}
                              className="flex items-center space-x-2 text-xs font-medium text-slate-800"
                            >
                              <span className="w-5 h-5 rounded-full bg-brand-100 text-brand-800 text-[10px] font-bold flex items-center justify-center">
                                {i + 1}
                              </span>
                              <span>{item}</span>
                            </li>
                          ))}
                        </ol>
                      ) : q.question_type === 'star_rating' ? (
                        <div className="flex items-center space-x-2">
                          <div className="flex items-center text-amber-400">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star
                                key={star}
                                className={`w-5 h-5 ${
                                  star <= parseInt(rawVal, 10)
                                    ? 'fill-amber-400 text-amber-400'
                                    : 'text-slate-200'
                                }`}
                              />
                            ))}
                          </div>
                          <span className="text-xs font-bold text-slate-700">({rawVal} / 5)</span>
                        </div>
                      ) : q.question_type === 'slider' ? (
                        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-blue-50 text-blue-800 text-xs font-bold border border-blue-200">
                          <Sliders className="w-3.5 h-3.5" />
                          <span>Score: {rawVal} / 100</span>
                        </div>
                      ) : (
                        <p className="text-xs font-medium text-slate-800 whitespace-pre-line leading-relaxed">
                          {rawVal}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <button
                onClick={() => {
                  handleStartEdit(viewingResponse);
                }}
                className="inline-flex items-center space-x-1.5 px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm transition"
              >
                <Edit className="w-3.5 h-3.5" />
                <span>Edit This Response</span>
              </button>

              <button
                onClick={() => handleDeleteResponse(viewingResponse.id)}
                className="inline-flex items-center space-x-1.5 px-3 py-2 rounded-lg bg-white border border-red-200 hover:bg-red-50 text-red-600 text-xs font-semibold shadow-sm transition"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Response</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: EDIT RESPONSE MODAL */}
      {editingResponse && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-fadeIn">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div>
                <h3 className="text-base font-bold text-slate-900">Edit Response</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Update answers for submission <span className="font-mono">{editingResponse.id}</span>
                </p>
              </div>
              <button
                onClick={() => setEditingResponse(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6">
              {surveyQuestions.map((q, qIdx) => {
                const currentVal = editingResponse.answers[q.id];

                return (
                  <div key={q.id} className="p-4 rounded-2xl bg-white border border-slate-200 space-y-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                      Question {qIdx + 1}
                    </span>
                    <h4 className="text-sm font-bold text-slate-900">{q.question_text}</h4>

                    <div className="pt-2">
                      {/* Multiple choice */}
                      {q.question_type === 'multiple_choice' && (
                        <div className="space-y-1.5">
                          {(q.options || []).map((opt, optI) => (
                            <label
                              key={optI}
                              className="flex items-center space-x-2 text-xs font-medium text-slate-700 cursor-pointer"
                            >
                              <input
                                type="radio"
                                name={`edit_q_${q.id}`}
                                checked={currentVal === opt}
                                onChange={() =>
                                  setEditingResponse((prev) => ({
                                    ...prev,
                                    answers: { ...prev.answers, [q.id]: opt },
                                  }))
                                }
                                className="text-brand-600 focus:ring-brand-500"
                              />
                              <span>{opt}</span>
                            </label>
                          ))}
                        </div>
                      )}

                      {/* Checkboxes */}
                      {q.question_type === 'checkboxes' && (
                        <div className="space-y-1.5">
                          {(q.options || []).map((opt, optI) => {
                            const list = Array.isArray(currentVal) ? currentVal : [];
                            const isChecked = list.includes(opt);

                            return (
                              <label
                                key={optI}
                                className="flex items-center space-x-2 text-xs font-medium text-slate-700 cursor-pointer"
                              >
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => {
                                    const updated = isChecked
                                      ? list.filter((item) => item !== opt)
                                      : [...list, opt];
                                    setEditingResponse((prev) => ({
                                      ...prev,
                                      answers: { ...prev.answers, [q.id]: updated },
                                    }));
                                  }}
                                  className="rounded text-brand-600 focus:ring-brand-500"
                                />
                                <span>{opt}</span>
                              </label>
                            );
                          })}
                        </div>
                      )}

                      {/* Ranking */}
                      {q.question_type === 'ranking' && (
                        <div className="space-y-1.5">
                          {((Array.isArray(currentVal) && currentVal.length > 0)
                            ? currentVal
                            : (q.options || [])
                          ).map((item, itemIdx, currentArr) => (
                            <div
                              key={itemIdx}
                              className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-200 text-xs"
                            >
                              <span className="font-semibold text-slate-800">
                                {itemIdx + 1}. {item}
                              </span>
                              <div className="flex items-center space-x-1">
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (itemIdx === 0) return;
                                    const copy = [...currentArr];
                                    const it = copy.splice(itemIdx, 1)[0];
                                    copy.splice(itemIdx - 1, 0, it);
                                    setEditingResponse((prev) => ({
                                      ...prev,
                                      answers: { ...prev.answers, [q.id]: copy },
                                    }));
                                  }}
                                  disabled={itemIdx === 0}
                                  className="p-1 hover:bg-slate-200 rounded disabled:opacity-30"
                                >
                                  <ChevronUp className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (itemIdx === currentArr.length - 1) return;
                                    const copy = [...currentArr];
                                    const it = copy.splice(itemIdx, 1)[0];
                                    copy.splice(itemIdx + 1, 0, it);
                                    setEditingResponse((prev) => ({
                                      ...prev,
                                      answers: { ...prev.answers, [q.id]: copy },
                                    }));
                                  }}
                                  disabled={itemIdx === currentArr.length - 1}
                                  className="p-1 hover:bg-slate-200 rounded disabled:opacity-30"
                                >
                                  <ChevronDown className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Star rating */}
                      {q.question_type === 'star_rating' && (
                        <div className="flex items-center space-x-2">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <button
                              type="button"
                              key={star}
                              onClick={() =>
                                setEditingResponse((prev) => ({
                                  ...prev,
                                  answers: { ...prev.answers, [q.id]: String(star) },
                                }))
                              }
                              className="p-1 focus:outline-none"
                            >
                              <Star
                                className={`w-6 h-6 ${
                                  star <= parseInt(currentVal, 10)
                                    ? 'fill-amber-400 text-amber-400'
                                    : 'text-slate-300'
                                }`}
                              />
                            </button>
                          ))}
                          <span className="text-xs text-slate-500 font-bold ml-2">
                            {currentVal ? `${currentVal} / 5 stars` : 'None'}
                          </span>
                        </div>
                      )}

                      {/* Slider */}
                      {q.question_type === 'slider' && (
                        <div className="space-y-1">
                          <div className="flex justify-between text-xs font-bold text-slate-600">
                            <span>1</span>
                            <span className="text-brand-600">{currentVal || '50'}</span>
                            <span>100</span>
                          </div>
                          <input
                            type="range"
                            min="1"
                            max="100"
                            value={currentVal || 50}
                            onChange={(e) =>
                              setEditingResponse((prev) => ({
                                ...prev,
                                answers: { ...prev.answers, [q.id]: e.target.value },
                              }))
                            }
                            className="w-full accent-brand-600"
                          />
                        </div>
                      )}

                      {/* True / False */}
                      {q.question_type === 'true_false' && (
                        <div className="flex space-x-3">
                          {['True', 'False'].map((ch) => (
                            <button
                              type="button"
                              key={ch}
                              onClick={() =>
                                setEditingResponse((prev) => ({
                                  ...prev,
                                  answers: { ...prev.answers, [q.id]: ch },
                                }))
                              }
                              className={`px-4 py-2 rounded-lg text-xs font-bold border transition ${
                                String(currentVal).toLowerCase() === ch.toLowerCase()
                                  ? 'bg-brand-50 border-brand-600 text-brand-800'
                                  : 'bg-white border-slate-200 text-slate-700'
                              }`}
                            >
                              {ch}
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Text inputs */}
                      {['text', 'single_text'].includes(q.question_type) && (
                        <input
                          type="text"
                          value={currentVal || ''}
                          onChange={(e) =>
                            setEditingResponse((prev) => ({
                              ...prev,
                              answers: { ...prev.answers, [q.id]: e.target.value },
                            }))
                          }
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                        />
                      )}

                      {q.question_type === 'comment_box' && (
                        <textarea
                          rows={3}
                          value={currentVal || ''}
                          onChange={(e) =>
                            setEditingResponse((prev) => ({
                              ...prev,
                              answers: { ...prev.answers, [q.id]: e.target.value },
                            }))
                          }
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                        />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-end space-x-2">
              <button
                type="button"
                onClick={() => setEditingResponse(null)}
                className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:text-slate-900"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveEdit}
                disabled={savingEdit}
                className="px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold transition disabled:opacity-50"
              >
                {savingEdit ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
