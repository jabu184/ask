import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { io } from 'socket.io-client';
import QRCode from 'qrcode';
import { publicPollApi } from '../services/api';
import WordCloud from '../components/WordCloud';
import LiveBarChart from '../components/LiveBarChart';
import LiveRatingChart from '../components/LiveRatingChart';
import LiveRankingChart from '../components/LiveRankingChart';
import SEO from '../components/SEO';
import {
  Maximize2,
  Minimize2,
  Users,
  QrCode,
  ThumbsUp,
  Sparkles,
  Zap,
  Lock,
  EyeOff,
  AlertCircle,
  Pin,
  MessageSquare,
  ChevronRight,
  HelpCircle,
  CheckCircle2,
  Trophy,
  Star
} from 'lucide-react';

export default function PollPresenter() {
  const { code } = useParams();
  const socketRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [poll, setPoll] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [liveResults, setLiveResults] = useState(null);
  const [showResults, setShowResults] = useState(true);
  const [votingOpen, setVotingOpen] = useState(true);
  const [participantCount, setParticipantCount] = useState(0);
  const [activeParticipantIds, setActiveParticipantIds] = useState([]);
  const [qaQuestions, setQaQuestions] = useState([]);
  const [showQaSidebar, setShowQaSidebar] = useState(false);
  const [showCorrectAnswer, setShowCorrectAnswer] = useState(false);
  const [correctAnswer, setCorrectAnswer] = useState(null);
  const [isQuizMode, setIsQuizMode] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [leaderboard, setLeaderboard] = useState([]);
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Full join URL
  const joinUrl = `${window.location.origin}/join/${encodeURIComponent(code || '')}`;

  useEffect(() => {
    // Generate high-resolution QR Code data URL with dark on white contrast
    QRCode.toDataURL(joinUrl, {
      width: 440,
      margin: 1,
      color: {
        dark: '#0f172a', // slate-900
        light: '#ffffff'
      }
    })
      .then((url) => setQrDataUrl(url))
      .catch((e) => console.error('QR code generation error', e));
  }, [joinUrl]);

  useEffect(() => {
    let socket;

    const initPresenter = async () => {
      try {
        setLoading(true);
        const data = await publicPollApi.lookupByCode(code, 'presenter');
        setPoll(data.poll);
        setCurrentQuestion(data.currentQuestion);
        setLiveResults(data.liveResults);
        setShowResults(Boolean(data.poll.show_results));
        setVotingOpen(Boolean(data.poll.voting_open));
        setShowQaSidebar(Boolean(data.poll.show_qa_on_screen));
        setShowCorrectAnswer(Boolean(data.poll.show_correct_answer));
        setCorrectAnswer(data.currentQuestion?.correct_answer || null);
        setIsQuizMode(Boolean(data.poll.is_quiz_mode));
        setShowLeaderboard(Boolean(data.poll.show_leaderboard));
        setLeaderboard(data.leaderboard || []);
        setQaQuestions(data.qaQuestions || []);

        // Connect WebSocket with isPresenter: true
        socket = io({
          path: '/socket.io',
          transports: ['websocket', 'polling']
        });
        socketRef.current = socket;

        socket.on('connect', () => {
          socket.emit('poll:join', {
            pollId: data.poll.id,
            participantId: 'presenter_' + Math.random().toString(36).substring(2, 7),
            isHost: false,
            isPresenter: true
          });
        });

        socket.on('poll:state', (state) => {
          if (state.poll) {
            setPoll(state.poll);
            setShowResults(Boolean(state.poll.show_results));
            setVotingOpen(Boolean(state.poll.voting_open));
            if (typeof state.poll.show_qa_on_screen === 'boolean') {
              setShowQaSidebar(state.poll.show_qa_on_screen);
            }
            if (typeof state.poll.show_correct_answer !== 'undefined') {
              setShowCorrectAnswer(Boolean(state.poll.show_correct_answer));
            }
            if (typeof state.poll.is_quiz_mode !== 'undefined') {
              setIsQuizMode(Boolean(state.poll.is_quiz_mode));
            }
            if (typeof state.poll.show_leaderboard !== 'undefined') {
              setShowLeaderboard(Boolean(state.poll.show_leaderboard));
            }
          }
          if (state.currentQuestion) {
            setCurrentQuestion(state.currentQuestion);
            if (state.currentQuestion.correct_answer !== undefined) {
              setCorrectAnswer(state.currentQuestion.correct_answer || null);
            }
          }
          if (state.liveResults) setLiveResults(state.liveResults);
          if (state.leaderboard) setLeaderboard(state.leaderboard);
          if (state.qaQuestions) setQaQuestions(state.qaQuestions);
          if (typeof state.participantCount === 'number') setParticipantCount(state.participantCount);
          if (state.activeParticipantIds) setActiveParticipantIds(state.activeParticipantIds);
          setLoading(false);
        });

        socket.on('poll:question_changed', (payload) => {
          setCurrentQuestion(payload.currentQuestion);
          setLiveResults(payload.liveResults);
          setVotingOpen(true);
          setShowResults(typeof payload.show_results !== 'undefined' ? Boolean(payload.show_results) : true);
          setShowCorrectAnswer(Boolean(payload.show_correct_answer));
          setCorrectAnswer(payload.currentQuestion?.correct_answer || null);
        });

        socket.on('poll:correct_answer_toggled', ({ questionId, show_correct_answer, correctAnswer }) => {
          setShowCorrectAnswer(Boolean(show_correct_answer));
          if (show_correct_answer) {
            setShowResults(true);
          }
          setCorrectAnswer(show_correct_answer ? (correctAnswer || null) : null);
          setCurrentQuestion((prev) => (prev && (!questionId || prev.id === questionId) ? {
            ...prev,
            show_correct_answer: Boolean(show_correct_answer),
            correct_answer: show_correct_answer ? (correctAnswer || prev.correct_answer) : null
          } : prev));
        });

        socket.on('poll:leaderboard_toggled', ({ show_leaderboard, leaderboard: lb }) => {
          setShowLeaderboard(Boolean(show_leaderboard));
          if (lb) setLeaderboard(lb);
        });

        socket.on('poll:leaderboard_update', ({ leaderboard: lb }) => {
          if (lb) setLeaderboard(lb);
        });

        socket.on('poll:voting_toggled', (payload) => {
          setVotingOpen(payload.voting_open);
        });

        socket.on('poll:results_toggled', (payload) => {
          setShowResults(payload.show_results);
          if (payload.liveResults) setLiveResults(payload.liveResults);
        });

        socket.on('poll:results_update', (payload) => {
          if (payload.results) {
            setLiveResults(payload.results);
          }
        });

        socket.on('poll:participant_count', (payload) => {
          setParticipantCount(payload.count || 0);
          if (payload.activeParticipantIds) {
            setActiveParticipantIds(payload.activeParticipantIds);
          }
        });

        socket.on('poll:data_purged', () => {
          setLiveResults(null);
          setQaQuestions([]);
          setLeaderboard([]);
          setShowCorrectAnswer(false);
          setShowLeaderboard(false);
          setPoll((prev) => (prev ? { ...prev, show_correct_answer: false, show_leaderboard: false, voting_open: true } : prev));
          setCurrentQuestion((prev) => (prev ? { ...prev, answer_revealed: false, show_correct_answer: 0 } : prev));
        });

        socket.on('poll:question_marked_toggled', ({ questionId, answer_revealed, show_correct_answer, correctAnswer, leaderboard: lb }) => {
          setCurrentQuestion((prev) => {
            if (prev && prev.id === questionId) {
              return {
                ...prev,
                answer_revealed: Boolean(answer_revealed),
                show_correct_answer: Boolean(show_correct_answer),
                correct_answer: show_correct_answer ? (correctAnswer || prev.correct_answer) : null
              };
            }
            return prev;
          });
          if (show_correct_answer !== undefined) {
            setShowCorrectAnswer(Boolean(show_correct_answer));
            if (show_correct_answer) setShowResults(true);
            setCorrectAnswer(show_correct_answer ? (correctAnswer || null) : null);
          }
          if (lb) setLeaderboard(lb);
        });

        socket.on('poll:question_reset', ({ questionId, results, leaderboard: lb }) => {
          setCurrentQuestion((prev) => {
            if (prev && prev.id === questionId) {
              return {
                ...prev,
                answer_revealed: false,
                show_correct_answer: 0,
                correct_answer: null
              };
            }
            return prev;
          });
          setLiveResults(results || null);
          setShowCorrectAnswer(false);
          setCorrectAnswer(null);
          if (lb) setLeaderboard(lb);
        });

        socket.on('poll:status_changed', ({ status }) => {
          setPoll((prev) => (prev ? { ...prev, status } : prev));
        });

        // Remote Q&A sidebar toggle from host
        socket.on('poll:qa_display_toggled', ({ show_qa }) => {
          setShowQaSidebar(Boolean(show_qa));
        });

        // Q&A live updates
        socket.on('qa:question_added', (item) => {
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

        socket.on('qa:question_deleted', ({ qaQuestionId }) => {
          setQaQuestions((prev) => prev.filter((q) => q.id !== qaQuestionId));
        });
      } catch (err) {
        setError(err.response?.data?.error || 'Unable to load presentation view');
        setLoading(false);
      }
    };

    initPresenter();

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [code]);

  // Fullscreen helper
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  useEffect(() => {
    const handleFsChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center text-slate-700">
        <div className="w-10 h-10 border-4 border-brand-600 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-slate-600 font-semibold tracking-tight">Starting Presenter Display...</p>
      </div>
    );
  }

  if (error || !poll) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center text-slate-800 p-6">
        <AlertCircle className="w-12 h-12 text-rose-500 mb-3" />
        <h2 className="text-2xl font-bold mb-1">Presentation Error</h2>
        <p className="text-slate-500 mb-6 text-center max-w-md">{error || 'Session not found'}</p>
        <Link
          to="/p"
          className="px-6 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-semibold text-sm transition"
        >
          Join via PIN
        </Link>
      </div>
    );
  }

  // Approved, unanswered Q&A sorted by upvotes
  const liveQaList = qaQuestions
    .filter((q) => q.is_approved === 1 && !q.is_answered)
    .sort((a, b) => (b.is_highlighted || 0) - (a.is_highlighted || 0) || (b.upvotes || 0) - (a.upvotes || 0));

  const highlightedQa = qaQuestions.find((q) => q.is_highlighted === 1 && !q.is_answered);
  const isLive = poll.status === 'live';
  const showSideColumn = isLive && ((Boolean(isQuizMode) && Boolean(showLeaderboard)) || (Boolean(poll.qa_enabled) && Boolean(showQaSidebar)));

  const getQuestionOptions = (q) => {
    if (!q || !q.options) return [];
    if (Array.isArray(q.options)) return q.options;
    try {
      return JSON.parse(q.options);
    } catch {
      return [];
    }
  };

  // Only display active users (those currently navigated to the participant page)
  const activePlayers = leaderboard.filter((p) => {
    const pid = p.participantId || p.participant_id;
    return activeParticipantIds.includes(pid);
  });

  const questionOptions = getQuestionOptions(currentQuestion);
  const multipleChoiceResults = (() => {
    if (!questionOptions || questionOptions.length === 0) {
      return liveResults?.results || [];
    }
    const resultsMap = new Map();
    if (liveResults?.results && Array.isArray(liveResults.results)) {
      liveResults.results.forEach((r) => resultsMap.set(r.option, r));
    }
    return questionOptions.map((opt) => {
      const match = resultsMap.get(opt);
      return {
        option: opt,
        count: match?.count || 0,
        percentage: match?.percentage || 0
      };
    });
  })();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-between font-sans selection:bg-brand-500 selection:text-white">
      <SEO title={`Presenter Display: ${poll.title} — Ask by urspace.com`} />

      {/* Top Header Bar matching Ask design */}
      <header className="bg-white border-b border-slate-200/90 px-6 sm:px-10 py-3.5 flex items-center justify-between shadow-xs sticky top-0 z-20">
        <div className="flex items-center space-x-4">
          <Link to="/" title="Ask by urspace.com">
            <img
              src="/askbuurspace.jpg"
              alt="Ask by urspace.com"
              className="h-10 sm:h-12 w-auto object-contain rounded-md"
            />
          </Link>
          <div className="h-6 w-px bg-slate-200" />
          <div>
            <h1 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight line-clamp-1">
              {poll.title}
            </h1>
            <div className="flex items-center space-x-2 text-xs text-slate-500">
              {isLive ? (
                <span className="inline-flex items-center text-emerald-700 font-semibold">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 mr-1.5 animate-pulse" />
                  Live Presentation
                </span>
              ) : (
                <span className="inline-flex items-center text-slate-500 font-semibold">
                  <span className="w-2 h-2 rounded-full bg-amber-400 mr-1.5" />
                  Lobby / Not Yet Live
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right Header Actions */}
        <div className="flex items-center space-x-3">
          {/* Active Voters Counter */}
          <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-700">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <Users className="w-3.5 h-3.5 text-emerald-600" />
            <span className="font-bold text-slate-900">{participantCount}</span>
            <span className="text-slate-500 hidden sm:inline">Voters</span>
          </div>

          {/* Quiz Leaderboard Toggle Button (Live Mode only) */}
          {isLive && isQuizMode && (
            <button
              type="button"
              onClick={() => setShowLeaderboard((prev) => !prev)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition flex items-center space-x-1.5 shadow-xs ${
                showLeaderboard
                  ? 'bg-amber-500 border-amber-600 text-white shadow-sm'
                  : 'bg-white border-slate-200 text-amber-800 hover:bg-amber-50'
              }`}
              title="Toggle Live Leaderboard on Presenter Screen"
            >
              <Trophy className={`w-3.5 h-3.5 ${showLeaderboard ? 'text-white' : 'text-amber-500'}`} />
              <span>Leaderboard{leaderboard.length > 0 ? ` (${leaderboard.length})` : ''}</span>
            </button>
          )}

          {/* Q&A Sidebar Toggle Button (Live Mode only) */}
          {isLive && poll.qa_enabled && (
            <button
              type="button"
              onClick={() => setShowQaSidebar((prev) => !prev)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition flex items-center space-x-1.5 shadow-xs ${
                showQaSidebar
                  ? 'bg-brand-50 border-brand-300 text-brand-700'
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
              title="Toggle Audience Q&A Sidebar"
            >
              <MessageSquare className="w-3.5 h-3.5 text-brand-600" />
              <span>Q&A ({liveQaList.length})</span>
            </button>
          )}

          {/* Fullscreen Button */}
          <button
            type="button"
            onClick={toggleFullscreen}
            className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 transition shadow-xs"
            title={isFullscreen ? 'Exit Fullscreen (F11)' : 'Enter Fullscreen (F11)'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* Main Presentation Stage */}
      {!isLive ? (
        /* Pre-Live Joining Lobby */
        <main className="flex-1 px-4 sm:px-8 py-8 max-w-6xl mx-auto w-full flex flex-col justify-center">
          {isQuizMode ? (
            /* 2-Column Layout: Left Column = Joining Details, Right Column = Joined Participants (narrow) */
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch animate-fadeIn">
              {/* Left Column: Joining Details */}
              <div className="lg:col-span-8 flex flex-col">
                <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-sm text-center flex flex-col justify-between h-full space-y-5">
                  <div className="space-y-2">
                    <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-brand-50 text-brand-700 border border-brand-200 text-xs font-bold uppercase tracking-wider">
                      <span className="w-2 h-2 rounded-full bg-brand-500 animate-pulse" />
                      <span>Waiting for Host to Start</span>
                    </span>
                    <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight leading-snug">
                      {poll.title}
                    </h2>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto">
                      Scan the QR code with your phone camera or visit the link below to join.
                    </p>
                  </div>

                  {/* High-Contrast QR Code */}
                  <div className="inline-block p-4 bg-white rounded-2xl border-2 border-slate-200 shadow-xs mx-auto">
                    {qrDataUrl ? (
                      <img
                        src={qrDataUrl}
                        alt="Scan to join poll"
                        className="w-52 h-52 sm:w-60 sm:h-60 object-contain mx-auto"
                      />
                    ) : (
                      <div className="w-52 h-52 bg-slate-100 rounded-2xl flex items-center justify-center animate-pulse">
                        <QrCode className="w-12 h-12 text-slate-400" />
                      </div>
                    )}
                  </div>

                  {/* Web Address & PIN */}
                  <div className="space-y-2 max-w-xs mx-auto w-full">
                    <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                      Or visit in your browser:
                    </div>
                    <div className="text-base sm:text-lg font-bold text-brand-700 font-mono">
                      ask.urspace.com/join
                    </div>
                    <div className="bg-slate-900 text-white rounded-2xl p-3.5 shadow-inner mt-1">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">
                        Event PIN
                      </div>
                      <div className="text-2xl sm:text-3xl font-black font-mono tracking-widest text-white">
                        {poll.code}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Active Participants Roster (narrower, listed top-down, active users only) */}
              <div className="lg:col-span-4 flex flex-col">
                <div className="bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-6 shadow-sm flex flex-col justify-between h-full space-y-3">
                  <div>
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-2">
                      <div className="flex items-center space-x-2">
                        <Trophy className="w-4 h-4 text-amber-500" />
                        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                          Active Players
                        </h3>
                      </div>
                      <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 text-xs font-black">
                        {activePlayers.length}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Players currently in live lobby
                    </p>
                  </div>

                  {/* Top-down vertical list */}
                  <div className="flex-1 overflow-y-auto max-h-[460px] divide-y divide-slate-100 pr-1">
                    {activePlayers.length === 0 ? (
                      <div className="py-16 text-center text-xs text-slate-400 italic space-y-2">
                        <div className="text-3xl">🚀</div>
                        <p>No active players in lobby yet.</p>
                        <p className="text-[10px] text-slate-400">Scan QR code or visit ask.urspace.com/join to join!</p>
                      </div>
                    ) : (
                      activePlayers.map((player, idx) => (
                        <div
                          key={player.participantId || player.participant_id || idx}
                          className="py-2.5 px-2 flex items-center justify-between text-xs hover:bg-slate-50/80 rounded-xl transition"
                        >
                          <div className="flex items-center space-x-2.5 min-w-0">
                            <span className="w-5 text-center font-bold text-slate-400">
                              #{idx + 1}
                            </span>
                            <span className="text-base shrink-0">{player.avatar || '🚀'}</span>
                            <span className="font-bold text-slate-900 truncate max-w-[120px] sm:max-w-[140px]">
                              {player.name}
                            </span>
                          </div>
                          <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200/70 px-2 py-0.5 rounded-full shrink-0">
                            Active
                          </span>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Footer status */}
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                    <span className="flex items-center space-x-1.5 font-medium">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span>Live Lobby Roster</span>
                    </span>
                    <span className="font-semibold text-slate-700">
                      {activePlayers.length} online
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Non-Quiz Mode: Centered Joining Details */
            <div className="bg-white rounded-3xl border border-slate-200/90 p-8 sm:p-10 shadow-sm text-center max-w-2xl mx-auto w-full space-y-6 animate-fadeIn">
              <div className="space-y-2">
                <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-brand-50 text-brand-700 border border-brand-200 text-xs font-bold uppercase tracking-wider">
                  <span className="w-2 h-2 rounded-full bg-brand-500 animate-pulse" />
                  <span>Waiting for Host to Start</span>
                </span>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                  {poll.title}
                </h2>
                <p className="text-sm text-slate-500 max-w-md mx-auto">
                  Scan the QR code with your phone camera or visit the link below to join. Questions will appear as soon as the host starts!
                </p>
              </div>

              {/* Centered Large High-Contrast QR Code */}
              <div className="inline-block p-4 bg-white rounded-3xl border-2 border-slate-200 shadow-xs">
                {qrDataUrl ? (
                  <img
                    src={qrDataUrl}
                    alt="Scan to join poll"
                    className="w-56 h-56 sm:w-64 sm:h-64 object-contain mx-auto"
                  />
                ) : (
                  <div className="w-56 h-56 bg-slate-100 rounded-2xl flex items-center justify-center animate-pulse">
                    <QrCode className="w-14 h-14 text-slate-400" />
                  </div>
                )}
              </div>

              {/* Instructions & PIN */}
              <div className="space-y-2 max-w-md mx-auto">
                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Or join on any device at:
                </div>
                <div className="text-lg sm:text-xl font-bold text-brand-700 font-mono">
                  ask.urspace.com/join
                </div>
                <div className="bg-slate-900 text-white rounded-2xl p-4 shadow-inner mt-2">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Event PIN
                  </div>
                  <div className="text-3xl sm:text-4xl font-black font-mono tracking-widest text-white">
                    {poll.code}
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      ) : (
        /* Live Poll Presentation View */
        <main className="flex-1 px-4 sm:px-8 py-6 max-w-7xl mx-auto w-full flex flex-col justify-center">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            
            {/* 1. Large High-Visibility QR Code & Join Card */}
            <div className={`${showSideColumn ? 'lg:col-span-3' : 'lg:col-span-4'} flex flex-col`}>
              <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-sm text-center flex flex-col justify-between h-full">
                <div>
                  <div className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-brand-50 text-brand-700 border border-brand-200 text-xs font-bold uppercase tracking-wider mb-3">
                    <QrCode className="w-3.5 h-3.5" />
                    <span>Join on Your Phone</span>
                  </div>

                  {/* Prominent High-Contrast QR Code */}
                  {qrDataUrl ? (
                    <div className="p-3 bg-white rounded-2xl border border-slate-200 inline-block mb-3 shadow-xs">
                      <img
                        src={qrDataUrl}
                        alt="Scan to join poll"
                        className="w-48 h-48 sm:w-56 sm:h-56 object-contain mx-auto"
                      />
                    </div>
                  ) : (
                    <div className="w-48 h-48 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-3 animate-pulse">
                      <QrCode className="w-12 h-12 text-slate-400" />
                    </div>
                  )}

                  <div className="text-xs font-medium text-slate-500 mb-1">
                    1. Scan with phone camera, or visit:
                  </div>
                  <div className="text-sm font-bold text-slate-900 font-mono mb-2">
                    ask.urspace.com/join
                  </div>
                </div>

                {/* Event PIN Box */}
                <div className="bg-slate-900 text-white rounded-xl p-3 shadow-inner">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">
                    Event PIN
                  </div>
                  <div className="text-2xl sm:text-3xl font-black font-mono tracking-widest text-white">
                    {poll.code}
                  </div>
                </div>
              </div>
            </div>

            {/* 2. Main Question & Live Results Stage */}
            <div className={`${showSideColumn ? 'lg:col-span-6' : 'lg:col-span-8'} flex flex-col`}>
              {currentQuestion ? (
                <div className="bg-white rounded-2xl border border-slate-200/90 p-6 sm:p-8 shadow-sm flex flex-col justify-between h-full space-y-6">
                  <div>
                    {/* Question Header & Badges */}
                    <div className="flex items-center space-x-2 mb-3">
                      <span className="px-2.5 py-0.5 rounded-lg bg-slate-900 text-white text-xs font-bold">
                        Question {currentQuestion.order_num}
                      </span>
                      {!votingOpen && (
                        <span className="px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-xs font-semibold flex items-center space-x-1">
                          <Lock className="w-3 h-3" />
                          <span>Voting Closed</span>
                        </span>
                      )}
                      {!showResults && (
                        <span className="px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-xs font-semibold flex items-center space-x-1">
                          <EyeOff className="w-3 h-3" />
                          <span>Results Hidden</span>
                        </span>
                      )}
                    </div>

                    <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight leading-tight">
                      {currentQuestion.question_text}
                    </h2>
                  </div>

                  {/* Stage Graphic */}
                  <div className="flex-1 flex flex-col justify-center py-2">
                    {/* Multiple Choice Chart: format identical before & after results display, listed one above another */}
                    {currentQuestion.question_type === 'multiple_choice' && (
                      <div>
                        <LiveBarChart
                          results={multipleChoiceResults}
                          totalVotes={liveResults?.totalVotes || 0}
                          isPresenter={true}
                          correctAnswer={correctAnswer}
                          showCorrectAnswer={showCorrectAnswer}
                          showResults={showResults}
                        />
                        {showCorrectAnswer && correctAnswer && showResults && (
                          <div className="mt-5 p-3.5 sm:p-4 rounded-2xl bg-emerald-50 border border-emerald-300 flex items-center justify-center space-x-2.5 text-emerald-900 text-base sm:text-lg font-bold shadow-xs animate-fadeIn">
                            <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-600 shrink-0" />
                            <span>Correct Answer: <span className="underline decoration-emerald-500 decoration-2 font-black">{correctAnswer}</span></span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Word Cloud */}
                    {currentQuestion.question_type === 'word_cloud' && (
                      showResults ? (
                        <div className="py-2">
                          <WordCloud words={liveResults?.words || []} />
                        </div>
                      ) : (
                        <div className="py-12 text-center bg-slate-50/80 rounded-2xl border border-slate-200/80 space-y-3">
                          <div className="inline-flex items-center space-x-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 px-3 py-1.5 rounded-full">
                            <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                            <span>Responses in progress...</span>
                          </div>
                          <p className="text-sm font-semibold text-slate-700">
                            Collecting words from audience...
                          </p>
                          <p className="text-xs text-slate-400">
                            Word cloud visualization will generate on this screen when results are revealed.
                          </p>
                        </div>
                      )
                    )}

                    {/* Rating Chart */}
                    {currentQuestion.question_type === 'rating' && (
                      showResults ? (
                        <LiveRatingChart
                          ratingData={liveResults}
                          average={liveResults?.average || 0}
                          maxRating={liveResults?.maxRating || 5}
                          totalVotes={liveResults?.totalVotes || 0}
                          counts={liveResults?.counts || {}}
                          isPresenter={true}
                        />
                      ) : (
                        <div className="py-8 text-center bg-slate-50/80 rounded-2xl border border-slate-200/80 space-y-4">
                          <div className="inline-flex items-center space-x-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 px-3 py-1.5 rounded-full">
                            <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                            <span>Responses in progress...</span>
                          </div>
                          <div className="flex items-center justify-center space-x-3 text-slate-300">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star key={star} className="w-10 h-10 fill-slate-200 text-slate-300" />
                            ))}
                          </div>
                          <p className="text-xs text-slate-500">
                            Audience ratings are currently being submitted. Results will appear once revealed by host.
                          </p>
                        </div>
                      )
                    )}

                    {/* Ranking Chart */}
                    {currentQuestion.question_type === 'ranking' && (
                      showResults ? (
                        <LiveRankingChart
                          rankingData={liveResults}
                          totalVotes={liveResults?.totalVotes || 0}
                          isPresenter={true}
                        />
                      ) : (
                        <div className="space-y-3">
                          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                              Items to Rank
                            </span>
                            <span className="inline-flex items-center space-x-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2.5 py-1 rounded-full">
                              <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                              <span>Responses in progress...</span>
                            </span>
                          </div>
                          <div className="space-y-2">
                            {getQuestionOptions(currentQuestion).map((opt, i) => (
                              <div
                                key={i}
                                className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 flex items-center justify-between shadow-xs"
                              >
                                <div className="flex items-center space-x-3 min-w-0">
                                  <span className="w-6 h-6 rounded-lg bg-white border border-slate-200 text-slate-500 font-bold text-xs flex items-center justify-center shrink-0">
                                    {i + 1}
                                  </span>
                                  <span className="font-semibold text-slate-800 text-sm truncate">{opt}</span>
                                </div>
                                <span className="text-[11px] text-slate-400 italic shrink-0">Ranking in progress...</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )
                    )}
                  </div>

                  {/* Footer Count */}
                  <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                    <div className="flex items-center space-x-1.5 font-medium">
                      <Sparkles className="w-3.5 h-3.5 text-brand-600" />
                      <span>Live response updates</span>
                    </div>
                    <div className="font-semibold text-slate-800">
                      <span className="text-base font-extrabold text-slate-900 mr-1">{liveResults?.totalVotes || 0}</span>
                      <span>votes cast</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-2xl border border-slate-200/90 p-12 text-center flex flex-col items-center justify-center h-full">
                  <HelpCircle className="w-12 h-12 text-slate-400 mb-3" />
                  <h3 className="text-xl font-bold text-slate-900 mb-1">Session In Progress</h3>
                  <p className="text-xs text-slate-500">The presenter will activate the next question shortly.</p>
                </div>
              )}
            </div>

            {/* 3. Right Column: Top 3 Live Leaderboard & Audience Q&A (Stacked) */}
            {showSideColumn && (
              <div className="lg:col-span-3 flex flex-col gap-4">
                {/* Top 3 Leaderboard (if Quiz Mode & enabled) */}
                {isQuizMode && showLeaderboard && (
                  <div className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 shadow-sm flex flex-col">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                      <div className="flex items-center space-x-2">
                        <Trophy className="w-4 h-4 text-amber-500" />
                        <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">Top 3 Leaderboard</span>
                      </div>
                      <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold">
                        {leaderboard.length} Players
                      </span>
                    </div>

                    <div className="divide-y divide-slate-100 pt-1">
                      {leaderboard.length === 0 ? (
                        <div className="py-6 text-center text-xs text-slate-400 italic">
                          No quiz scores recorded yet.
                        </div>
                      ) : (
                        leaderboard.slice(0, 3).map((player, idx) => (
                          <div
                            key={player.participantId || player.participant_id || idx}
                            className="py-2.5 flex items-center justify-between text-xs"
                          >
                            <div className="flex items-center space-x-2.5 min-w-0">
                              <span className={`w-5 text-center font-black ${
                                idx === 0 ? 'text-amber-500' : idx === 1 ? 'text-slate-400' : 'text-orange-400'
                              }`}>
                                #{idx + 1}
                              </span>
                              <span className="text-base shrink-0">{player.avatar || '🚀'}</span>
                              <span className="font-bold text-slate-800 truncate">{player.name}</span>
                            </div>
                            <span className="font-black text-amber-800 px-2 py-0.5 rounded-md bg-amber-50 shrink-0">
                              {player.score} {player.score === 1 ? 'pt' : 'pts'}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}

                {/* Audience Q&A (stacked below Top 3 Leaderboard if both are displayed) */}
                {poll.qa_enabled && showQaSidebar && (
                  <div className={`bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 shadow-sm flex flex-col ${
                    isQuizMode && showLeaderboard ? 'flex-1 min-h-[280px]' : 'h-full'
                  } space-y-3`}>
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                      <div className="flex items-center space-x-2">
                        <MessageSquare className="w-4 h-4 text-brand-600" />
                        <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">Audience Q&A</span>
                      </div>
                      <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-xs font-bold">
                        {liveQaList.length}
                      </span>
                    </div>

                    {/* Questions List */}
                    <div className="flex-1 overflow-y-auto space-y-2.5 max-h-[460px] pr-1">
                      {liveQaList.length === 0 ? (
                        <div className="text-center py-10 text-xs text-slate-400">
                          No audience questions submitted yet.
                        </div>
                      ) : (
                        liveQaList.map((item) => (
                          <div
                            key={item.id}
                            className={`p-3 rounded-xl border text-xs space-y-1.5 transition ${
                              item.is_highlighted
                                ? 'bg-amber-50/70 border-amber-300 ring-1 ring-amber-400/40'
                                : 'bg-slate-50 border-slate-200/80 hover:bg-slate-100/70'
                            }`}
                          >
                            {item.is_highlighted === 1 && (
                              <div className="flex items-center space-x-1 text-[10px] font-bold uppercase tracking-wider text-amber-800">
                                <Pin className="w-3 h-3 text-amber-600 fill-amber-500" />
                                <span>Pinned on Stage</span>
                              </div>
                            )}
                            <p className="text-slate-900 font-semibold leading-relaxed">
                              "{item.question_text}"
                            </p>
                            <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-200/60">
                              <span className="truncate">{item.author_name || 'Anonymous'}</span>
                              <span className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded bg-brand-50 text-brand-700 font-bold shrink-0">
                                <ThumbsUp className="w-3 h-3" />
                                <span>{item.upvotes}</span>
                              </span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}

              </div>
            )}

          </div>
        </main>
      )}

      {/* Spotlight Bar if Question is Pinned & Sidebar is not showing */}
      {isLive && highlightedQa && !showQaSidebar && (
        <div className="px-4 sm:px-8 pb-4">
          <div className="max-w-4xl mx-auto bg-amber-50 border-2 border-amber-300 rounded-2xl p-4 shadow-sm flex items-start space-x-3">
            <div className="w-8 h-8 rounded-xl bg-amber-400 text-slate-950 font-bold flex items-center justify-center shrink-0">
              <Pin className="w-4 h-4 fill-slate-950" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between text-xs text-amber-800 font-bold uppercase tracking-wider mb-0.5">
                <span>Audience Question on Stage</span>
                <span className="inline-flex items-center space-x-1 bg-amber-100 text-amber-900 px-2 py-0.5 rounded-full">
                  <ThumbsUp className="w-3 h-3" />
                  <span>{highlightedQa.upvotes} upvotes</span>
                </span>
              </div>
              <p className="text-base font-bold text-slate-900">
                "{highlightedQa.question_text}"
              </p>
              <div className="text-[11px] text-slate-500 mt-0.5">
                Asked by {highlightedQa.author_name || 'Anonymous'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Clean Light Footer */}
      <footer className="bg-white border-t border-slate-200 px-6 sm:px-10 py-3 flex items-center justify-between text-xs text-slate-500">
        <div>Ask by urspace.com — Live Interactive Audience Platform</div>
        <div>Press F11 for Fullscreen</div>
      </footer>
    </div>
  );
}
