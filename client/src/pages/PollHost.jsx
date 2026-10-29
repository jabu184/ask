import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import { pollApi } from '../services/api';
import WordCloud from '../components/WordCloud';
import LiveBarChart from '../components/LiveBarChart';
import LiveRatingChart from '../components/LiveRatingChart';
import LiveRankingChart from '../components/LiveRankingChart';
import SEO from '../components/SEO';
import {
  ArrowLeft,
  Play,
  StopCircle,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  ChevronLeft,
  ChevronRight,
  Tv,
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
  CheckCircle2,
  RotateCcw,
  Pin,
  Trash2,
  ExternalLink,
  Download,
  HelpCircle,
  Radio,
  Trophy,
  ListOrdered
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
  const [showCorrectAnswer, setShowCorrectAnswer] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [leaderboard, setLeaderboard] = useState([]);
  const [markPromptTargetQId, setMarkPromptTargetQId] = useState(null);

  // Tab state: 'live' | 'qa' | 'analytics'
  const [activeTab, setActiveTab] = useState('live');
  const [qaFilter, setQaFilter] = useState('all'); // 'all' | 'pending' | 'answered'
  const [showQrModal, setShowQrModal] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [showPurgeModal, setShowPurgeModal] = useState(false);
  const [purgingData, setPurgingData] = useState(false);
  const [pollStats, setPollStats] = useState(null);

  // Initialize Socket and initial data
  useEffect(() => {
    let socket;

    const loadPoll = async () => {
      try {
        setLoading(true);
        const data = await pollApi.get(id);
        setPoll(data.poll);
        setQuestions(data.questions || []);
        if (data.stats) setPollStats(data.stats);
        if (typeof data.poll.show_correct_answer !== 'undefined') {
          setShowCorrectAnswer(Boolean(data.poll.show_correct_answer));
        }
        if (typeof data.poll.show_leaderboard !== 'undefined') {
          setShowLeaderboard(Boolean(data.poll.show_leaderboard));
        }

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
            isHost: true,
            isPresenter: false
          });
        });

        socket.on('poll:state', (state) => {
          if (state.poll) {
            setPoll(state.poll);
            if (typeof state.poll.show_correct_answer !== 'undefined') {
              setShowCorrectAnswer(Boolean(state.poll.show_correct_answer));
            }
            if (typeof state.poll.show_leaderboard !== 'undefined') {
              setShowLeaderboard(Boolean(state.poll.show_leaderboard));
            }
          }
          if (state.questions) setQuestions(state.questions);
          if (state.currentQuestion) setCurrentQuestion(state.currentQuestion);
          if (state.liveResults) setLiveResults(state.liveResults);
          if (state.qaQuestions) setQaQuestions(state.qaQuestions);
          if (state.leaderboard) setLeaderboard(state.leaderboard);
          if (typeof state.participantCount === 'number') setParticipantCount(state.participantCount);
          setLoading(false);
        });

        socket.on('poll:question_changed', (data) => {
          setCurrentQuestion(data.currentQuestion);
          setShowCorrectAnswer(false);
          if (data.liveResults) setLiveResults(data.liveResults);
          setPoll((prev) => (prev ? { ...prev, current_question_id: data.currentQuestion.id, voting_open: true } : prev));
        });

        socket.on('poll:voting_toggled', (data) => {
          setPoll((prev) => (prev ? { ...prev, voting_open: data.voting_open } : prev));
        });

        socket.on('poll:results_toggled', (data) => {
          if (data.questionId) {
            setQuestions((prev) =>
              prev.map((q) => (q.id === data.questionId ? { ...q, show_results: data.show_results ? 1 : 0 } : q))
            );
            setCurrentQuestion((prev) =>
              prev && prev.id === data.questionId
                ? { ...prev, show_results: data.show_results ? 1 : 0 }
                : prev
            );
          }
          setPoll((prev) => (prev ? { ...prev, show_results: data.show_results } : prev));
          if (data.liveResults) setLiveResults(data.liveResults);
        });

        socket.on('poll:correct_answer_toggled', (data) => {
          const { questionId, show_correct_answer, answer_revealed } = data;
          if (questionId) {
            setQuestions((prev) =>
              prev.map((q) =>
                q.id === questionId
                  ? {
                      ...q,
                      show_correct_answer: show_correct_answer ? 1 : 0,
                      answer_revealed: answer_revealed !== undefined ? answer_revealed : (show_correct_answer ? 1 : q.answer_revealed)
                    }
                  : q
              )
            );
            setCurrentQuestion((prev) =>
              prev && prev.id === questionId
                ? {
                    ...prev,
                    show_correct_answer: show_correct_answer ? 1 : 0,
                    answer_revealed: answer_revealed !== undefined ? answer_revealed : (show_correct_answer ? 1 : prev.answer_revealed)
                  }
                : prev
            );
          }
          setShowCorrectAnswer(Boolean(show_correct_answer));
        });

        socket.on('poll:leaderboard_toggled', ({ show_leaderboard, leaderboard: lb }) => {
          setShowLeaderboard(Boolean(show_leaderboard));
          if (lb) setLeaderboard(lb);
        });

        socket.on('poll:leaderboard_update', ({ leaderboard: lb }) => {
          if (lb) setLeaderboard(lb);
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

        socket.on('poll:data_purged', () => {
          setLiveResults(null);
          setQaQuestions([]);
          setLeaderboard([]);
          setShowCorrectAnswer(false);
          setShowLeaderboard(false);
          setQuestions((prev) => prev.map((q) => ({ ...q, results: null, answer_revealed: 0, show_correct_answer: 0 })));
          setCurrentQuestion((prev) => (prev ? { ...prev, answer_revealed: 0, show_correct_answer: 0 } : prev));
          setPoll((prev) => (prev ? { ...prev, show_correct_answer: false, show_leaderboard: false, voting_open: true } : prev));
          setPollStats((prev) => prev ? { ...prev, totalVotes: 0, uniqueParticipants: 0, uniqueVoters: 0, pollEngagementPct: 0, qaEngagementPct: 0, qaCount: 0 } : null);
        });

        // Remote Q&A display sync
        socket.on('poll:qa_display_toggled', ({ show_qa }) => {
          setPoll((prev) => (prev ? { ...prev, show_qa_on_screen: show_qa } : prev));
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

        socket.on('qa:question_unanswered', ({ qaQuestionId }) => {
          setQaQuestions((prev) =>
            prev.map((q) => (q.id === qaQuestionId ? { ...q, is_answered: 0 } : q))
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
        setError(err.response?.data?.error || 'Failed to load poll session');
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

  const executeQuestionChange = (targetQId, markPreviousAction = null) => {
    if (socketRef.current) {
      socketRef.current.emit('poll:host_set_question', {
        pollId: id,
        questionId: targetQId,
        markPreviousAction
      });
    }
    const targetQ = questions.find((q) => q.id === targetQId);
    if (targetQ) {
      setCurrentQuestion(targetQ);
      setShowCorrectAnswer(Boolean(targetQ.show_correct_answer === 1));
      setPoll((prev) => (prev ? { ...prev, show_results: targetQ.show_results !== false && targetQ.show_results !== 0 } : prev));
    }
    if (markPreviousAction) {
      setQuestions((prev) =>
        prev.map((q) => (q.id === currentQuestion?.id ? { ...q, answer_revealed: 1 } : q))
      );
    }
    setMarkPromptTargetQId(null);
  };

  const handleSelectQuestion = (qId) => {
    if (!qId || qId === currentQuestion?.id) return;
    if (currentQuestion && currentQuestion.correct_answer && !currentQuestion.answer_revealed) {
      setMarkPromptTargetQId(qId);
    } else {
      executeQuestionChange(qId, null);
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

  const handleToggleQuestionResults = (targetQId = null) => {
    if (!poll || !socketRef.current) return;
    const qId = targetQId || currentQuestion?.id;
    if (!qId) return;

    const targetQ = questions.find((q) => q.id === qId);
    if (!targetQ) return;

    const isVisible = targetQ.show_results !== false && targetQ.show_results !== 0;
    const nextVal = !isVisible;

    setQuestions((prev) =>
      prev.map((q) => (q.id === qId ? { ...q, show_results: nextVal ? 1 : 0 } : q))
    );

    if (currentQuestion && currentQuestion.id === qId) {
      setCurrentQuestion((prev) => (prev ? { ...prev, show_results: nextVal ? 1 : 0 } : prev));
      setPoll((prev) => (prev ? { ...prev, show_results: nextVal } : prev));
    }

    socketRef.current.emit('poll:host_toggle_results', {
      pollId: id,
      questionId: qId,
      show_results: nextVal
    });
  };

  const handleToggleQuestionCorrectAnswer = (targetQId = null) => {
    if (!poll || !socketRef.current) return;
    const qId = targetQId || currentQuestion?.id;
    if (!qId) return;

    const targetQ = questions.find((q) => q.id === qId);
    if (!targetQ || !targetQ.correct_answer) return;

    const isShown = targetQ.show_correct_answer === 1;
    const nextVal = !isShown;

    setQuestions((prev) =>
      prev.map((q) =>
        q.id === qId
          ? {
              ...q,
              show_correct_answer: nextVal ? 1 : 0,
              answer_revealed: nextVal ? 1 : q.answer_revealed,
              show_results: nextVal ? 1 : q.show_results
            }
          : q
      )
    );

    if (currentQuestion && currentQuestion.id === qId) {
      setShowCorrectAnswer(nextVal);
      setCurrentQuestion((prev) =>
        prev
          ? {
              ...prev,
              show_correct_answer: nextVal ? 1 : 0,
              answer_revealed: nextVal ? 1 : prev.answer_revealed,
              show_results: nextVal ? 1 : prev.show_results
            }
          : prev
      );
      if (nextVal) {
        setPoll((prev) => (prev ? { ...prev, show_results: true } : prev));
      }
    }

    socketRef.current.emit('poll:host_toggle_correct_answer', {
      pollId: id,
      questionId: qId,
      show_correct: nextVal
    });
  };

  const handleRevealAndMarkCurrent = () => {
    if (!poll || !socketRef.current || !currentQuestion) return;
    setShowCorrectAnswer(true);
    setCurrentQuestion((prev) => (prev ? { ...prev, answer_revealed: 1, show_correct_answer: 1, show_results: 1 } : prev));
    setQuestions((prev) =>
      prev.map((q) => (q.id === currentQuestion.id ? { ...q, answer_revealed: 1, show_correct_answer: 1, show_results: 1 } : q))
    );
    setPoll((prev) => (prev ? { ...prev, show_results: true, show_correct_answer: true } : prev));
    socketRef.current.emit('poll:host_toggle_correct_answer', {
      pollId: id,
      questionId: currentQuestion.id,
      show_correct: true
    });
    setMarkPromptTargetQId(null);
  };

  const handlePurgeData = async () => {
    if (purgingData || !poll) return;
    setPurgingData(true);
    try {
      await pollApi.purgeData(poll.id);
      setLiveResults(null);
      setQaQuestions([]);
      setLeaderboard([]);
      setShowCorrectAnswer(false);
      setShowLeaderboard(false);
      setQuestions((prev) => prev.map((q) => ({ ...q, results: null, answer_revealed: 0, show_correct_answer: 0 })));
      setCurrentQuestion((prev) => (prev ? { ...prev, answer_revealed: 0, show_correct_answer: 0 } : prev));
      setPoll((prev) => (prev ? { ...prev, show_correct_answer: false, show_leaderboard: false, voting_open: true } : prev));
      setPollStats((prev) => prev ? { ...prev, totalVotes: 0, uniqueParticipants: 0, uniqueVoters: 0, pollEngagementPct: 0, qaEngagementPct: 0, qaCount: 0 } : null);
      setShowPurgeModal(false);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to purge poll data');
    } finally {
      setPurgingData(false);
    }
  };

  const handleToggleLeaderboard = () => {
    if (!poll || !socketRef.current) return;
    const nextVal = !showLeaderboard;
    setShowLeaderboard(nextVal);
    socketRef.current.emit('poll:host_toggle_leaderboard', {
      pollId: id,
      show_leaderboard: nextVal
    });
  };

  const handleToggleQaDisplay = () => {
    if (!poll || !socketRef.current) return;
    const nextVal = !poll.show_qa_on_screen;
    socketRef.current.emit('poll:host_toggle_qa_display', {
      pollId: id,
      show_qa: nextVal
    });
    setPoll((prev) => (prev ? { ...prev, show_qa_on_screen: nextVal } : prev));
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
      <div className="max-w-7xl mx-auto px-4 py-16 text-center">
        <div className="w-8 h-8 border-3 border-brand-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-slate-500 text-sm font-medium">Loading live poll session...</p>
      </div>
    );
  }

  if (error || !poll) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center">
        <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-3" />
        <h2 className="text-lg font-bold text-slate-900 mb-1">Poll Error</h2>
        <p className="text-slate-500 text-sm mb-6">{error || 'Poll not found'}</p>
        <Link
          to="/dashboard"
          className="px-4 py-2 rounded-xl bg-brand-600 text-white text-xs font-semibold"
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <SEO title={`Control Poll: ${poll.title}`} />

      {/* Top Header Card */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-sm mb-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <Link
              to="/dashboard"
              className="inline-flex items-center text-xs font-semibold text-slate-500 hover:text-slate-800 mb-2 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5 mr-1" />
              Back to Dashboard
            </Link>
            <div className="flex items-center space-x-3">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
                {poll.title}
              </h1>
              {poll.status === 'live' && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 animate-pulse">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5" />
                  LIVE
                </span>
              )}
              {poll.status === 'draft' && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                  DRAFT
                </span>
              )}
              {poll.status === 'closed' && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                  CLOSED
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {poll.description || 'Live interactive audience poll.'}
            </p>
          </div>

          {/* Top Quick Actions */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Live Status Switcher */}
            {poll.status === 'draft' && (
              <button
                type="button"
                onClick={() => handleSetStatus('live')}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm shadow-emerald-600/20 transition flex items-center space-x-1.5"
              >
                <Play className="w-3.5 h-3.5 fill-white" />
                <span>Start Live Poll</span>
              </button>
            )}
            {poll.status === 'live' && (
              <button
                type="button"
                onClick={() => handleSetStatus('closed')}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-sm shadow-rose-600/20 transition flex items-center space-x-1.5"
              >
                <StopCircle className="w-3.5 h-3.5" />
                <span>End Session</span>
              </button>
            )}
            {poll.status === 'closed' && (
              <button
                type="button"
                onClick={() => handleSetStatus('live')}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition flex items-center space-x-1.5"
              >
                <Play className="w-3.5 h-3.5 fill-white" />
                <span>Resume Poll</span>
              </button>
            )}

            {/* Projector / Presenter Screen */}
            <a
              href={`/p/${encodeURIComponent(poll.code)}/present`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs shadow-sm transition flex items-center space-x-1.5"
            >
              <Tv className="w-3.5 h-3.5" />
              <span>Present Screen</span>
              <ArrowUpRight className="w-3 h-3 text-slate-400" />
            </a>

            {/* Toggle Q&A on Screen */}
            {poll.qa_enabled && (
              <button
                type="button"
                onClick={handleToggleQaDisplay}
                className={`px-3 py-2 rounded-xl border text-xs font-semibold shadow-xs transition flex items-center space-x-1.5 ${
                  poll.show_qa_on_screen
                    ? 'bg-brand-50 border-brand-300 text-brand-700'
                    : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
                }`}
                title={poll.show_qa_on_screen ? 'Hide Q&A sidebar on presenter screen' : 'Show Q&A sidebar on presenter screen'}
              >
                <MessageSquare className="w-3.5 h-3.5 text-brand-600" />
                <span>{poll.show_qa_on_screen ? 'Q&A on Screen: ON' : 'Show Q&A on Screen'}</span>
              </button>
            )}

            {/* Purge Data */}
            <button
              type="button"
              onClick={() => setShowPurgeModal(true)}
              className="px-3 py-2 rounded-xl border border-slate-300 bg-white hover:bg-rose-50 hover:border-rose-300 text-slate-600 hover:text-rose-600 shadow-sm transition flex items-center space-x-1.5 text-xs font-semibold cursor-pointer"
              title="Purge all responses, quiz players, and Q&A from this poll"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-500" />
              <span className="hidden sm:inline">Purge Data</span>
            </button>

            {/* Edit Poll */}
            <Link
              to={`/polls/${poll.id}/edit`}
              className="p-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 shadow-sm transition"
              title="Edit in Poll Builder"
            >
              <Settings className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {/* Info Badges Row */}
        <div className="pt-4 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-600">
          <div className="flex items-center space-x-4">
            {/* Join PIN with copy action */}
            <div className="flex items-center space-x-1.5">
              <span className="text-slate-400 font-medium">Participant PIN:</span>
              <button
                type="button"
                onClick={copyCodeToClipboard}
                className="font-mono font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-md flex items-center space-x-1 hover:bg-indigo-100 transition"
                title="Click to copy join code"
              >
                <span>{poll.code}</span>
                {copiedCode ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3 text-indigo-400" />}
              </button>
            </div>

            {/* Active Voters Counter (strictly excluding host and presenter!) */}
            <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-700 font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <Users className="w-3.5 h-3.5 text-emerald-600" />
              <span>{participantCount}</span>
              <span className="text-slate-400 font-normal">Active Voters</span>
            </div>
          </div>

          <div className="text-slate-500">
            Attendees join at: <span className="font-semibold text-slate-700">ask.urspace.com/join</span>
          </div>
        </div>
      </div>

      {/* Tabs Bar matching SurveyAnalytics */}
      <div className="flex items-center border-b border-slate-200 mb-6 space-x-8">
        <button
          type="button"
          onClick={() => setActiveTab('live')}
          className={`pb-3 text-sm font-bold flex items-center space-x-2 border-b-2 transition-all ${
            activeTab === 'live'
              ? 'border-brand-600 text-brand-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Radio className="w-4 h-4" />
          <span>Live Question & Controls</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('qa')}
          className={`pb-3 text-sm font-bold flex items-center space-x-2 border-b-2 transition-all relative ${
            activeTab === 'qa'
              ? 'border-brand-600 text-brand-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          <span>Audience Q&A</span>
          <span className="ml-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600">
            {qaQuestions.length}
          </span>
          {pendingCount > 0 && (
            <span className="w-2 h-2 rounded-full bg-amber-500 absolute top-1 right-0" />
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('analytics')}
          className={`pb-3 text-sm font-bold flex items-center space-x-2 border-b-2 transition-all ${
            activeTab === 'analytics'
              ? 'border-brand-600 text-brand-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span>Results & Export</span>
        </button>
      </div>

      {/* TAB 1: Live Question & Poll Control */}
      {activeTab === 'live' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Questions List (4 cols) */}
          <div className="lg:col-span-4 bg-white border border-slate-200/90 rounded-2xl p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Questions ({questions.length})
              </span>
              <span className="text-[11px] text-slate-400">Click to activate</span>
            </div>

            <div className="space-y-2">
              {questions.map((q, idx) => {
                const isActive = currentQuestion?.id === q.id;
                let TypeIcon = BarChart3;
                if (q.question_type === 'word_cloud') TypeIcon = Cloud;
                if (q.question_type === 'rating') TypeIcon = Star;
                if (q.question_type === 'ranking') TypeIcon = ListOrdered;

                const qVotes = isActive ? (liveResults?.totalVotes ?? q.results?.totalVotes ?? 0) : (q.results?.totalVotes || 0);

                return (
                  <div
                    key={q.id}
                    onClick={() => handleSelectQuestion(q.id)}
                    className={`w-full text-left p-3 rounded-xl border transition-all flex items-start space-x-3 cursor-pointer ${
                      isActive
                        ? 'border-brand-500 bg-brand-50/40 text-brand-900 shadow-sm ring-1 ring-brand-500/30'
                        : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div
                      className={`w-6 h-6 rounded-lg text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5 ${
                        isActive ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-500'
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
                          <TypeIcon className="w-3 h-3 text-brand-600" />
                          <span className="capitalize">{q.question_type.replace('_', ' ')}</span>
                        </span>
                        <span>•</span>
                        <span className="font-semibold text-slate-600">
                          {qVotes} votes / {participantCount} participants
                        </span>
                        {isActive && (
                          <span className="text-emerald-600 font-bold uppercase tracking-wider">
                            • Live
                          </span>
                        )}
                      </div>

                      {/* Status Indicators & Per-Question Toggles */}
                      <div className="flex flex-wrap items-center gap-1.5 mt-2 pt-2 border-t border-slate-100">
                        {/* 1. Results Visible / Hidden */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleQuestionResults(q.id);
                          }}
                          className={`px-2 py-0.5 rounded-md text-[10px] font-semibold border flex items-center space-x-1 transition cursor-pointer ${
                            q.show_results !== false && q.show_results !== 0
                              ? 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'
                              : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200'
                          }`}
                          title={q.show_results !== false && q.show_results !== 0 ? 'Results are visible to participants (click to hide)' : 'Results are hidden from participants (click to reveal)'}
                        >
                          {q.show_results !== false && q.show_results !== 0 ? (
                            <>
                              <Eye className="w-3 h-3 text-blue-600" />
                              <span>Results: On</span>
                            </>
                          ) : (
                            <>
                              <EyeOff className="w-3 h-3 text-slate-400" />
                              <span>Results: Hidden</span>
                            </>
                          )}
                        </button>

                        {/* 2. Marked / Unmarked Indicator */}
                        {Boolean(q.correct_answer) && (
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-semibold border flex items-center space-x-1 ${
                              q.answer_revealed === 1
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200 font-bold'
                                : 'bg-slate-100 text-slate-500 border-slate-200'
                            }`}
                            title={q.answer_revealed === 1 ? 'Responses locked & marked' : 'Responses not yet marked'}
                          >
                            <Check className="w-3 h-3 text-emerald-600" />
                            <span>{q.answer_revealed === 1 ? 'Marked' : 'Unmarked'}</span>
                          </span>
                        )}

                        {/* 3. Correct Answer On Display Indicator & Toggle */}
                        {Boolean(q.correct_answer) && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleQuestionCorrectAnswer(q.id);
                            }}
                            className={`px-2 py-0.5 rounded-md text-[10px] font-semibold border flex items-center space-x-1 transition cursor-pointer ${
                              q.show_correct_answer === 1
                                ? 'bg-purple-50 text-purple-800 border-purple-200 font-bold hover:bg-purple-100'
                                : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200'
                            }`}
                            title={q.show_correct_answer === 1 ? 'Correct answer is on display (click to hide)' : `Correct answer is hidden (click to display: ${q.correct_answer})`}
                          >
                            <CheckCircle2 className={`w-3 h-3 ${q.show_correct_answer === 1 ? 'text-purple-600' : 'text-slate-400'}`} />
                            <span>{q.show_correct_answer === 1 ? 'Answer: Shown' : 'Answer: Hidden'}</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="pt-2">
              <Link
                to={`/polls/${poll.id}/edit`}
                className="w-full py-2 px-3 rounded-xl border border-dashed border-slate-300 hover:border-brand-500 hover:bg-brand-50/20 text-slate-600 hover:text-brand-600 text-xs font-medium flex items-center justify-center space-x-1.5 transition"
              >
                <Settings className="w-3.5 h-3.5" />
                <span>Add / Edit Questions in Builder</span>
              </Link>
            </div>
          </div>

          {/* Right Column: Live Stage & Host Controls (8 cols) */}
          <div className="lg:col-span-8 space-y-6">
            {currentQuestion ? (
              <>
                <div className="bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-8 shadow-sm space-y-6">
                {/* Control Action Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-3">
                  <div className="flex items-center space-x-2">
                    <span className="px-2.5 py-0.5 rounded-lg bg-slate-900 text-white text-xs font-bold">
                      Question {currentQIndex + 1} of {questions.length}
                    </span>
                    <span className="text-xs text-slate-500 capitalize font-medium">
                      {currentQuestion.question_type.replace('_', ' ')}
                    </span>
                  </div>

                  {/* Switch Controls: Lock Voting & Show Results */}
                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={handleToggleVoting}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition ${
                        poll.voting_open
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                          : 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100'
                      }`}
                      title={poll.voting_open ? 'Click to lock voting' : 'Click to unlock voting'}
                    >
                      {poll.voting_open ? (
                        <>
                          <Unlock className="w-3.5 h-3.5" />
                          <span>Voting Open</span>
                        </>
                      ) : (
                        <>
                          <Lock className="w-3.5 h-3.5" />
                          <span>Voting Locked</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleToggleQuestionResults(currentQuestion.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition ${
                        currentQuestion.show_results !== false && currentQuestion.show_results !== 0
                          ? 'bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100'
                          : 'bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200'
                      }`}
                      title={currentQuestion.show_results !== false && currentQuestion.show_results !== 0 ? 'Click to hide results from audience' : 'Click to reveal results'}
                    >
                      {currentQuestion.show_results !== false && currentQuestion.show_results !== 0 ? (
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

                    {currentQuestion.question_type === 'multiple_choice' && currentQuestion.correct_answer && (
                      <button
                        type="button"
                        onClick={() => handleToggleQuestionCorrectAnswer(currentQuestion.id)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition ${
                          currentQuestion.show_correct_answer === 1 || showCorrectAnswer
                            ? 'bg-emerald-600 text-white border border-emerald-700 shadow-sm hover:bg-emerald-700'
                            : 'bg-emerald-50 text-emerald-700 border border-emerald-300 hover:bg-emerald-100'
                        }`}
                        title={currentQuestion.show_correct_answer === 1 || showCorrectAnswer ? 'Click to hide correct answer from audience' : `Click to reveal correct answer: ${currentQuestion.correct_answer}`}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>{currentQuestion.show_correct_answer === 1 || showCorrectAnswer ? 'Hide Correct Answer' : 'Reveal Correct Answer'}</span>
                      </button>
                    )}

                    {Boolean(poll.is_quiz_mode) && (
                      <button
                        type="button"
                        onClick={handleToggleLeaderboard}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition ${
                          showLeaderboard
                            ? 'bg-amber-500 text-white border border-amber-600 shadow-sm hover:bg-amber-600'
                            : 'bg-amber-50 text-amber-800 border border-amber-300 hover:bg-amber-100'
                        }`}
                        title={showLeaderboard ? 'Click to hide leaderboard from audience' : 'Click to show quiz leaderboard on screen'}
                      >
                        <Trophy className="w-3.5 h-3.5" />
                        <span>{showLeaderboard ? 'Leaderboard Visible' : 'Show Leaderboard'}</span>
                        {leaderboard.length > 0 && (
                          <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${showLeaderboard ? 'bg-amber-700/60 text-white' : 'bg-amber-200 text-amber-900'}`}>
                            {leaderboard.length}
                          </span>
                        )}
                      </button>
                    )}

                    {/* Prev / Next buttons */}
                    <div className="flex items-center space-x-1 pl-2 border-l border-slate-200">
                      <button
                        type="button"
                        disabled={isFirstQ}
                        onClick={handlePrevQuestion}
                        className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 disabled:opacity-30 disabled:pointer-events-none transition"
                        title="Previous Question"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        disabled={isLastQ}
                        onClick={handleNextQuestion}
                        className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 disabled:opacity-30 disabled:pointer-events-none transition"
                        title="Next Question"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Question Prompt */}
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                    {currentQuestion.question_text}
                  </h2>
                  {currentQuestion.correct_answer && (
                    <div className="mt-2.5 flex items-center space-x-2 text-xs">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 font-semibold shadow-2xs">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Correct Answer: <strong>{currentQuestion.correct_answer}</strong></span>
                      </span>
                      <span className={`text-[11px] font-semibold ${showCorrectAnswer ? 'text-emerald-700' : 'text-slate-400'}`}>
                        {showCorrectAnswer ? '• Revealed on presenter and audience screens' : '• Hidden from audience until revealed'}
                      </span>
                    </div>
                  )}
                </div>

                {/* Live Graphic Canvas */}
                <div className="pt-2">
                  <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center space-x-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-brand-600" />
                      <span>Live Incoming Answers</span>
                    </span>
                    <span className="text-xs font-semibold text-slate-700">
                      {liveResults?.totalVotes || 0} votes recorded / {participantCount} active {participantCount === 1 ? 'participant' : 'participants'}
                      {participantCount > 0 && (
                        <span className="ml-1 text-slate-400 font-normal">
                          ({Math.round(((liveResults?.totalVotes || 0) / participantCount) * 100)}% turnout)
                        </span>
                      )}
                    </span>
                  </div>

                  {/* Multiple Choice Bar Chart */}
                  {currentQuestion.question_type === 'multiple_choice' && (
                    <LiveBarChart
                      results={liveResults?.results || []}
                      totalVotes={liveResults?.totalVotes || 0}
                      correctAnswer={currentQuestion.correct_answer}
                      showCorrectAnswer={showCorrectAnswer}
                    />
                  )}

                  {/* Word Cloud */}
                  {currentQuestion.question_type === 'word_cloud' && (
                    <div className="py-2">
                      <WordCloud words={liveResults?.words || []} />
                    </div>
                  )}

                  {/* Rating Chart */}
                  {currentQuestion.question_type === 'rating' && (
                    <LiveRatingChart
                      ratingData={liveResults}
                      average={liveResults?.average || 0}
                      maxRating={liveResults?.maxRating || 5}
                      totalVotes={liveResults?.totalVotes || 0}
                      counts={liveResults?.counts || {}}
                    />
                  )}

                  {/* Ranking Chart */}
                  {currentQuestion.question_type === 'ranking' && (
                    <LiveRankingChart
                      rankingData={liveResults}
                      totalVotes={liveResults?.totalVotes || 0}
                    />
                  )}
                </div>
              </div>

              {/* Standalone Quiz Standings Card below the active question card */}
              {Boolean(poll.is_quiz_mode) && (
                <div className="bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-7 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-2.5">
                      <div className="p-2 rounded-xl bg-amber-50 text-amber-600 border border-amber-200">
                        <Trophy className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-900">
                          Quiz Standings
                        </h4>
                        <p className="text-xs text-slate-500">
                          {leaderboard.length} {leaderboard.length === 1 ? 'player' : 'players'} registered
                        </p>
                      </div>
                      {showLeaderboard && (
                        <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 text-xs font-bold border border-amber-300">
                          Live on Screen
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={handleToggleLeaderboard}
                      className={`text-xs font-semibold px-3 py-1.5 rounded-xl border transition cursor-pointer ${
                        showLeaderboard
                          ? 'bg-amber-100 text-amber-800 border-amber-300 hover:bg-amber-200'
                          : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      {showLeaderboard ? 'Hide Leaderboard from Screen' : 'Show Leaderboard on Screen'}
                    </button>
                  </div>

                  {leaderboard.length === 0 ? (
                    <div className="py-6 text-center text-xs text-slate-400 italic bg-slate-50/60 rounded-xl border border-dashed border-slate-200">
                      No participants have scored points yet. Correct answers will award points when marked or revealed.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                      {leaderboard.map((player, idx) => (
                        <div
                          key={player.participant_id || idx}
                          className={`p-3 rounded-xl border flex items-center justify-between text-xs transition ${
                            idx === 0
                              ? 'bg-amber-50/80 border-amber-300 font-bold text-amber-950 shadow-xs'
                              : idx === 1
                              ? 'bg-slate-100/80 border-slate-300 font-semibold text-slate-800'
                              : idx === 2
                              ? 'bg-orange-50/80 border-orange-200 font-semibold text-orange-950'
                              : 'bg-white border-slate-200 text-slate-700'
                          }`}
                        >
                          <div className="flex items-center space-x-2.5 truncate">
                            <span className="w-5 text-center font-bold text-slate-400">
                              {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`}
                            </span>
                            <span className="text-lg">{player.avatar || '🚀'}</span>
                            <span className="truncate">{player.name || 'Anonymous'}</span>
                          </div>
                          <span className="font-extrabold text-amber-600 ml-2 whitespace-nowrap bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md">
                            {player.score} {player.score === 1 ? 'pt' : 'pts'}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
            ) : (
              <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center">
                <BarChart3 className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                <h3 className="text-base font-bold text-slate-900 mb-1">No Questions Added</h3>
                <p className="text-xs text-slate-500 mb-4">Add questions to your poll to start collecting live votes.</p>
                <Link
                  to={`/polls/${poll.id}/edit`}
                  className="px-4 py-2 rounded-xl bg-brand-600 text-white text-xs font-semibold"
                >
                  Open Poll Builder
                </Link>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: Audience Q&A Moderation */}
      {activeTab === 'qa' && (
        <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 mb-4 border-b border-slate-100 gap-3">
            <div>
              <h3 className="text-base font-bold text-slate-900">Audience Questions & Moderation</h3>
              <p className="text-xs text-slate-500">
                Attendees submit and upvote questions in real-time. Highlight top questions on the projector.
              </p>
            </div>

            {/* Q&A sub-filters */}
            <div className="flex items-center space-x-1 text-xs">
              <button
                type="button"
                onClick={() => setQaFilter('all')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition ${
                  qaFilter === 'all'
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                Live ({qaQuestions.filter((q) => q.is_approved === 1 && !q.is_answered).length})
              </button>
              {poll.qa_moderation && (
                <button
                  type="button"
                  onClick={() => setQaFilter('pending')}
                  className={`px-3 py-1.5 rounded-lg font-semibold flex items-center space-x-1 transition ${
                    qaFilter === 'pending'
                      ? 'bg-amber-100 text-amber-800 border border-amber-300'
                      : 'text-slate-600 hover:text-amber-800'
                  }`}
                >
                  <span>Pending ({pendingCount})</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setQaFilter('answered')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition ${
                  qaFilter === 'answered'
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                Answered ({qaQuestions.filter((q) => q.is_answered === 1).length})
              </button>
            </div>
          </div>

          {filteredQa.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-xs">
              No questions found in this view.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredQa.map((item) => (
                <div
                  key={item.id}
                  className={`py-4 px-3 rounded-xl transition flex items-start justify-between gap-4 ${
                    item.is_highlighted ? 'bg-amber-50/60 border border-amber-200' : ''
                  }`}
                >
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-semibold text-slate-900">
                        {item.question_text}
                      </span>
                      {item.is_highlighted === 1 && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                          Pinned on Stage
                        </span>
                      )}
                    </div>
                    <div className="flex items-center space-x-2 text-xs text-slate-400">
                      <span>Asked by {item.author_name || 'Anonymous'}</span>
                      <span>•</span>
                      <span>{new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>

                  {/* Actions & Upvotes */}
                  <div className="flex items-center space-x-2 flex-shrink-0">
                    <div className="flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 text-xs font-bold">
                      <ThumbsUp className="w-3.5 h-3.5" />
                      <span>{item.upvotes}</span>
                    </div>

                    {item.is_approved === 0 && (
                      <button
                        type="button"
                        onClick={() => handleModerateQa(item.id, 'approve')}
                        className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs"
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
                          className={`p-1.5 rounded-lg border transition ${
                            item.is_highlighted
                              ? 'bg-amber-100 text-amber-800 border-amber-300'
                              : 'border-slate-200 text-slate-500 hover:text-slate-800'
                          }`}
                          title={item.is_highlighted ? 'Remove from projector' : 'Pin to projector stage'}
                        >
                          <Pin className="w-4 h-4" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleModerateQa(item.id, 'answer')}
                          className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 transition"
                          title="Mark as Answered"
                        >
                          <CheckCircle className="w-4 h-4" />
                        </button>
                      </>
                    )}

                    {item.is_approved === 1 && item.is_answered === 1 && (
                      <button
                        type="button"
                        onClick={() => handleModerateQa(item.id, 'unanswer')}
                        className="px-2.5 py-1 rounded-lg border border-slate-200 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 font-semibold text-xs flex items-center space-x-1.5 transition"
                        title="Mark as unanswered (move back to Live)"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Reopen</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => handleModerateQa(item.id, 'delete')}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                      title="Delete question"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: Summary Analytics & Export */}
      {activeTab === 'analytics' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Total Votes</div>
              <div className="text-2xl sm:text-3xl font-extrabold text-slate-900">
                {questions.reduce((sum, q) => sum + (q.results?.totalVotes || 0), 0)}
              </div>
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Active Voters</div>
              <div className="text-2xl sm:text-3xl font-extrabold text-emerald-600">{participantCount}</div>
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Poll Turnout</div>
              <div className="text-2xl sm:text-3xl font-extrabold text-indigo-600">
                {pollStats?.pollEngagementPct ?? 0}%
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                {pollStats?.uniqueVoters || 0} of {pollStats?.totalAudience || 0} attended
              </div>
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Q&A Engagement</div>
              <div className="text-2xl sm:text-3xl font-extrabold text-violet-600">
                {pollStats?.qaEngagementPct ?? 0}%
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                {pollStats?.uniqueQaParticipants || 0} asked/upvoted
              </div>
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Questions</div>
              <div className="text-2xl sm:text-3xl font-extrabold text-slate-900">{questions.length}</div>
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Q&A Questions</div>
              <div className="text-2xl sm:text-3xl font-extrabold text-slate-900">{qaQuestions.length}</div>
            </div>
          </div>

          {/* Quiz Mode Final Leaderboard */}
          {Boolean(poll.is_quiz_mode) && (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
              <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
                <div className="flex items-center space-x-2">
                  <Trophy className="w-5 h-5 text-amber-500" />
                  <h3 className="text-base font-bold text-slate-900">Quiz Leaderboard & Final Scores</h3>
                </div>
                <span className="text-xs font-semibold text-slate-500">
                  {leaderboard.length} Total Ranked Players
                </span>
              </div>

              {leaderboard.length === 0 ? (
                <p className="text-xs text-slate-400 italic py-4 text-center">No participants have submitted answers yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider">
                        <th className="py-2.5 px-3 w-16">Rank</th>
                        <th className="py-2.5 px-3">Participant</th>
                        <th className="py-2.5 px-3 text-right">Score</th>
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

          {/* Danger Zone: Purge Data */}
          <div className="bg-rose-50/50 border border-rose-200 rounded-2xl p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
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

          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900">Export All Poll Responses</h3>
              <p className="text-xs text-slate-500">
                Download a clean CSV spreadsheet of all participant answers, ratings, and word cloud submissions.
              </p>
            </div>
            <a
              href={pollApi.getCsvExportUrl(poll.id)}
              download
              className="px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-semibold text-xs shadow-sm transition flex items-center space-x-2"
            >
              <Download className="w-4 h-4" />
              <span>Download CSV</span>
            </a>
          </div>
        </div>
      )}

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
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={purgingData}
                onClick={handlePurgeData}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-bold text-xs shadow-sm transition flex items-center space-x-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{purgingData ? 'Purging Data...' : 'Yes, Purge All Data'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Question Navigation: Correct Answer Marking Prompt Modal */}
      {markPromptTargetQId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-xl border border-slate-200 space-y-5 animate-in zoom-in-95">
            <div className="flex items-center space-x-3 text-amber-600">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-900 text-lg leading-tight">Mark Correct Answer?</h3>
                <p className="text-xs text-slate-500">Lock responses and calculate participant scores</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3.5 rounded-xl border border-slate-200/80">
              The current question has a correct answer designated (<strong>{currentQuestion?.correct_answer}</strong>).
              Moving away can lock participant submissions so they can no longer be edited or changed.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
              <button
                type="button"
                onClick={handleRevealAndMarkCurrent}
                className="w-full px-4 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition flex items-center justify-center space-x-2 cursor-pointer"
              >
                <Eye className="w-4 h-4" />
                <span>Reveal & Mark Answers</span>
              </button>

              <button
                type="button"
                onClick={() => executeQuestionChange(markPromptTargetQId, 'mark_only')}
                className="w-full px-4 py-3 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs shadow-sm transition flex items-center justify-center space-x-2 cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>Just Mark Answers</span>
              </button>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => executeQuestionChange(markPromptTargetQId, null)}
                className="text-xs font-semibold text-slate-500 hover:text-slate-800 transition cursor-pointer"
              >
                Leave Unmarked & Continue
              </button>
              <button
                type="button"
                onClick={() => setMarkPromptTargetQId(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
              >
                Stay on Question
              </button>
            </div>
          </div>
        </div>
      )}

      {/* End main */}
    </div>
  );
}
