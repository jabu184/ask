import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { io } from 'socket.io-client';
import QRCode from 'qrcode';
import { publicPollApi } from '../services/api';
import WordCloud from '../components/WordCloud';
import LiveBarChart from '../components/LiveBarChart';
import LiveRatingChart from '../components/LiveRatingChart';
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
  HelpCircle,
  Pin
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
  const [highlightedQa, setHighlightedQa] = useState(null);
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Full join URL
  const joinUrl = `${window.location.origin}/p/${encodeURIComponent(code || '')}`;

  useEffect(() => {
    // Generate QR Code data URL
    QRCode.toDataURL(joinUrl, {
      width: 240,
      margin: 1,
      color: {
        dark: '#ffffff',
        light: '#00000000' // transparent
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

        // Check if any QA question is already highlighted
        if (data.qaQuestions) {
          const pinned = data.qaQuestions.find((q) => q.is_highlighted === 1);
          if (pinned) setHighlightedQa(pinned);
        }

        // Connect WebSocket
        socket = io({
          path: '/socket.io',
          transports: ['websocket', 'polling']
        });
        socketRef.current = socket;

        socket.on('connect', () => {
          socket.emit('poll:join', {
            pollId: data.poll.id,
            participantId: 'presenter_' + Math.random().toString(36).substring(2, 7),
            isHost: false
          });
        });

        socket.on('poll:state', (state) => {
          if (state.poll) {
            setPoll(state.poll);
            setShowResults(Boolean(state.poll.show_results));
            setVotingOpen(Boolean(state.poll.voting_open));
          }
          if (state.currentQuestion) setCurrentQuestion(state.currentQuestion);
          if (state.liveResults) setLiveResults(state.liveResults);
          if (typeof state.participantCount === 'number') setParticipantCount(state.participantCount);

          if (state.qaQuestions) {
            const pinned = state.qaQuestions.find((q) => q.is_highlighted === 1);
            setHighlightedQa(pinned || null);
          }
          setLoading(false);
        });

        socket.on('poll:question_changed', (payload) => {
          setCurrentQuestion(payload.currentQuestion);
          setLiveResults(payload.liveResults);
          setVotingOpen(true);
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
        });

        socket.on('qa:question_highlighted', ({ qaQuestionId }) => {
          // Re-fetch or update pinned question
          publicPollApi.get(data.poll.id, 'presenter').then((res) => {
            const pinned = (res.qaQuestions || []).find((q) => q.id === qaQuestionId);
            setHighlightedQa(pinned || null);
          });
        });

        socket.on('qa:question_unhighlighted', () => {
          setHighlightedQa(null);
        });

        socket.on('qa:question_answered', ({ qaQuestionId }) => {
          setHighlightedQa((prev) => (prev?.id === qaQuestionId ? null : prev));
        });

        socket.on('qa:question_deleted', ({ qaQuestionId }) => {
          setHighlightedQa((prev) => (prev?.id === qaQuestionId ? null : prev));
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
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white">
        <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-slate-400 font-medium tracking-wide">Starting Presentation Screen...</p>
      </div>
    );
  }

  if (error || !poll) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white p-6">
        <AlertCircle className="w-12 h-12 text-rose-500 mb-4" />
        <h2 className="text-2xl font-bold mb-2">Presentation Error</h2>
        <p className="text-slate-400 mb-6 text-center max-w-md">{error || 'Session not found'}</p>
        <Link
          to="/p"
          className="px-6 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm transition-all"
        >
          Join via PIN
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white flex flex-col justify-between selection:bg-indigo-500 selection:text-white relative overflow-hidden">
      <SEO title={`Live Screen: ${poll.title}`} />

      {/* Top Banner: Join Instructions + QR Code + Fullscreen Button */}
      <header className="px-6 sm:px-12 py-5 flex items-center justify-between border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-xl z-20">
        <div className="flex items-center space-x-6">
          {/* QR Code thumbnail */}
          {qrDataUrl && (
            <div className="hidden sm:block p-1.5 bg-white/10 rounded-xl border border-white/15 shadow-lg shadow-indigo-950/50">
              <img src={qrDataUrl} alt="Scan to join poll" className="w-14 h-14 object-contain" />
            </div>
          )}

          <div>
            <div className="text-xs uppercase tracking-widest font-bold text-indigo-400 mb-0.5 flex items-center space-x-2">
              <Zap className="w-3.5 h-3.5" />
              <span>Join at ask.urspace.com/p</span>
            </div>
            <div className="flex items-center space-x-3">
              <span className="text-slate-400 text-sm font-medium">Event Code:</span>
              <span className="text-2xl sm:text-3xl font-black font-mono tracking-wider text-white bg-slate-800/90 px-3 py-0.5 rounded-xl border border-slate-700/80 shadow-inner">
                {poll.code}
              </span>
            </div>
          </div>
        </div>

        {/* Right side: Participant counter + Fullscreen button */}
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-slate-800/90 border border-slate-700/80 text-sm font-semibold text-slate-300">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <Users className="w-4 h-4 text-indigo-400" />
            <span className="text-white font-bold">{participantCount}</span>
            <span className="text-xs text-slate-400 hidden sm:inline">participants</span>
          </div>

          <button
            type="button"
            onClick={toggleFullscreen}
            className="p-2.5 rounded-xl bg-slate-800/90 hover:bg-slate-700/90 border border-slate-700 text-slate-300 hover:text-white transition-all shadow-md"
            title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
          >
            {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* Main Stage Display Area */}
      <main className="flex-1 flex flex-col justify-center px-6 sm:px-16 py-8 max-w-6xl mx-auto w-full z-10">
        {currentQuestion ? (
          <div className="space-y-8 animate-fadeIn">
            {/* Question Title & State Badges */}
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <span className="px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-bold uppercase tracking-wider">
                  Question {currentQuestion.order_num}
                </span>
                {!votingOpen && (
                  <span className="px-3 py-1 rounded-full bg-rose-500/20 border border-rose-400/30 text-rose-300 text-xs font-bold uppercase tracking-wider flex items-center space-x-1">
                    <Lock className="w-3 h-3" />
                    <span>Voting Closed</span>
                  </span>
                )}
                {!showResults && (
                  <span className="px-3 py-1 rounded-full bg-amber-500/20 border border-amber-400/30 text-amber-300 text-xs font-bold uppercase tracking-wider flex items-center space-x-1">
                    <EyeOff className="w-3 h-3" />
                    <span>Results Hidden</span>
                  </span>
                )}
              </div>

              <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight">
                {currentQuestion.question_text}
              </h1>
            </div>

            {/* Results Canvas */}
            {showResults ? (
              <div className="bg-slate-900/60 backdrop-blur-2xl border border-slate-800 rounded-3xl p-6 sm:p-10 shadow-2xl shadow-indigo-950/30">
                {/* Multiple Choice Chart */}
                {currentQuestion.question_type === 'multiple_choice' && (
                  <div className="space-y-4">
                    <LiveBarChart results={liveResults?.results || []} />
                  </div>
                )}

                {/* Word Cloud */}
                {currentQuestion.question_type === 'word_cloud' && (
                  <div className="py-6">
                    <WordCloud words={liveResults?.words || []} />
                  </div>
                )}

                {/* Rating Chart */}
                {currentQuestion.question_type === 'rating' && (
                  <div className="py-4">
                    <LiveRatingChart
                      average={liveResults?.average || 0}
                      maxRating={liveResults?.maxRating || 5}
                      totalVotes={liveResults?.totalVotes || 0}
                      counts={liveResults?.counts || {}}
                    />
                  </div>
                )}

                {/* Open text response ticker / grid */}
                {currentQuestion.question_type === 'text' && (
                  <div className="space-y-4">
                    {(!liveResults?.responses || liveResults.responses.length === 0) ? (
                      <div className="text-center py-16 text-slate-500 text-lg font-medium">
                        Waiting for audience responses...
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 max-h-[500px] overflow-y-auto pr-2">
                        {liveResults.responses.map((resp, rIdx) => (
                          <div
                            key={rIdx}
                            className="p-4 rounded-2xl bg-slate-800/70 border border-slate-700/60 text-slate-200 text-sm font-medium shadow-md leading-relaxed animate-fadeIn"
                          >
                            "{resp}"
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Total votes footer badge */}
                <div className="mt-6 pt-6 border-t border-slate-800/80 flex items-center justify-between text-xs sm:text-sm text-slate-400 font-medium">
                  <div className="flex items-center space-x-2">
                    <Sparkles className="w-4 h-4 text-indigo-400" />
                    <span>Real-time live results</span>
                  </div>
                  <div>
                    <span className="text-white font-extrabold text-base mr-1">
                      {liveResults?.totalVotes || 0}
                    </span>
                    <span>votes</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-slate-900/60 backdrop-blur-2xl border border-slate-800 rounded-3xl p-12 text-center shadow-2xl">
                <EyeOff className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                <h3 className="text-2xl font-bold text-white mb-2">Results are currently hidden</h3>
                <p className="text-slate-400 text-sm max-w-md mx-auto">
                  The host will reveal live responses shortly. Cast your vote now!
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-20">
            <h2 className="text-3xl font-extrabold text-white mb-3">Poll session is waiting to begin</h2>
            <p className="text-slate-400 text-base">
              The presenter will activate the first question in a moment.
            </p>
          </div>
        )}
      </main>

      {/* Stage Highlight Spotlight: Pinned Q&A question from Host */}
      {highlightedQa && (
        <div className="px-6 sm:px-12 pb-6 z-30 animate-slideUp">
          <div className="max-w-4xl mx-auto bg-gradient-to-r from-amber-500/20 via-yellow-500/25 to-amber-500/20 border-2 border-amber-400/60 rounded-3xl p-5 sm:p-6 shadow-2xl backdrop-blur-xl flex items-start space-x-4">
            <div className="w-10 h-10 rounded-2xl bg-amber-400 text-slate-950 font-bold flex items-center justify-center flex-shrink-0 shadow-lg shadow-amber-500/30">
              <Pin className="w-5 h-5 fill-slate-950" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between text-xs text-amber-300 font-bold uppercase tracking-wider mb-1">
                <span>Audience Question on Stage</span>
                <span className="inline-flex items-center space-x-1 bg-amber-400/20 px-2 py-0.5 rounded-full text-amber-200">
                  <ThumbsUp className="w-3 h-3" />
                  <span>{highlightedQa.upvotes} upvotes</span>
                </span>
              </div>
              <p className="text-lg sm:text-xl font-bold text-white tracking-tight">
                "{highlightedQa.question_text}"
              </p>
              <div className="text-xs text-amber-200/80 mt-1 font-medium">
                Asked by {highlightedQa.author_name || 'Anonymous'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Bar */}
      <footer className="px-6 sm:px-12 py-3 border-t border-slate-900 bg-slate-950/80 flex items-center justify-between text-xs text-slate-500">
        <div>Ask Live Polling System</div>
        <div>Press F11 for Fullscreen</div>
      </footer>
    </div>
  );
}
