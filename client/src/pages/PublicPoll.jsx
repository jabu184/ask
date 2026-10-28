import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { io } from 'socket.io-client';
import { publicPollApi } from '../services/api';
import WordCloud from '../components/WordCloud';
import LiveBarChart from '../components/LiveBarChart';
import LiveRatingChart from '../components/LiveRatingChart';
import SEO from '../components/SEO';
import {
  Radio,
  CheckCircle2,
  Lock,
  MessageSquare,
  ThumbsUp,
  Send,
  Star,
  Users,
  AlertCircle,
  HelpCircle,
  Sparkles
} from 'lucide-react';

function getParticipantId() {
  let id = localStorage.getItem('ask_participant_id');
  if (!id) {
    id = 'p_' + Math.random().toString(36).substring(2, 12);
    localStorage.setItem('ask_participant_id', id);
  }
  return id;
}

export default function PublicPoll() {
  const { code } = useParams();
  const participantId = useRef(getParticipantId()).current;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('poll'); // 'poll' | 'qa'

  // Poll state
  const [poll, setPoll] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [liveResults, setLiveResults] = useState(null);
  const [hasVoted, setHasVoted] = useState(false);
  const [userVote, setUserVote] = useState(null);
  const [votingOpen, setVotingOpen] = useState(true);
  const [showResults, setShowResults] = useState(true);
  const [participantCount, setParticipantCount] = useState(1);

  // Form inputs for voting
  const [textInput, setTextInput] = useState('');
  const [submittingVote, setSubmittingVote] = useState(false);

  // Q&A state
  const [qaQuestions, setQaQuestions] = useState([]);
  const [userUpvotes, setUserUpvotes] = useState([]);
  const [newQuestionText, setNewQuestionText] = useState('');
  const [authorName, setAuthorName] = useState('');
  const [submittingQa, setSubmittingQa] = useState(false);
  const [qaNotice, setQaNotice] = useState('');

  const socketRef = useRef(null);

  // Initial lookup & Socket connection
  useEffect(() => {
    let socket;

    async function loadPoll() {
      try {
        setLoading(true);
        setError('');

        const initial = await publicPollApi.lookupByCode(code, participantId);
        if (!initial || !initial.poll) {
          setError('Live poll not found. Please check your PIN.');
          setLoading(false);
          return;
        }

        setPoll(initial.poll);
        setCurrentQuestion(initial.currentQuestion);
        setLiveResults(initial.liveResults);
        setHasVoted(initial.hasVoted);
        setUserVote(initial.userVote);
        setVotingOpen(initial.poll.voting_open);
        setShowResults(initial.poll.show_results);
        setQaQuestions(initial.qaQuestions || []);
        setUserUpvotes(initial.userUpvotes || []);
        setParticipantCount(initial.participantCount || 1);

        // Connect socket
        socket = io({
          withCredentials: true,
          transports: ['websocket', 'polling']
        });
        socketRef.current = socket;

        socket.emit('poll:join', {
          pollId: initial.poll.id,
          participantId,
          isHost: false
        });

        socket.on('poll:state', (state) => {
          if (!state) return;
          setPoll(state.poll);
          setCurrentQuestion(state.currentQuestion);
          setLiveResults(state.liveResults);
          setHasVoted(state.hasVoted);
          setUserVote(state.userVote);
          setVotingOpen(state.poll.voting_open);
          setShowResults(state.poll.show_results);
          setQaQuestions(state.qaQuestions || []);
          setUserUpvotes(state.userUpvotes || []);
          setParticipantCount(state.participantCount || 1);
        });

        socket.on('poll:question_changed', (data) => {
          setCurrentQuestion(data.currentQuestion);
          setVotingOpen(data.voting_open);
          setLiveResults(data.liveResults);
          setHasVoted(false);
          setUserVote(null);
          setTextInput('');
        });

        socket.on('poll:voting_toggled', (data) => {
          setVotingOpen(data.voting_open);
        });

        socket.on('poll:results_toggled', (data) => {
          setShowResults(data.show_results);
          if (data.liveResults) {
            setLiveResults(data.liveResults);
          }
        });

        socket.on('poll:results_update', (data) => {
          if (data.results) {
            setLiveResults(data.results);
          }
        });

        socket.on('poll:status_changed', (data) => {
          setPoll((prev) => (prev ? { ...prev, status: data.status } : prev));
        });

        socket.on('poll:participant_count', (data) => {
          setParticipantCount(data.count);
        });

        socket.on('poll:vote_confirmed', (data) => {
          setHasVoted(true);
          setUserVote(data.value);
          setSubmittingVote(false);
        });

        // Q&A Events
        socket.on('qa:question_added', (item) => {
          setQaQuestions((prev) => {
            if (prev.some((q) => q.id === item.id)) return prev;
            return [item, ...prev];
          });
        });

        socket.on('qa:pending_question', (item) => {
          if (item.participant_id === participantId) {
            setQaNotice('Your question was submitted and is pending host review.');
            setTimeout(() => setQaNotice(''), 4000);
          }
        });

        socket.on('qa:upvote_updated', ({ qaQuestionId, upvotes }) => {
          setQaQuestions((prev) =>
            prev.map((q) => (q.id === qaQuestionId ? { ...q, upvotes } : q))
          );
        });

        socket.on('qa:my_upvote_status', ({ qaQuestionId, hasUpvoted }) => {
          setUserUpvotes((prev) => {
            if (hasUpvoted) return [...prev, qaQuestionId];
            return prev.filter((id) => id !== qaQuestionId);
          });
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
        setError(err.response?.data?.error || 'Failed to connect to live poll');
      } finally {
        setLoading(false);
      }
    }

    loadPoll();

    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, [code, participantId]);

  // Handle vote submit
  const handleVote = (val) => {
    if (!poll || !currentQuestion || !votingOpen || submittingVote) return;
    setSubmittingVote(true);

    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit('poll:submit_vote', {
        pollId: poll.id,
        questionId: currentQuestion.id,
        participantId,
        value: val
      });
    } else {
      // Fallback via HTTP
      publicPollApi
        .vote(poll.id, {
          questionId: currentQuestion.id,
          participantId,
          value: val
        })
        .then((res) => {
          setHasVoted(true);
          setUserVote(val);
          if (res.results) setLiveResults(res.results);
        })
        .catch((err) => {
          alert(err.response?.data?.error || 'Failed to submit vote');
        })
        .finally(() => {
          setSubmittingVote(false);
        });
    }
  };

  // Handle Q&A submit
  const handleQaSubmit = (e) => {
    e.preventDefault();
    if (!newQuestionText.trim() || submittingQa) return;
    setSubmittingQa(true);

    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit('qa:submit', {
        pollId: poll.id,
        participantId,
        author_name: authorName.trim() || 'Anonymous',
        question_text: newQuestionText.trim()
      });
      setNewQuestionText('');
      setSubmittingQa(false);
    } else {
      publicPollApi
        .submitQA(poll.id, {
          participantId,
          author_name: authorName.trim() || 'Anonymous',
          question_text: newQuestionText.trim()
        })
        .then(() => {
          setNewQuestionText('');
        })
        .catch((err) => {
          alert(err.response?.data?.error || 'Failed to submit question');
        })
        .finally(() => {
          setSubmittingQa(false);
        });
    }
  };

  // Handle Q&A upvote
  const handleQaUpvote = (qaQuestionId) => {
    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit('qa:upvote', {
        pollId: poll.id,
        qaQuestionId,
        participantId
      });
    } else {
      publicPollApi.upvoteQA(poll.id, qaQuestionId, participantId);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="w-12 h-12 border-4 border-brand-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-slate-600 font-medium">Connecting to live poll #{code?.toUpperCase()}...</p>
      </div>
    );
  }

  if (error || !poll) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <SEO title="Live Poll | Ask by urspace" />
        <div className="max-w-md w-full bg-white rounded-3xl p-8 shadow-sm border border-slate-200 text-center">
          <div className="w-14 h-14 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Live Poll Not Found</h2>
          <p className="text-sm text-slate-600 mb-6">{error || 'This live poll may have ended or the code is incorrect.'}</p>
          <Link
            to="/p"
            className="inline-flex items-center justify-center w-full py-3 px-4 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-semibold text-sm transition"
          >
            Enter a different Poll PIN
          </Link>
        </div>
      </div>
    );
  }

  const isPollClosed = poll.status === 'closed';

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col pb-20 sm:pb-8">
      <SEO
        title={`Live Poll #${poll.code} — ${poll.title} | Ask by urspace`}
        description={poll.description || `Participate in live poll #${poll.code}`}
      />

      {/* Top Header Bar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20 shadow-xs">
        <div className="max-w-2xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-brand-50 text-brand-700 font-black text-xs font-mono shrink-0">
              #{poll.code}
            </span>
            <div className="truncate">
              <h1 className="font-bold text-slate-900 text-sm sm:text-base truncate">{poll.title}</h1>
              <div className="flex items-center gap-2 text-xs">
                {isPollClosed ? (
                  <span className="inline-flex items-center gap-1 font-semibold text-slate-500">
                    <Lock className="w-3 h-3" /> Poll Ended
                  </span>
                ) : votingOpen ? (
                  <span className="inline-flex items-center gap-1 font-semibold text-emerald-600">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> Live Now
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 font-semibold text-amber-600">
                    <Lock className="w-3 h-3" /> Voting Locked
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 text-xs font-semibold">
              <Users className="w-3.5 h-3.5 text-slate-500" />
              <span>{participantCount}</span>
            </span>
          </div>
        </div>

        {/* Tab Navigation (Live Poll vs Audience Q&A) */}
        {poll.qa_enabled && (
          <div className="max-w-2xl mx-auto px-4 flex border-t border-slate-100">
            <button
              onClick={() => setActiveTab('poll')}
              className={`flex-1 py-3 text-sm font-bold flex items-center justify-center gap-2 border-b-2 transition ${
                activeTab === 'poll'
                  ? 'border-brand-600 text-brand-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Radio className="w-4 h-4" />
              <span>Live Poll</span>
            </button>
            <button
              onClick={() => setActiveTab('qa')}
              className={`flex-1 py-3 text-sm font-bold flex items-center justify-center gap-2 border-b-2 transition ${
                activeTab === 'qa'
                  ? 'border-brand-600 text-brand-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <MessageSquare className="w-4 h-4" />
              <span>Audience Q&A</span>
              {qaQuestions.length > 0 && (
                <span className="text-xs bg-slate-200 text-slate-700 px-1.5 py-0.2 rounded-full">
                  {qaQuestions.length}
                </span>
              )}
            </button>
          </div>
        )}
      </header>

      {/* Main Content Area */}
      <main className="max-w-2xl mx-auto w-full px-4 py-6 flex-1 flex flex-col">
        {activeTab === 'poll' ? (
          /* ==============================================================
             LIVE POLL TAB
             ============================================================== */
          <div className="space-y-6 flex-1 flex flex-col">
            {isPollClosed ? (
              <div className="bg-white rounded-3xl p-8 border border-slate-200 text-center shadow-xs my-auto">
                <div className="w-14 h-14 bg-slate-100 text-slate-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                </div>
                <h2 className="text-xl font-bold text-slate-900 mb-2">This Live Poll Has Ended</h2>
                <p className="text-sm text-slate-600 mb-4">
                  Thank you for participating! The host has concluded the live session.
                </p>
                {liveResults && showResults && (
                  <div className="mt-6 pt-6 border-t border-slate-100 text-left">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">
                      Final Question Results
                    </h3>
                    {currentQuestion?.question_type === 'multiple_choice' && (
                      <LiveBarChart results={liveResults.results} totalVotes={liveResults.totalVotes} />
                    )}
                    {currentQuestion?.question_type === 'word_cloud' && (
                      <WordCloud words={liveResults.words} />
                    )}
                    {currentQuestion?.question_type === 'rating' && (
                      <LiveRatingChart ratingData={liveResults} />
                    )}
                  </div>
                )}
              </div>
            ) : !currentQuestion ? (
              <div className="bg-white rounded-3xl p-8 border border-slate-200 text-center shadow-xs my-auto">
                <div className="w-14 h-14 bg-brand-50 text-brand-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Radio className="w-7 h-7 animate-pulse" />
                </div>
                <h2 className="text-xl font-bold text-slate-900 mb-2">Waiting for Host</h2>
                <p className="text-sm text-slate-600">
                  The host hasn't activated a question yet. Please hold on — this screen will automatically update as soon as the first question is launched!
                </p>
              </div>
            ) : (
              <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm flex flex-col">
                {/* Question Header */}
                <div className="mb-6">
                  <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                    <span>Question {currentQuestion.order_num}</span>
                    <span className="text-brand-600 capitalize">
                      {currentQuestion.question_type.replace('_', ' ')}
                    </span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
                    {currentQuestion.question_text}
                  </h2>
                </div>

                {/* Voting Locked Banner */}
                {!votingOpen && (
                  <div className="mb-6 p-3.5 rounded-2xl bg-amber-50 border border-amber-200 flex items-center gap-2.5 text-xs text-amber-800 font-medium">
                    <Lock className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Voting is locked by the presenter for this question.</span>
                  </div>
                )}

                {/* Response Status Banner */}
                {hasVoted && (
                  <div className="mb-6 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center gap-3 text-emerald-800 text-sm font-semibold animate-in fade-in">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                    <div className="flex-1">
                      <p>Your response is recorded!</p>
                      {userVote && (
                        <p className="text-xs text-emerald-700/80 font-normal mt-0.5">
                          Current choice: <strong className="font-bold">{userVote}</strong>
                          {votingOpen && ' • Tap another option below anytime to change your answer'}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Question Input Form / Options (Active whenever voting is open, allows changing vote) */}
                {votingOpen ? (
                  <div className="space-y-4">
                    {/* Multiple Choice */}
                    {currentQuestion.question_type === 'multiple_choice' && (
                      <div className="space-y-2.5">
                        {currentQuestion.options?.map((opt, i) => {
                          const isSelected = String(userVote) === String(opt);
                          return (
                            <button
                              key={i}
                              disabled={submittingVote}
                              onClick={() => handleVote(opt)}
                              className={`w-full text-left p-4 rounded-2xl border-2 transition-all active:scale-99 shadow-xs flex items-center justify-between group ${
                                isSelected
                                  ? 'border-brand-600 bg-brand-50/70 text-brand-950 font-bold ring-2 ring-brand-500/20'
                                  : 'border-slate-200 hover:border-brand-400 hover:bg-slate-50 text-slate-800 font-semibold'
                              }`}
                            >
                              <div className="flex items-center space-x-3">
                                <span className={`w-6 h-6 rounded-full border-2 text-xs font-bold flex items-center justify-center transition ${
                                  isSelected
                                    ? 'border-brand-600 bg-brand-600 text-white'
                                    : 'border-slate-300 text-slate-500 group-hover:border-brand-400'
                                }`}>
                                  {isSelected ? '✓' : String.fromCharCode(65 + i)}
                                </span>
                                <span>{opt}</span>
                              </div>
                              {isSelected && (
                                <span className="text-xs font-bold text-brand-600 px-2 py-0.5 rounded-full bg-brand-100">
                                  Your Choice
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {/* Word Cloud */}
                    {currentQuestion.question_type === 'word_cloud' && (() => {
                      const allowMultiple = currentQuestion.options?.allowMultiple !== false;
                      return (
                        <form
                          onSubmit={(e) => {
                            e.preventDefault();
                            if (textInput.trim()) {
                              handleVote(textInput.trim());
                              setTextInput('');
                            }
                          }}
                          className="space-y-4"
                        >
                          <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                              {allowMultiple
                                ? hasVoted
                                  ? 'Submit another word (or multiple separated by commas):'
                                  : 'Enter word(s) or short phrases (comma-separated allowed):'
                                : hasVoted
                                ? 'Change your word:'
                                : 'Enter your word (single submission):'}
                            </label>
                            <input
                              type="text"
                              maxLength={allowMultiple ? 100 : 35}
                              value={textInput}
                              onChange={(e) => setTextInput(e.target.value)}
                              placeholder={
                                allowMultiple
                                  ? 'e.g. Innovative, Fast, Leadership...'
                                  : 'e.g. Innovative'
                              }
                              className="w-full px-4 py-3.5 rounded-2xl border-2 border-slate-200 focus:border-brand-500 focus:ring-0 text-base font-medium text-slate-900 placeholder:text-slate-400"
                              autoFocus
                            />
                            {allowMultiple && (
                              <p className="text-[11px] text-slate-500 mt-1.5">
                                You can submit multiple words to this cloud. Enter one at a time or separate with commas.
                              </p>
                            )}
                          </div>
                          <button
                            type="submit"
                            disabled={!textInput.trim() || submittingVote}
                            className="w-full py-3.5 px-4 rounded-2xl bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-bold text-base shadow-sm transition active:scale-98 flex items-center justify-center gap-2"
                          >
                            <Send className="w-4 h-4" />
                            <span>
                              {allowMultiple
                                ? hasVoted
                                  ? 'Add Another Word'
                                  : 'Submit Word'
                                : hasVoted
                                ? 'Update Word'
                                : 'Submit Word'}
                            </span>
                          </button>
                        </form>
                      );
                    })()}

                    {/* Star / Number Rating */}
                    {currentQuestion.question_type === 'rating' && (
                      <div className="py-2">
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-4 text-center">
                          {hasVoted ? 'Change your rating anytime:' : 'Select your rating (1 to 5):'}
                        </label>
                        <div className="flex items-center justify-center gap-2 sm:gap-4">
                          {[1, 2, 3, 4, 5].map((star) => {
                            const isSelected = Number(userVote) === star;
                            const isFilled = Number(userVote) >= star;
                            return (
                              <button
                                key={star}
                                disabled={submittingVote}
                                onClick={() => handleVote(String(star))}
                                className={`flex flex-col items-center justify-center w-14 h-16 sm:w-16 sm:h-20 rounded-2xl border-2 transition-all active:scale-95 group shadow-xs ${
                                  isSelected
                                    ? 'border-amber-500 bg-amber-50 ring-2 ring-amber-400/30'
                                    : 'border-slate-200 hover:border-amber-400 hover:bg-amber-50/50'
                                }`}
                              >
                                <Star className={`w-6 h-6 transition ${
                                  isFilled
                                    ? 'text-amber-500 fill-amber-400'
                                    : 'text-slate-300 group-hover:text-amber-400'
                                }`} />
                                <span className={`text-sm sm:text-base mt-1 font-bold ${
                                  isSelected ? 'text-amber-800' : 'text-slate-700'
                                }`}>
                                  {star}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                ) : null}

                {/* Live Results Section (if voted or voting locked, and host enabled results) */}
                {(hasVoted || !votingOpen) && showResults && liveResults && (
                  <div className="mt-8 pt-6 border-t border-slate-100">
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-brand-500" />
                        Live Results
                      </span>
                      <span className="text-xs font-bold text-slate-500">
                        {liveResults.totalVotes} response{liveResults.totalVotes === 1 ? '' : 's'}
                      </span>
                    </div>

                    {currentQuestion.question_type === 'multiple_choice' && (
                      <LiveBarChart results={liveResults.results} totalVotes={liveResults.totalVotes} />
                    )}

                    {currentQuestion.question_type === 'word_cloud' && (
                      <WordCloud words={liveResults.words} />
                    )}

                    {currentQuestion.question_type === 'rating' && (
                      <LiveRatingChart ratingData={liveResults} />
                    )}

                    {currentQuestion.question_type === 'open_text' && (
                      <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                        {liveResults.responses?.map((resp, idx) => (
                          <div key={idx} className="p-3 bg-slate-50 rounded-xl text-sm text-slate-800 border border-slate-100">
                            {resp}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          /* ==============================================================
             AUDIENCE Q&A TAB
             ============================================================== */
          <div className="space-y-6 flex-1 flex flex-col">
            {/* Submit a Question Form */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
              <h3 className="font-bold text-slate-900 text-base mb-3 flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-brand-600" />
                <span>Ask the Presenter</span>
              </h3>

              {qaNotice && (
                <div className="mb-3 p-3 bg-brand-50 border border-brand-200 rounded-xl text-xs text-brand-800 font-medium">
                  {qaNotice}
                </div>
              )}

              <form onSubmit={handleQaSubmit} className="space-y-3">
                <textarea
                  rows={2}
                  value={newQuestionText}
                  onChange={(e) => setNewQuestionText(e.target.value)}
                  placeholder="Type your question for the audience or speaker..."
                  className="w-full px-4 py-3 rounded-2xl border-2 border-slate-200 focus:border-brand-500 focus:ring-0 text-sm font-medium text-slate-900 placeholder:text-slate-400"
                />

                <div className="flex items-center gap-3">
                  <input
                    type="text"
                    value={authorName}
                    onChange={(e) => setAuthorName(e.target.value)}
                    placeholder="Your name (optional)"
                    className="flex-1 px-3.5 py-2 rounded-xl border border-slate-200 text-xs text-slate-700 placeholder:text-slate-400"
                  />
                  <button
                    type="submit"
                    disabled={!newQuestionText.trim() || submittingQa}
                    className="py-2 px-4 rounded-xl bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-bold text-xs shadow-xs transition flex items-center gap-1.5"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Send</span>
                  </button>
                </div>
              </form>
            </div>

            {/* Questions Feed */}
            <div className="space-y-3 flex-1">
              <div className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-wider px-1">
                <span>Top Audience Questions</span>
                <span>{qaQuestions.length} Questions</span>
              </div>

              {qaQuestions.length === 0 ? (
                <div className="p-8 text-center bg-white rounded-3xl border border-slate-200 text-slate-400">
                  <p className="font-medium text-sm">No questions asked yet</p>
                  <p className="text-xs text-slate-400 mt-1">Be the first to submit a question to the host!</p>
                </div>
              ) : (
                qaQuestions.map((q) => {
                  const hasUpvoted = userUpvotes.includes(q.id);
                  const isHighlighted = q.is_highlighted === 1;

                  return (
                    <div
                      key={q.id}
                      className={`p-4 rounded-2xl border transition-all ${
                        isHighlighted
                          ? 'bg-amber-50/80 border-amber-300 shadow-sm ring-2 ring-amber-300/40'
                          : q.is_answered === 1
                          ? 'bg-slate-50/60 border-slate-200 opacity-70'
                          : 'bg-white border-slate-200 shadow-xs'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          {isHighlighted && (
                            <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-200 text-amber-900 mb-1.5">
                              ⭐ Currently Answering
                            </span>
                          )}
                          <p className="text-sm font-semibold text-slate-900 leading-snug">
                            {q.question_text}
                          </p>
                          <span className="text-xs text-slate-400 mt-1.5 inline-block">
                            by {q.author_name || 'Anonymous'}
                          </span>
                        </div>

                        {/* Upvote Button */}
                        <button
                          onClick={() => handleQaUpvote(q.id)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition active:scale-95 ${
                            hasUpvoted
                              ? 'bg-brand-50 border-brand-300 text-brand-700 shadow-xs'
                              : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-600'
                          }`}
                        >
                          <ThumbsUp className={`w-3.5 h-3.5 ${hasUpvoted ? 'fill-brand-600 text-brand-600' : ''}`} />
                          <span className="tabular-nums">{q.upvotes || 0}</span>
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </main>

      {/* Persistent Bottom Join Help Bar for Mobile */}
      <footer className="fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur-xs border-t border-slate-200 p-2 sm:hidden flex items-center justify-between text-xs text-slate-500 px-4">
        <span>Poll PIN: <strong className="font-mono text-slate-800">#{poll.code}</strong></span>
        <span className="text-[11px] text-slate-400">Ask by urspace</span>
      </footer>
    </div>
  );
}
