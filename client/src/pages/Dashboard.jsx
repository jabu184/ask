import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { surveyApi, pollApi } from '../services/api';
import PollQRCodeModal from '../components/PollQRCodeModal';
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
  HelpCircle,
  AlertCircle,
  Radio,
  Play,
  QrCode,
  Tv,
  Users,
  MessageSquare,
  Sparkles,
  Zap,
  Hash
} from 'lucide-react';

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState('surveys'); // 'surveys' | 'polls'

  // Surveys state
  const [surveys, setSurveys] = useState([]);
  const [loadingSurveys, setLoadingSurveys] = useState(true);
  const [togglingId, setTogglingId] = useState(null);
  const [duplicatingId, setDuplicatingId] = useState(null);

  // Polls state
  const [polls, setPolls] = useState([]);
  const [loadingPolls, setLoadingPolls] = useState(true);
  const [duplicatingPollId, setDuplicatingPollId] = useState(null);
  const [selectedQrPoll, setSelectedQrPoll] = useState(null);

  // General UI state
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [copiedId, setCopiedId] = useState(null);

  const fetchSurveys = async () => {
    try {
      setLoadingSurveys(true);
      const data = await surveyApi.list();
      setSurveys(data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load surveys');
    } finally {
      setLoadingSurveys(false);
    }
  };

  const fetchPolls = async () => {
    try {
      setLoadingPolls(true);
      const data = await pollApi.list();
      setPolls(data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load live polls');
    } finally {
      setLoadingPolls(false);
    }
  };

  useEffect(() => {
    fetchSurveys();
    fetchPolls();
  }, []);

  // Survey Actions
  const handleToggleSurvey = async (survey) => {
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

  const handleDeleteSurvey = async (id, title) => {
    if (!window.confirm(`Are you sure you want to delete survey "${title}"? All responses will be permanently deleted.`)) {
      return;
    }
    try {
      await surveyApi.delete(id);
      setSurveys((prev) => prev.filter((s) => s.id !== id));
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete survey');
    }
  };

  const handleDuplicateSurvey = async (survey) => {
    try {
      setDuplicatingId(survey.id);
      const res = await surveyApi.duplicate(survey.id);
      if (res && res.survey) {
        setSurveys((prev) => [res.survey, ...prev]);
        setSuccessMessage(`Survey duplicated successfully as "${res.survey.title}".`);
        setTimeout(() => setSuccessMessage(''), 4000);
      } else {
        await fetchSurveys();
      }
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to duplicate survey');
    } finally {
      setDuplicatingId(null);
    }
  };

  // Poll Actions
  const handleDeletePoll = async (id, title) => {
    if (!window.confirm(`Are you sure you want to delete live poll "${title}"? All votes and Q&A questions will be permanently deleted.`)) {
      return;
    }
    try {
      await pollApi.delete(id);
      setPolls((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete poll');
    }
  };

  const handleDuplicatePoll = async (poll) => {
    try {
      setDuplicatingPollId(poll.id);
      const res = await pollApi.duplicate(poll.id);
      if (res && res.poll) {
        setPolls((prev) => [res.poll, ...prev]);
        setSuccessMessage(`Poll duplicated successfully as "${res.poll.title}".`);
        setTimeout(() => setSuccessMessage(''), 4000);
      } else {
        await fetchPolls();
      }
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to duplicate poll');
    } finally {
      setDuplicatingPollId(null);
    }
  };

  const handleCopyLink = (url, id) => {
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Top Header & Action Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
            Creator Dashboard
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Build questionnaires, host Slido-style live interactive polls, and analyze responses.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <Link
            to="/surveys/new"
            className="inline-flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-sm font-semibold shadow-sm transition"
          >
            <Plus className="w-4 h-4 text-slate-500" />
            <span>New Survey</span>
          </Link>
          <Link
            to="/polls/new"
            className="inline-flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold shadow-sm shadow-indigo-600/20 transition"
          >
            <Radio className="w-4 h-4 text-white" />
            <span>New Live Poll</span>
          </Link>
        </div>
      </div>

      {/* Tabs Switcher: Surveys vs Live Polls */}
      <div className="flex items-center border-b border-slate-200 mb-8 space-x-8">
        <button
          type="button"
          onClick={() => setActiveTab('surveys')}
          className={`pb-4 text-sm font-bold flex items-center space-x-2 border-b-2 transition-all ${
            activeTab === 'surveys'
              ? 'border-brand-600 text-brand-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Inbox className="w-4 h-4" />
          <span>Surveys & Questionnaires</span>
          <span className="ml-1.5 px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600">
            {surveys.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('polls')}
          className={`pb-4 text-sm font-bold flex items-center space-x-2 border-b-2 transition-all ${
            activeTab === 'polls'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Radio className="w-4 h-4" />
          <span>Live Polls & Audience Q&A</span>
          <span className="ml-1.5 px-2 py-0.5 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-700">
            {polls.length}
          </span>
          <span className="px-1.5 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wider bg-amber-100 text-amber-800">
            Slido Mode
          </span>
        </button>
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
            <p className="font-semibold text-sm">Action failed</p>
            <p className="text-xs text-red-600 mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {/* TAB 1: Surveys View */}
      {activeTab === 'surveys' && (
        <>
          {loadingSurveys ? (
            <div className="min-h-[40vh] flex flex-col items-center justify-center space-y-3">
              <div className="w-8 h-8 border-3 border-brand-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-slate-500">Loading surveys...</p>
            </div>
          ) : surveys.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center max-w-xl mx-auto my-8 shadow-sm">
              <div className="w-16 h-16 rounded-2xl bg-brand-50 text-brand-600 mx-auto flex items-center justify-center mb-4 ring-8 ring-brand-50/50">
                <Inbox className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">No surveys created yet</h3>
              <p className="text-sm text-slate-500 mt-1 mb-6">
                Get started by creating your first questionnaire. Share the public link and collect responses anytime asynchronously.
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

                        <div className="flex items-center space-x-2">
                          <span className="text-xs text-slate-400 font-medium">Status</span>
                          <button
                            type="button"
                            onClick={() => handleToggleSurvey(survey)}
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
                      <button
                        onClick={() => handleCopyLink(`${window.location.origin}/s/${survey.id}`, survey.id)}
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
                          onClick={() => handleDuplicateSurvey(survey)}
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
                          onClick={() => handleDeleteSurvey(survey.id, survey.title)}
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
        </>
      )}

      {/* TAB 2: Live Polls View (Slido) */}
      {activeTab === 'polls' && (
        <>
          {loadingPolls ? (
            <div className="min-h-[40vh] flex flex-col items-center justify-center space-y-3">
              <div className="w-8 h-8 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-slate-500">Loading live interactive polls...</p>
            </div>
          ) : polls.length === 0 ? (
            <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center max-w-xl mx-auto my-8 shadow-sm">
              <div className="w-16 h-16 rounded-2xl bg-indigo-50 text-indigo-600 mx-auto flex items-center justify-center mb-4 ring-8 ring-indigo-50/50">
                <Radio className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">No live polls created yet</h3>
              <p className="text-sm text-slate-500 mt-1 mb-6">
                Host synchronous, live interactive voting and audience Q&A like Slido. Attendees join with a 6-digit PIN or scan a QR code on the big screen!
              </p>
              <Link
                to="/polls/new"
                className="inline-flex items-center space-x-2 px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold shadow-md shadow-indigo-600/20 transition"
              >
                <Plus className="w-4 h-4" />
                <span>Create Your First Live Poll</span>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {polls.map((poll) => {
                const isCopied = copiedId === poll.id;
                const isDuplicating = duplicatingPollId === poll.id;

                return (
                  <div
                    key={poll.id}
                    className="bg-white rounded-2xl border border-slate-200/90 hover:border-indigo-300 shadow-sm hover:shadow-md transition flex flex-col justify-between overflow-hidden"
                  >
                    <div className="p-6">
                      {/* Top Badges */}
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex items-center space-x-2">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                              poll.status === 'live'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : poll.status === 'closed'
                                ? 'bg-slate-100 text-slate-600 border border-slate-200'
                                : 'bg-amber-50 text-amber-700 border border-amber-200'
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                                poll.status === 'live'
                                  ? 'bg-emerald-500 animate-pulse'
                                  : poll.status === 'closed'
                                  ? 'bg-slate-400'
                                  : 'bg-amber-500'
                              }`}
                            />
                            {poll.status}
                          </span>

                          <span className="font-mono text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-md flex items-center space-x-1">
                            <Hash className="w-3 h-3 text-indigo-500" />
                            <span>{poll.code}</span>
                          </span>
                        </div>

                        {/* QR Code quick trigger */}
                        <button
                          type="button"
                          onClick={() => setSelectedQrPoll(poll)}
                          className="p-1 rounded-lg hover:bg-indigo-50 text-slate-400 hover:text-indigo-600 transition-colors"
                          title="Show QR Code & Participant URL"
                        >
                          <QrCode className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Title & Notes */}
                      <h3 className="text-lg font-bold text-slate-900 tracking-tight line-clamp-1 hover:text-indigo-600 transition">
                        <Link to={`/polls/${poll.id}/host`}>{poll.title}</Link>
                      </h3>
                      <p className="text-xs text-slate-500 mt-1 line-clamp-2 min-h-[2rem]">
                        {poll.description || 'Live synchronous audience interaction.'}
                      </p>

                      {/* Stat Counters */}
                      <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-2 gap-2 text-xs text-slate-600">
                        <div className="flex items-center space-x-1.5">
                          <Radio className="w-3.5 h-3.5 text-indigo-500" />
                          <span className="font-bold text-slate-800">{poll.question_count || 0}</span>
                          <span>Questions</span>
                        </div>
                        <div className="flex items-center space-x-1.5">
                          <Users className="w-3.5 h-3.5 text-emerald-500" />
                          <span className="font-bold text-slate-800">{poll.total_votes || 0}</span>
                          <span>Total Votes</span>
                        </div>
                      </div>
                    </div>

                    {/* Bottom Actions Bar */}
                    <div className="bg-slate-50 border-t border-slate-100 px-5 py-3 flex items-center justify-between gap-2">
                      {/* Live Controls */}
                      <Link
                        to={`/polls/${poll.id}/host`}
                        className="inline-flex items-center space-x-1.5 text-xs font-bold px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition"
                      >
                        <Play className="w-3 h-3 fill-white" />
                        <span>Live Controls</span>
                      </Link>

                      <div className="flex items-center space-x-1">
                        {/* Projector View */}
                        <a
                          href={`/p/${encodeURIComponent(poll.code)}/present`}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1.5 text-slate-600 hover:text-indigo-600 hover:bg-white rounded-md transition"
                          title="Open Fullscreen Projector Screen"
                        >
                          <Tv className="w-4 h-4" />
                        </a>

                        {/* Copy Join URL */}
                        <button
                          type="button"
                          onClick={() =>
                            handleCopyLink(`${window.location.origin}/p/${encodeURIComponent(poll.code)}`, poll.id)
                          }
                          className="p-1.5 text-slate-600 hover:text-indigo-600 hover:bg-white rounded-md transition"
                          title="Copy Participant Link"
                        >
                          {isCopied ? (
                            <Check className="w-4 h-4 text-emerald-600" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </button>

                        {/* Analytics */}
                        <Link
                          to={`/polls/${poll.id}/analytics`}
                          className="p-1.5 text-slate-600 hover:text-indigo-600 hover:bg-white rounded-md transition"
                          title="View Poll Analytics & CSV"
                        >
                          <BarChart2 className="w-4 h-4" />
                        </Link>

                        {/* Edit Poll */}
                        <Link
                          to={`/polls/${poll.id}/edit`}
                          className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-white rounded-md transition"
                          title="Edit Poll"
                        >
                          <Edit3 className="w-4 h-4" />
                        </Link>

                        {/* Duplicate */}
                        <button
                          type="button"
                          onClick={() => handleDuplicatePoll(poll)}
                          disabled={isDuplicating}
                          className="p-1.5 text-slate-600 hover:text-indigo-600 hover:bg-white rounded-md transition disabled:opacity-50"
                          title="Duplicate Poll"
                        >
                          <CopyPlus className={`w-4 h-4 ${isDuplicating ? 'animate-spin text-indigo-600' : ''}`} />
                        </button>

                        {/* Delete */}
                        <button
                          type="button"
                          onClick={() => handleDeletePoll(poll.id, poll.title)}
                          className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-white rounded-md transition"
                          title="Delete Poll"
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
        </>
      )}

      {/* QR Code Modal */}
      {selectedQrPoll && (
        <PollQRCodeModal
          isOpen={Boolean(selectedQrPoll)}
          onClose={() => setSelectedQrPoll(null)}
          code={selectedQrPoll.code}
          title={selectedQrPoll.title}
        />
      )}
    </div>
  );
}
