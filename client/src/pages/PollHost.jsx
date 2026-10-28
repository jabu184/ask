import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import { pollApi } from '../services/api';
import WordCloud from '../components/WordCloud';
import LiveBarChart from '../components/LiveBarChart';
import LiveRatingChart from '../components/LiveRatingChart';
import PollQRCodeModal from '../components/PollQRCodeModal';
import SEO from '../components/SEO';
import {
  Play,
  Pause,
  StopCircle,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  ChevronLeft,
  ChevronRight,
  Tv,
  QrCode,
  Users,
  MessageSquare,
  BarChart3,
  Cloud,
  Star,
  Settings,
  Share2,
  Copy,
  Check,
  AlertCircle,
  Sparkles,
  ArrowUpRight,
  ThumbsUp,
  CheckCircle,
  Pin,
  Trash2,
  ExternalLink
} from 'lucide-react';

export default function PollHost() {
  const { id } = useParams();
  const navigate = useNavigate();
  const socketRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [poll, setPoll] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [liveResults, setLiveResults] = useState(null);
  const [qaQuestions, setQaQuestions] = useState([]);
  const [participantCount, setParticipantCount] = useState(0);

  // Host local view states
  const [activeTab, setActiveTab] = useState('poll'); // 'poll' | 'qa'
  const [qaFilter, setQaFilter] = useState('all'); // 'all' | 'pending' | 'answered'
  const [showQrModal, setShowQrModal] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  // Initialize Socket and initial data
  useEffect(() => {
    let socket;

    const loadPoll = async () => {
      try {
        setLoading(true);
        const data = await pollApi.get(id);
        setPoll(data.poll);
        setQuestions(data.questions || []);

        const activeQ = data.questions.find((q) => q.id === data.poll.current_question_id) || data.questions[0];
        setCurrentQuestion(activeQ || null);

        // Connect Socket.IO
        socket = io({
          path: '/socket.io',
          transports: ['websocket', 'polling']
        });
        socketRef.current = socket;

        socket.on('connect', () => {
          socket.emit('poll:join', {
            pollId: id,
            participantId: 'host_' + id,
            isHost: true
          });
        });

        socket.on('poll:state', (state) => {
          if (state.poll) setPoll(state.poll);
          if (state.questions) setQuestions(state.questions);
          if (state.currentQuestion) setCurrentQuestion(state.currentQuestion);
          if (state.liveResults) setLiveResults(state.liveResults);
          if (state.qaQuestions) setQaQuestions(state.qaQuestions);
          if (typeof state.participantCount === 'number') setParticipantCount(state.participantCount);
          setLoading(false);
        });

        socket.on('poll:question_changed', (data) => {
          setCurrentQuestion(data.currentQuestion);
          if (data.liveResults) setLiveResults(data.liveResults);
          setPoll((prev) => (prev ? { ...prev, current_question_id: data.currentQuestion.id, voting_open: true } : prev));
        });

        socket.on('poll:voting_toggled', (data) => {
          setPoll((prev) => (prev ? { ...prev, voting_open: data.voting_open } : prev));
        });

        socket.on('poll:results_toggled', (data) => {
          setPoll((prev) => (prev ? { ...prev, show_results: data.show_results } : prev));
          if (data.liveResults) setLiveResults(data.liveResults);
        });

        socket.on('poll:status_changed', (data) => {
          setPoll((prev) => (prev ? { ...prev, status: data.status } : prev));
        });

        socket.on('poll:results_update', (data) => {
          if (data.results) {
            setLiveResults(data.results);
          }
        });

        socket.on('poll:participant_count', (data) => {
          setParticipantCount(data.count || 0);
        });

        // Q&A socket events
        socket.on('qa:question_added', (item) => {
          setQaQuestions((prev) => {
            const exists = prev.some((q) => q.id === item.id);
            if (exists) return prev.map((q) => (q.id === item.id ? item : q));
            return [item, ...prev];
          });
        });

        socket.on('qa:pending_question', (item) => {
          setQaQuestions((prev) => {
            const exists = prev.some((q) => q.id === item.id);
            if (exists) return prev.map((q) => (q.id === item.id ? item : q));
            return [item, ...prev];
          });
        });

        socket.on('qa:upvote_updated', ({ qaQuestionId, upvotes }) => {
          setQaQuestions((prev) =>
            prev.map((q) => (q.id === qaQuestionId ? { ...q, upvotes } : q))
          );
        });

        socket.on('qa:question_answered', ({ qaQuestionId }) => {
          setQaQuestions((prev) =>
            prev.map((q) => (q.id === qaQuestionId ? { ...q, is_answered: 1, is_highlighted: 0 } : q))
          );
        });

        socket.on('qa:question_highlighted', ({ qaQuestionId }) => {
          setQaQuestions((prev) =>
            prev.map((q) => ({
              ...q,
              is_highlighted: q.id === qaQuestionId ? 1 : 0
            }))
          );
        });

        socket.on('qa:question_unhighlighted', ({ qaQuestionId }) => {
          setQaQuestions((prev) =>
            prev.map((q) => (q.id === qaQuestionId ? { ...q, is_highlighted: 0 } : q))
          );
        });

        socket.on('qa:question_deleted', ({ qaQuestionId }) => {
          setQaQuestions((prev) => prev.filter((q) => q.id !== qaQuestionId));
        });
      } catch (err) {
        setError(err.response?.data?.error || 'Failed to load host session');
        setLoading(false);
      }
    };

    loadPoll();

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [id]);

  // Host Action Handlers
  const handleSetStatus = (newStatus) => {
    if (socketRef.current) {
      socketRef.current.emit('poll:host_change_status', { pollId: id, status: newStatus });
    }
  };

  const handleSelectQuestion = (qId) => {
    if (socketRef.current) {
      socketRef.current.emit('poll:host_set_question', { pollId: id, questionId: qId });
    }
  };

  const handlePrevQuestion = () => {
    if (!currentQuestion) return;
    const currentIndex = questions.findIndex((q) => q.id === currentQuestion.id);
    if (currentIndex > 0) {
      handleSelectQuestion(questions[currentIndex - 1].id);
    }
  };

  const handleNextQuestion = () => {
    if (!currentQuestion) return;
    const currentIndex = questions.findIndex((q) => q.id === currentQuestion.id);
    if (currentIndex < questions.length - 1) {
      handleSelectQuestion(questions[currentIndex + 1].id);
    }
  };

  const handleToggleVoting = () => {
    if (!poll || !socketRef.current) return;
    socketRef.current.emit('poll:host_toggle_voting', {
      pollId: id,
      voting_open: !poll.voting_open
    });
  };

  const handleToggleResults = () => {
    if (!poll || !socketRef.current) return;
    socketRef.current.emit('poll:host_toggle_results', {
      pollId: id,
      show_results: !poll.show_results
    });
  };

  // Q&A Moderation Actions
  const handleModerateQa = (qaQuestionId, action) => {
    if (socketRef.current) {
      socketRef.current.emit('qa:host_moderate', { pollId: id, qaQuestionId, action });
    }
  };

  const copyCodeToClipboard = () => {
    if (!poll) return;
    navigator.clipboard.writeText(poll.code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white">
        <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-slate-400 text-sm font-medium">Entering Host Studio...</p>
      </div>
    );
  }

  if (error || !poll) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white p-4">
        <AlertCircle className="w-12 h-12 text-rose-500 mb-4" />
        <h2 className="text-xl font-bold mb-2">Host Access Error</h2>
        <p className="text-slate-400 text-sm mb-6 max-w-md text-center">{error || 'Poll not found'}</p>
        <Link
          to="/dashboard"
          className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm transition-all"
        >
          Return to Dashboard
        </Link>
      </div>
    );
  }

  const currentQIndex = questions.findIndex((q) => q.id === (currentQuestion?.id));
  const isFirstQ = currentQIndex <= 0;
  const isLastQ = currentQIndex >= questions.length - 1;

  // Filtered Q&A
  const filteredQa = qaQuestions.filter((q) => {
    if (qaFilter === 'pending') return q.is_approved === 0;
    if (qaFilter === 'answered') return q.is_answered === 1;
    return q.is_approved === 1 && q.is_answered === 0;
  });

  const pendingCount = qaQuestions.filter((q) => q.is_approved === 0).length;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <SEO title={`Host Studio: ${poll.title}`} />

      {/* Top Studio Bar */}
      <header className="bg-slate-900/90 border-b border-slate-800 px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3 sticky top-0 z-40 backdrop-blur-md">
        {/* Left: Status & Title */}
        <div className="flex items-center space-x-3">
          <Link
            to="/dashboard"
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all text-xs flex items-center space-x-1"
            title="Return to Dashboard"
          >
            <ChevronLeft className="w-4 h-4" />
            <span className="hidden md:inline font-medium">Dashboard</span>
          </Link>

          <div className="h-5 w-px bg-slate-800" />

          <div>
            <div className="flex items-center space-x-2">
              <h1 className="font-bold text-sm sm:text-base text-white tracking-tight line-clamp-1 max-w-xs sm:max-w-md">
                {poll.title}
              </h1>
              {/* Status Indicator */}
              {poll.status === 'live' && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 animate-pulse">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1" />
                  LIVE
                </span>
              )}
              {poll.status === 'draft' && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  DRAFT
                </span>
              )}
              {poll.status === 'closed' && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-700 text-slate-300">
                  CLOSED
                </span>
              )}
            </div>
            <div className="flex items-center space-x-2 text-[11px] text-slate-400">
              <span>PIN:</span>
              <button
                type="button"
                onClick={copyCodeToClipboard}
                className="font-mono font-bold text-indigo-400 hover:text-indigo-300 flex items-center space-x-1"
                title="Click to copy join code"
              >
                <span>{poll.code}</span>
                {copiedCode ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              </button>
            </div>
          </div>
        </div>

        {/* Center: Live Status Controls */}
        <div className="flex items-center space-x-2">
          {poll.status === 'draft' && (
            <button
              type="button"
              onClick={() => handleSetStatus('live')}
              className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-600/20 transition-all flex items-center space-x-1.5"
            >
              <Play className="w-3.5 h-3.5 fill-white" />
              <span>Start Live Poll</span>
            </button>
          )}

          {poll.status === 'live' && (
            <button
              type="button"
              onClick={() => handleSetStatus('closed')}
              className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-md shadow-rose-600/20 transition-all flex items-center space-x-1.5"
            >
              <StopCircle className="w-3.5 h-3.5" />
              <span>End Session</span>
            </button>
          )}

          {poll.status === 'closed' && (
            <button
              type="button"
              onClick={() => handleSetStatus('live')}
              className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition-all flex items-center space-x-1.5"
            >
              <Play className="w-3.5 h-3.5 fill-white" />
              <span>Resume Poll</span>
            </button>
          )}
        </div>

        {/* Right: Participant count, Share QR, Presenter View */}
        <div className="flex items-center space-x-2.5">
          <div className="hidden sm:flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-slate-800/80 border border-slate-700/60 text-xs text-slate-300">
            <Users className="w-3.5 h-3.5 text-indigo-400" />
            <span className="font-bold text-white">{participantCount}</span>
            <span className="text-slate-400 text-[11px]">in room</span>
          </div>

          <button
            type="button"
            onClick={() => setShowQrModal(true)}
            className="p-1.5 sm:px-3 sm:py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white transition-all text-xs font-semibold flex items-center space-x-1.5 border border-slate-700/50"
            title="Show QR Code for Audience"
          >
            <QrCode className="w-4 h-4 text-indigo-400" />
            <span className="hidden sm:inline">QR Code</span>
          </button>

          <a
            href={`/p/${encodeURIComponent(poll.code)}/present`}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white transition-all text-xs font-bold shadow-md shadow-indigo-600/25 flex items-center space-x-1.5 group"
          >
            <Tv className="w-4 h-4" />
            <span>Present Screen</span>
            <ArrowUpRight className="w-3.5 h-3.5 text-indigo-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </a>

          <Link
            to={`/polls/${poll.id}/analytics`}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all"
            title="Poll Analytics & Export"
          >
            <BarChart3 className="w-4 h-4" />
          </Link>
        </div>
      </header>

      {/* Main Studio Body: Sidebar + Main Area */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Sidebar: Questions or Q&A tabs */}
        <aside className="w-full md:w-80 bg-slate-900 border-r border-slate-800 flex flex-col flex-shrink-0">
          {/* Studio Tab Switcher */}
          <div className="p-3 border-b border-slate-800 grid grid-cols-2 gap-1.5">
            <button
              type="button"
              onClick={() => setActiveTab('poll')}
              className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 transition-all ${
                activeTab === 'poll'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Questions ({questions.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('qa')}
              className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 transition-all relative ${
                activeTab === 'qa'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Q&A ({qaQuestions.length})</span>
              {pendingCount > 0 && (
                <span className="w-2 h-2 rounded-full bg-amber-400 absolute top-2 right-2 ring-2 ring-slate-900" />
              )}
            </button>
          </div>

          {/* Tab 1: Questions List */}
          {activeTab === 'poll' && (
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-2 py-1">
                Select Active Question:
              </div>
              {questions.map((q, idx) => {
                const isActive = currentQuestion?.id === q.id;
                let TypeIcon = BarChart3;
                if (q.question_type === 'word_cloud') TypeIcon = Cloud;
                if (q.question_type === 'rating') TypeIcon = Star;
                if (q.question_type === 'text') TypeIcon = MessageSquare;

                return (
                  <button
                    key={q.id}
                    type="button"
                    onClick={() => handleSelectQuestion(q.id)}
                    className={`w-full text-left p-3 rounded-xl border transition-all flex items-start space-x-3 group ${
                      isActive
                        ? 'bg-indigo-600/15 border-indigo-500 text-white shadow-md shadow-indigo-950'
                        : 'bg-slate-850 border-slate-800 text-slate-300 hover:bg-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div
                      className={`w-6 h-6 rounded-lg text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5 ${
                        isActive ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 group-hover:text-slate-200'
                      }`}
                    >
                      {idx + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold line-clamp-2 mb-1">
                        {q.question_text || `Question ${idx + 1}`}
                      </div>
                      <div className="flex items-center space-x-2 text-[10px] text-slate-400">
                        <span className="flex items-center space-x-1">
                          <TypeIcon className="w-3 h-3 text-indigo-400" />
                          <span className="capitalize">{q.question_type.replace('_', ' ')}</span>
                        </span>
                        {isActive && (
                          <span className="text-emerald-400 font-bold uppercase tracking-wider">
                            • Active
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}

              <div className="pt-4 px-2">
                <Link
                  to={`/polls/${poll.id}/edit`}
                  className="w-full py-2 px-3 rounded-xl border border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-white text-xs font-medium flex items-center justify-center space-x-1.5 transition-all"
                >
                  <Settings className="w-3.5 h-3.5" />
                  <span>Edit Questions in Builder</span>
                </Link>
              </div>
            </div>
          )}

          {/* Tab 2: Q&A Moderation List */}
          {activeTab === 'qa' && (
            <div className="flex-1 flex flex-col min-h-0">
              {/* Q&A sub-filters */}
              <div className="p-3 border-b border-slate-800 flex items-center space-x-1 text-xs">
                <button
                  type="button"
                  onClick={() => setQaFilter('all')}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
                    qaFilter === 'all' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Live ({qaQuestions.filter((q) => q.is_approved === 1 && !q.is_answered).length})
                </button>
                {poll.qa_moderation && (
                  <button
                    type="button"
                    onClick={() => setQaFilter('pending')}
                    className={`px-2.5 py-1 rounded-lg font-semibold flex items-center space-x-1 transition-all ${
                      qaFilter === 'pending'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        : 'text-slate-400 hover:text-amber-300'
                    }`}
                  >
                    <span>Pending ({pendingCount})</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setQaFilter('answered')}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
                    qaFilter === 'answered' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Answered ({qaQuestions.filter((q) => q.is_answered === 1).length})
                </button>
              </div>

              {/* Q&A Items */}
              <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
                {filteredQa.length === 0 ? (
                  <div className="text-center py-12 px-4 text-slate-500 text-xs">
                    No questions in this view yet.
                  </div>
                ) : (
                  filteredQa.map((item) => (
                    <div
                      key={item.id}
                      className={`p-3 rounded-xl border transition-all text-xs space-y-2 ${
                        item.is_highlighted
                          ? 'bg-amber-500/10 border-amber-500/50 ring-1 ring-amber-500/30'
                          : 'bg-slate-850 border-slate-800'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-medium text-slate-200">{item.question_text}</span>
                        <span className="inline-flex items-center space-x-1 font-bold text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded text-[11px] flex-shrink-0">
                          <ThumbsUp className="w-3 h-3" />
                          <span>{item.upvotes}</span>
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-800/60">
                        <span>{item.author_name || 'Anonymous'}</span>

                        {/* Action buttons */}
                        <div className="flex items-center space-x-1.5">
                          {item.is_approved === 0 && (
                            <button
                              type="button"
                              onClick={() => handleModerateQa(item.id, 'approve')}
                              className="px-2 py-0.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
                            >
                              Approve
                            </button>
                          )}

                          {item.is_approved === 1 && !item.is_answered && (
                            <>
                              <button
                                type="button"
                                onClick={() =>
                                  handleModerateQa(
                                    item.id,
                                    item.is_highlighted ? 'unhighlight' : 'highlight'
                                  )
                                }
                                className={`p-1 rounded hover:bg-slate-700 transition-colors ${
                                  item.is_highlighted ? 'text-amber-400' : 'text-slate-400'
                                }`}
                                title={item.is_highlighted ? 'Unhighlight on Screen' : 'Highlight on Stage Screen'}
                              >
                                <Pin className="w-3.5 h-3.5" />
                              </button>

                              <button
                                type="button"
                                onClick={() => handleModerateQa(item.id, 'answer')}
                                className="p-1 rounded hover:bg-emerald-500/20 text-slate-400 hover:text-emerald-400 transition-colors"
                                title="Mark as Answered"
                              >
                                <CheckCircle className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}

                          <button
                            type="button"
                            onClick={() => handleModerateQa(item.id, 'delete')}
                            className="p-1 rounded hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition-colors"
                            title="Delete question"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </aside>

        {/* Center / Stage: Active Question Preview & Live Controls */}
        <main className="flex-1 flex flex-col bg-slate-950 overflow-y-auto">
          {currentQuestion ? (
            <div className="p-4 sm:p-8 max-w-4xl mx-auto w-full space-y-6">
              {/* Question Header & Navigation Bar */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 mb-4 border-b border-slate-800">
                  <div className="flex items-center space-x-2">
                    <span className="px-2.5 py-1 rounded-lg bg-indigo-600 text-white text-xs font-bold">
                      Question {currentQIndex + 1} of {questions.length}
                    </span>
                    <span className="text-xs text-slate-400 capitalize">
                      {currentQuestion.question_type.replace('_', ' ')}
                    </span>
                  </div>

                  {/* Question Prev / Next Switchers */}
                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      disabled={isFirstQ}
                      onClick={handlePrevQuestion}
                      className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white disabled:opacity-30 disabled:pointer-events-none text-xs font-semibold flex items-center space-x-1 transition-all"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      <span>Prev</span>
                    </button>
                    <button
                      type="button"
                      disabled={isLastQ}
                      onClick={handleNextQuestion}
                      className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white disabled:opacity-30 disabled:pointer-events-none text-xs font-semibold flex items-center space-x-1 transition-all"
                    >
                      <span>Next</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Prompt Title */}
                <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
                  {currentQuestion.question_text}
                </h2>

                {/* Host Action Switches */}
                <div className="mt-5 pt-4 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center space-x-3">
                    {/* Voting Lock Toggle */}
                    <button
                      type="button"
                      onClick={handleToggleVoting}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all ${
                        poll.voting_open
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20'
                          : 'bg-rose-500/10 text-rose-400 border border-rose-500/30 hover:bg-rose-500/20'
                      }`}
                    >
                      {poll.voting_open ? (
                        <>
                          <Unlock className="w-3.5 h-3.5" />
                          <span>Voting Active</span>
                        </>
                      ) : (
                        <>
                          <Lock className="w-3.5 h-3.5" />
                          <span>Voting Locked</span>
                        </>
                      )}
                    </button>

                    {/* Show / Hide Results Toggle */}
                    <button
                      type="button"
                      onClick={handleToggleResults}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all ${
                        poll.show_results
                          ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/30 hover:bg-indigo-500/20'
                          : 'bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-750'
                      }`}
                    >
                      {poll.show_results ? (
                        <>
                          <Eye className="w-3.5 h-3.5" />
                          <span>Results Visible</span>
                        </>
                      ) : (
                        <>
                          <EyeOff className="w-3.5 h-3.5" />
                          <span>Results Hidden</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Vote counter */}
                  <div className="text-xs text-slate-400 flex items-center space-x-1">
                    <span className="font-bold text-white text-sm">
                      {liveResults?.totalVotes || 0}
                    </span>
                    <span>votes received</span>
                  </div>
                </div>
              </div>

              {/* Live Visualization Canvas */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xl">
                <div className="flex items-center justify-between mb-6 pb-2 border-b border-slate-800/80">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center space-x-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Live Audience Responses</span>
                  </span>
                  <span className="text-xs text-slate-400">Updates dynamically</span>
                </div>

                {/* Multiple Choice Chart */}
                {currentQuestion.question_type === 'multiple_choice' && (
                  <LiveBarChart results={liveResults?.results || []} />
                )}

                {/* Word Cloud */}
                {currentQuestion.question_type === 'word_cloud' && (
                  <div className="py-4">
                    <WordCloud words={liveResults?.words || []} />
                  </div>
                )}

                {/* Star Rating Chart */}
                {currentQuestion.question_type === 'rating' && (
                  <LiveRatingChart
                    average={liveResults?.average || 0}
                    maxRating={liveResults?.maxRating || 5}
                    totalVotes={liveResults?.totalVotes || 0}
                    counts={liveResults?.counts || {}}
                  />
                )}

                {/* Open text list */}
                {currentQuestion.question_type === 'text' && (
                  <div className="space-y-3">
                    {(!liveResults?.responses || liveResults.responses.length === 0) ? (
                      <div className="text-center py-12 text-slate-500 text-xs">
                        Awaiting participant responses...
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-96 overflow-y-auto">
                        {liveResults.responses.map((resp, rIdx) => (
                          <div
                            key={rIdx}
                            className="p-3.5 rounded-xl bg-slate-800/80 border border-slate-700/60 text-xs text-slate-200"
                          >
                            "{resp}"
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
              <BarChart3 className="w-12 h-12 text-slate-700 mb-3" />
              <h3 className="text-lg font-bold text-white mb-1">No Questions Found</h3>
              <p className="text-xs text-slate-400 mb-4">Add questions to this poll to start hosting.</p>
              <Link
                to={`/polls/${poll.id}/edit`}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold"
              >
                Open Poll Builder
              </Link>
            </div>
          )}
        </main>
      </div>

      {/* QR Code Modal for sharing */}
      <PollQRCodeModal
        isOpen={showQrModal}
        onClose={() => setShowQrModal(false)}
        code={poll.code}
        title={poll.title}
      />
    </div>
  );
}
