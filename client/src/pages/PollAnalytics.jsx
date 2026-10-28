import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { pollApi } from '../services/api';
import WordCloud from '../components/WordCloud';
import LiveBarChart from '../components/LiveBarChart';
import LiveRatingChart from '../components/LiveRatingChart';
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
  AlertCircle
} from 'lucide-react';

export default function PollAnalytics() {
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [analytics, setAnalytics] = useState(null);

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

  const { poll, stats, questions, qaQuestions } = analytics;

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
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
            Total Votes
          </div>
          <div className="text-3xl font-extrabold text-slate-900">{stats.totalVotes}</div>
          <div className="text-[11px] text-slate-400 mt-1 flex items-center space-x-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            <span>Across all questions</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
            Unique Voters
          </div>
          <div className="text-3xl font-extrabold text-indigo-600">{stats.uniqueParticipants}</div>
          <div className="text-[11px] text-slate-400 mt-1 flex items-center space-x-1">
            <Users className="w-3.5 h-3.5 text-indigo-400" />
            <span>Active participants</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
            Questions
          </div>
          <div className="text-3xl font-extrabold text-slate-900">{stats.questionCount}</div>
          <div className="text-[11px] text-slate-400 mt-1">
            Interactive activities
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
            Q&A Asked
          </div>
          <div className="text-3xl font-extrabold text-violet-600">{stats.qaCount}</div>
          <div className="text-[11px] text-slate-400 mt-1 flex items-center space-x-1">
            <MessageSquare className="w-3.5 h-3.5 text-violet-400" />
            <span>Audience questions</span>
          </div>
        </div>
      </div>

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
                  average={q.results?.average || 0}
                  maxRating={q.results?.maxRating || 5}
                  totalVotes={q.results?.totalVotes || 0}
                  counts={q.results?.counts || {}}
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
    </div>
  );
}
