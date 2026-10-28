import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { surveyApi } from '../services/api';
import { 
  Plus, 
  BarChart2, 
  Edit3, 
  Trash2, 
  Copy, 
  CopyPlus,
  Check, 
  ExternalLink, 
  Inbox, 
  Calendar, 
  HelpCircle,
  AlertCircle
} from 'lucide-react';

export default function Dashboard() {
  const [surveys, setSurveys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [copiedId, setCopiedId] = useState(null);
  const [togglingId, setTogglingId] = useState(null);
  const [duplicatingId, setDuplicatingId] = useState(null);

  const fetchSurveys = async () => {
    try {
      setLoading(true);
      const data = await surveyApi.list();
      setSurveys(data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load surveys');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSurveys();
  }, []);

  const handleToggle = async (survey) => {
    try {
      setTogglingId(survey.id);
      const newStatus = survey.is_active === 1 ? false : true;
      const res = await surveyApi.toggleActive(survey.id, newStatus);
      setSurveys((prev) =>
        prev.map((s) => (s.id === survey.id ? { ...s, is_active: res.is_active } : s))
      );
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to update survey status');
    } finally {
      setTogglingId(null);
    }
  };

  const handleDelete = async (id, title) => {
    if (!window.confirm(`Are you sure you want to delete "${title}"? All responses and questions will be permanently deleted.`)) {
      return;
    }

    try {
      await surveyApi.delete(id);
      setSurveys((prev) => prev.filter((s) => s.id !== id));
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete survey');
    }
  };

  const handleCopyLink = (surveyId) => {
    const publicUrl = `${window.location.origin}/s/${surveyId}`;
    navigator.clipboard.writeText(publicUrl);
    setCopiedId(surveyId);
    setTimeout(() => {
      setCopiedId(null);
    }, 2000);
  };

  const handleDuplicate = async (survey) => {
    try {
      setDuplicatingId(survey.id);
      const res = await surveyApi.duplicate(survey.id);
      if (res && res.survey) {
        setSurveys((prev) => [res.survey, ...prev]);
        setSuccessMessage(`Survey duplicated successfully as "${res.survey.title}".`);
        setTimeout(() => {
          setSuccessMessage('');
        }, 4000);
      } else {
        await fetchSurveys();
      }
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to duplicate survey');
    } finally {
      setDuplicatingId(null);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">Creator Dashboard</h1>
          <p className="text-slate-500 text-sm mt-1">Manage questionnaires, control live access, and analyze survey returns.</p>
        </div>
        <Link
          to="/surveys/new"
          className="inline-flex items-center justify-center space-x-2 px-4 py-2.5 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold shadow-sm shadow-brand-600/20 transition"
        >
          <Plus className="w-4 h-4" />
          <span>Create New Survey</span>
        </Link>
      </div>

      {successMessage && (
        <div className="mb-6 p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between text-emerald-800 text-sm animate-fadeIn">
          <div className="flex items-center space-x-2.5">
            <Check className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            <span className="font-medium">{successMessage}</span>
          </div>
          <button
            onClick={() => setSuccessMessage('')}
            className="text-emerald-600 hover:text-emerald-800 text-xs font-semibold"
          >
            Dismiss
          </button>
        </div>
      )}

      {error && (
        <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 flex items-start space-x-3 text-red-700">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-sm">Failed to load surveys</p>
            <p className="text-xs text-red-600 mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {loading ? (
        <div className="min-h-[40vh] flex flex-col items-center justify-center space-y-3">
          <div className="w-8 h-8 border-3 border-brand-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-slate-500">Loading your surveys...</p>
        </div>
      ) : surveys.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center max-w-xl mx-auto my-8 shadow-sm">
          <div className="w-16 h-16 rounded-2xl bg-brand-50 text-brand-600 mx-auto flex items-center justify-center mb-4 ring-8 ring-brand-50/50">
            <Inbox className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">No surveys created yet</h3>
          <p className="text-sm text-slate-500 mt-1 mb-6">
            Get started by creating your first lightweight survey. Share the public link and collect responses in real time.
          </p>
          <Link
            to="/surveys/new"
            className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold shadow-sm transition"
          >
            <Plus className="w-4 h-4" />
            <span>Create Your First Survey</span>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {surveys.map((survey) => {
            const isActive = survey.is_active === 1;
            const isCopied = copiedId === survey.id;
            const isToggling = togglingId === survey.id;

            return (
              <div
                key={survey.id}
                className="bg-white rounded-2xl border border-slate-200/80 hover:border-slate-300 shadow-sm hover:shadow-md transition flex flex-col justify-between overflow-hidden"
              >
                <div className="p-6">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold tracking-wide ${
                        isActive
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-slate-100 text-slate-600 border border-slate-200'
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${isActive ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                      {isActive ? 'Active' : 'Closed'}
                    </span>

                    {/* Immediate Toggle Switch */}
                    <div className="flex items-center space-x-2">
                      <span className="text-xs text-slate-400 font-medium">Status</span>
                      <button
                        type="button"
                        onClick={() => handleToggle(survey)}
                        disabled={isToggling}
                        className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                          isActive ? 'bg-brand-600' : 'bg-slate-300'
                        } ${isToggling ? 'opacity-50' : ''}`}
                        role="switch"
                        aria-checked={isActive}
                        title={`Click to ${isActive ? 'close' : 'open'} survey`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                            isActive ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>
                  </div>

                  <h3 className="text-lg font-bold text-slate-900 tracking-tight line-clamp-1 hover:text-brand-700 transition">
                    <Link to={`/surveys/${survey.id}/analytics`}>{survey.title}</Link>
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2 min-h-[2rem]">
                    {survey.description || 'No description provided.'}
                  </p>

                  <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-2 gap-2 text-xs text-slate-600">
                    <div className="flex items-center space-x-1.5">
                      <Inbox className="w-3.5 h-3.5 text-slate-400" />
                      <span className="font-semibold text-slate-800">{survey.response_count || 0}</span>
                      <span>Responses</span>
                    </div>
                    <div className="flex items-center space-x-1.5">
                      <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
                      <span className="font-semibold text-slate-800">{survey.question_count || 0}</span>
                      <span>Questions</span>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-50/70 border-t border-slate-100 px-6 py-3.5 flex items-center justify-between gap-2">
                  {/* Quick-copy button */}
                  <button
                    onClick={() => handleCopyLink(survey.id)}
                    className="inline-flex items-center space-x-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition"
                    title="Copy public survey link"
                  >
                    {isCopied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-brand-600" />
                        <span className="text-brand-600">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-slate-400" />
                        <span>Copy Link</span>
                      </>
                    )}
                  </button>

                  <div className="flex items-center space-x-1">
                    <Link
                      to={`/surveys/${survey.id}/analytics`}
                      className="p-1.5 text-slate-600 hover:text-brand-600 hover:bg-white rounded-md transition"
                      title="View Analytics"
                    >
                      <BarChart2 className="w-4 h-4" />
                    </Link>
                    <Link
                      to={`/surveys/${survey.id}/edit`}
                      className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-white rounded-md transition"
                      title="Edit Survey"
                    >
                      <Edit3 className="w-4 h-4" />
                    </Link>
                    <button
                      type="button"
                      onClick={() => handleDuplicate(survey)}
                      disabled={duplicatingId === survey.id}
                      className="p-1.5 text-slate-600 hover:text-brand-600 hover:bg-white rounded-md transition disabled:opacity-50"
                      title="Duplicate Survey"
                      aria-label="Duplicate Survey"
                    >
                      <CopyPlus className={`w-4 h-4 ${duplicatingId === survey.id ? 'animate-spin text-brand-600' : ''}`} />
                    </button>
                    <a
                      href={`/s/${survey.id}`}
                      target="_blank"
                      rel="noreferrer"
                      className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-white rounded-md transition"
                      title="Open Public Survey"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                    <button
                      onClick={() => handleDelete(survey.id, survey.title)}
                      className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-white rounded-md transition"
                      title="Delete Survey"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
