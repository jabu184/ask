import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { pollApi } from '../services/api';
import WordCloud from '../components/WordCloud';
import LiveBarChart from '../components/LiveBarChart';
import LiveRatingChart from '../components/LiveRatingChart';
import LiveRankingChart from '../components/LiveRankingChart';
import SEO from '../components/SEO';
import {
  ArrowLeft,
  Download,
  Play,
  Users,
  CheckCircle2,
  BarChart3,
  Cloud,
  Star,
  MessageSquare,
  ThumbsUp,
  Clock,
  Sparkles,
  AlertCircle,
  Trophy,
  Trash2,
  ListOrdered
} from 'lucide-react';

export default function PollAnalytics() {
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [analytics, setAnalytics] = useState(null);
  const [showPurgeModal, setShowPurgeModal] = useState(false);
  const [purgingData, setPurgingData] = useState(false);

  const handlePurgeData = async () => {
    if (purgingData) return;
    setPurgingData(true);
    try {
      await pollApi.purgeData(id);
      const refreshed = await pollApi.getAnalytics(id);
      setAnalytics(refreshed);
      setShowPurgeModal(false);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to purge poll data');
    } finally {
      setPurgingData(false);
    }
  };

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setLoading(true);
        const data = await pollApi.getAnalytics(id);
        setAnalytics(data);
      } catch (err) {
        setError(err.response?.data?.error || 'Failed to load poll analytics');
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, [id]);

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-16 text-center">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-slate-500 text-sm">Compiling poll analytics & results...</p>
      </div>
    );
  }

  if (error || !analytics) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center">
        <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-3" />
        <h2 className="text-lg font-bold text-slate-900 mb-1">Analytics Error</h2>
        <p className="text-sm text-slate-500 mb-6">{error || 'Poll not found'}</p>
        <Link
          to="/dashboard"
          className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-semibold"
        >
          Return to Dashboard
        </Link>
      </div>
    );
  }

  const poll = analytics.poll || {};
  const questions = analytics.questions || [];
  const qaQuestions = analytics.qaQuestions || [];
  const leaderboard = analytics.leaderboard || [];
  const stats = analytics.stats || {
    totalVotes: analytics.totalVotes ?? 0,
    uniqueParticipants: analytics.totalParticipants ?? 0,
    questionCount: questions.length,
    qaCount: qaQuestions.length
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <SEO title={`Analytics: ${poll.title}`} />

      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 mb-6 border-b border-slate-200 gap-4">
        <div>
          <Link
            to="/dashboard"
            className="inline-flex items-center text-xs font-semibold text-slate-500 hover:text-slate-800 mb-2 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5 mr-1" />
            Back to Dashboard
          </Link>
          <div className="flex items-center space-x-3">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              {poll.title}
            </h1>
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider ${
                poll.status === 'live'
                  ? 'bg-emerald-100 text-emerald-800'
                  : poll.status === 'closed'
                  ? 'bg-slate-100 text-slate-700'
                  : 'bg-amber-100 text-amber-800'
              }`}
            >
              {poll.status}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Participant Code: <span className="font-mono font-bold text-indigo-600">{poll.code}</span>
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            type="button"
            onClick={() => setShowPurgeModal(true)}
            className="px-3.5 py-2 border border-slate-300 rounded-xl text-xs sm:text-sm font-semibold text-slate-700 bg-white hover:bg-rose-50 hover:text-rose-600 hover:border-rose-300 shadow-sm transition-all flex items-center space-x-1.5 cursor-pointer"
            title="Purge all responses, quiz players, and Q&A from this poll"
          >
            <Trash2 className="w-4 h-4 text-rose-500" />
            <span className="hidden sm:inline">Purge Data</span>
          </button>

          <a
            href={pollApi.getCsvExportUrl(poll.id)}
            download
            className="px-4 py-2 border border-slate-300 rounded-xl text-xs sm:text-sm font-semibold text-slate-700 bg-white hover:bg-slate-50 shadow-sm transition-all flex items-center space-x-2"
          >
            <Download className="w-4 h-4 text-slate-500" />
            <span>Export CSV</span>
          </a>

          <Link
            to={`/polls/${poll.id}/host`}
            className="px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-600/20 transition-all flex items-center space-x-2"
          >
            <Play className="w-4 h-4 fill-white" />
            <span>Open Host Studio</span>
          </Link>
        </div>
      </div>

      {/* KPI Overview Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
            Total Votes
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900">{stats.totalVotes}</div>
          <div className="text-[10px] text-slate-400 mt-1 flex items-center space-x-1">
            <CheckCircle2 className="w-3 h-3 text-emerald-500" />
            <span>All questions</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
            Unique Voters
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-emerald-600">{stats.uniqueParticipants}</div>
          <div className="text-[10px] text-slate-400 mt-1 flex items-center space-x-1">
            <Users className="w-3 h-3 text-emerald-500" />
            <span>Voted at least once</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
            Poll Turnout
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-indigo-600">{stats.pollEngagementPct ?? 0}%</div>
          <div className="text-[10px] text-slate-400 mt-1">
            {stats.uniqueVoters || stats.uniqueParticipants || 0} of {stats.totalAudience || stats.uniqueParticipants || 0} audience
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
            Q&A Engagement
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-violet-600">{stats.qaEngagementPct ?? 0}%</div>
          <div className="text-[10px] text-slate-400 mt-1">
            {stats.uniqueQaParticipants || 0} asked or upvoted
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
            Questions
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900">{stats.questionCount}</div>
          <div className="text-[10px] text-slate-400 mt-1">
            Interactive activities
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
            Q&A Questions
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900">{stats.qaCount}</div>
          <div className="text-[10px] text-slate-400 mt-1 flex items-center space-x-1">
            <MessageSquare className="w-3 h-3 text-slate-400" />
            <span>Audience questions</span>
          </div>
        </div>
      </div>

      {/* Quiz Mode Leaderboard & Final Scores */}
      {Boolean(poll.is_quiz_mode) && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm mb-10">
          <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
            <div className="flex items-center space-x-2">
              <Trophy className="w-5 h-5 text-amber-500" />
              <h2 className="text-lg font-bold text-slate-900">Quiz Leaderboard & Final Player Rankings</h2>
            </div>
            <span className="text-xs font-semibold text-slate-500">
              {leaderboard.length} Ranked Players
            </span>
          </div>

          {leaderboard.length === 0 ? (
            <p className="text-xs text-slate-400 italic py-4 text-center">No participants scored points in this quiz.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider">
                    <th className="py-2.5 px-3 w-20">Rank</th>
                    <th className="py-2.5 px-3">Player</th>
                    <th className="py-2.5 px-3 text-right">Final Score</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {leaderboard.map((player, idx) => (
                    <tr key={player.participant_id || idx} className={idx < 3 ? 'bg-amber-50/40 font-bold' : ''}>
                      <td className="py-3 px-3">
                        {idx === 0 ? '🥇 1st' : idx === 1 ? '🥈 2nd' : idx === 2 ? '🥉 3rd' : `#${idx + 1}`}
                      </td>
                      <td className="py-3 px-3 flex items-center space-x-2.5">
                        <span className="text-lg">{player.avatar || '🚀'}</span>
                        <span className="text-slate-900 font-bold">{player.name || 'Anonymous'}</span>
                      </td>
                      <td className="py-3 px-3 text-right font-black text-amber-600 text-sm">
                        {player.score} {player.score === 1 ? 'pt' : 'pts'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Questions Results Breakdown */}
      <div className="space-y-6 mb-10">
        <h2 className="text-lg font-bold text-slate-900">Question Results Breakdown</h2>

        {questions.map((q, idx) => (
          <div
            key={q.id}
            className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 mb-5 border-b border-slate-100 gap-2">
              <div className="flex items-center space-x-3">
                <span className="w-7 h-7 rounded-lg bg-slate-900 text-white font-bold text-xs flex items-center justify-center">
                  {idx + 1}
                </span>
                <h3 className="text-base font-bold text-slate-900">
                  {q.question_text}
                </h3>
              </div>

              <div className="flex items-center space-x-3 text-xs text-slate-500">
                <span className="capitalize px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 font-medium">
                  {q.question_type.replace('_', ' ')}
                </span>
                <span className="font-semibold text-slate-800">
                  {q.results?.totalVotes || 0} votes
                </span>
              </div>
            </div>

            {/* Results Graphic */}
            <div className="pt-2">
              {q.question_type === 'multiple_choice' && (
                <LiveBarChart results={q.results?.results || []} />
              )}

              {q.question_type === 'word_cloud' && (
                <div className="py-2">
                  <WordCloud words={q.results?.words || []} />
                </div>
              )}

              {q.question_type === 'rating' && (
                <LiveRatingChart
                  ratingData={q.results}
                  average={q.results?.average || 0}
                  maxRating={q.results?.maxRating || 5}
                  totalVotes={q.results?.totalVotes || 0}
                  counts={q.results?.counts || {}}
                />
              )}

              {q.question_type === 'ranking' && (
                <LiveRankingChart
                  rankingData={q.results}
                  totalVotes={q.results?.totalVotes || 0}
                />
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Audience Q&A Archive */}
      {qaQuestions && qaQuestions.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900 mb-4">
            Audience Q&A Log ({qaQuestions.length})
          </h2>

          <div className="divide-y divide-slate-100">
            {qaQuestions.map((qa) => (
              <div key={qa.id} className="py-3.5 flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-slate-900">
                    {qa.question_text}
                  </p>
                  <div className="flex items-center space-x-3 text-xs text-slate-400">
                    <span>Asked by {qa.author_name || 'Anonymous'}</span>
                    <span>•</span>
                    <span>{new Date(qa.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    {qa.is_answered === 1 && (
                      <span className="text-emerald-600 font-semibold">• Answered</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 text-xs font-bold flex-shrink-0">
                  <ThumbsUp className="w-3.5 h-3.5" />
                  <span>{qa.upvotes}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {/* Danger Zone: Purge Data */}
      <div className="bg-rose-50/50 border border-rose-200 rounded-2xl p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-8">
        <div>
          <div className="flex items-center space-x-2 text-rose-800 font-bold text-sm mb-1">
            <Trash2 className="w-4 h-4 text-rose-600" />
            <span>Purge Poll Response Data</span>
          </div>
          <p className="text-xs text-rose-700/80 max-w-xl">
            Reset this poll back to zero responses. Permanently deletes all participant votes, scores, quiz players, and audience Q&A questions while keeping the poll questions and code intact.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowPurgeModal(true)}
          className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs shadow-xs transition flex items-center justify-center space-x-2 shrink-0 cursor-pointer"
        >
          <Trash2 className="w-4 h-4" />
          <span>Purge All Data</span>
        </button>
      </div>

      {/* Purge Data Confirmation Modal */}
      {showPurgeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-xl border border-slate-200 space-y-5 animate-in zoom-in-95">
            <div className="flex items-center space-x-3 text-rose-600">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center shrink-0">
                <Trash2 className="w-6 h-6 text-rose-600" />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-900 text-lg leading-tight">Purge All Poll Data?</h3>
                <p className="text-xs text-slate-500">This action cannot be undone.</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3.5 rounded-xl border border-slate-200/80">
              This will permanently delete all <strong>participant responses</strong>, <strong>quiz players & scores</strong>, and <strong>audience Q&A questions</strong>. Your questions and poll PIN will be preserved so you can reuse this poll for a new session.
            </p>

            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                type="button"
                disabled={purgingData}
                onClick={() => setShowPurgeModal(false)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={purgingData}
                onClick={handlePurgeData}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-bold text-xs shadow-sm transition flex items-center space-x-1.5 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{purgingData ? 'Purging Data...' : 'Yes, Purge All Data'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
