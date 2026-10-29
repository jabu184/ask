import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { io } from 'socket.io-client';
import { publicPollApi } from '../services/api';
import WordCloud from '../components/WordCloud';
import LiveBarChart from '../components/LiveBarChart';
import LiveRatingChart from '../components/LiveRatingChart';
import LiveRankingChart from '../components/LiveRankingChart';
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
  Sparkles,
  X,
  Trophy,
  ChevronUp,
  ChevronDown,
  ListOrdered,
  Check,
  Edit3
} from 'lucide-react';

const QUIZ_AVATARS = ['🚀', '🦁', '🦊', '🐼', '🐨', '🦄', '⚡', '🎯', '🌟', '🐬', '🦉', '👑'];

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
  const [myWords, setMyWords] = useState([]);
  const [showCorrectAnswer, setShowCorrectAnswer] = useState(false);
  const [correctAnswer, setCorrectAnswer] = useState(null);
  const [votingOpen, setVotingOpen] = useState(true);
  const [showResults, setShowResults] = useState(true);
  const [participantCount, setParticipantCount] = useState(1);

  // Ranking question state
  const [rankedItems, setRankedItems] = useState([]);

  // Quiz Mode state
  const [isQuizMode, setIsQuizMode] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [leaderboard, setLeaderboard] = useState([]);
  const [quizProfile, setQuizProfile] = useState(() => {
    try {
      const saved = localStorage.getItem('ask_quiz_' + code);
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });
  const [quizName, setQuizName] = useState('');
  const [quizAvatar, setQuizAvatar] = useState('🚀');
  const [submittingQuizProfile, setSubmittingQuizProfile] = useState(false);

  // Edit Profile Modal
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editProfileName, setEditProfileName] = useState('');
  const [editProfileAvatar, setEditProfileAvatar] = useState('🚀');

  // Form inputs for voting
  const [textInput, setTextInput] = useState('');
  const [submittingVote, setSubmittingVote] = useState(false);

  // Q&A state
  const [qaQuestions, setQaQuestions] = useState([]);
  const [userUpvotes, setUserUpvotes] = useState([]);
  const [newQuestionText, setNewQuestionText] = useState('');
  const [authorName, setAuthorName] = useState('');
  const [isAnonymousQa, setIsAnonymousQa] = useState(false);
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
        setMyWords(initial.userVotes || []);
        setShowCorrectAnswer(Boolean(initial.poll?.show_correct_answer));
        setCorrectAnswer(initial.currentQuestion?.correct_answer || null);
        setIsQuizMode(Boolean(initial.poll?.is_quiz_mode));
        setShowLeaderboard(Boolean(initial.poll?.show_leaderboard));
        setLeaderboard(initial.leaderboard || []);
        if (initial.quizProfile) {
          setQuizProfile(initial.quizProfile);
          try {
            localStorage.setItem('ask_quiz_' + code, JSON.stringify(initial.quizProfile));
          } catch (e) {}
        }
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

        // If local profile already existed but not returned by server yet, auto register with socket
        try {
          const saved = localStorage.getItem('ask_quiz_' + code);
          if (saved) {
            const parsed = JSON.parse(saved);
            if (parsed && parsed.name) {
              socket.emit('poll:register_quiz_participant', {
                pollId: initial.poll.id,
                participantId,
                name: parsed.name,
                avatar: parsed.avatar || '🚀'
              });
            }
          }
        } catch (e) {}

        socket.on('poll:state', (state) => {
          if (!state) return;
          setPoll(state.poll);
          setCurrentQuestion(state.currentQuestion);
          setLiveResults(state.liveResults);
          setHasVoted(state.hasVoted);
          setUserVote(state.userVote);
          if (state.userVotes) setMyWords(state.userVotes);
          if (state.poll && typeof state.poll.show_correct_answer !== 'undefined') {
            setShowCorrectAnswer(Boolean(state.poll.show_correct_answer));
          }
          if (state.poll && typeof state.poll.is_quiz_mode !== 'undefined') {
            setIsQuizMode(Boolean(state.poll.is_quiz_mode));
          }
          if (state.poll && typeof state.poll.show_leaderboard !== 'undefined') {
            setShowLeaderboard(Boolean(state.poll.show_leaderboard));
          }
          if (state.currentQuestion) {
            setCorrectAnswer(state.currentQuestion.correct_answer || null);
          }
          if (state.leaderboard) setLeaderboard(state.leaderboard);
          if (state.quizProfile) {
            setQuizProfile(state.quizProfile);
            try {
              localStorage.setItem('ask_quiz_' + code, JSON.stringify(state.quizProfile));
            } catch (e) {}
          }
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
          setMyWords([]);
          setShowCorrectAnswer(false);
          setCorrectAnswer(data.currentQuestion?.correct_answer || null);
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

        socket.on('poll:user_words_updated', ({ words }) => {
          setMyWords(words || []);
          if (words && words.length > 0) {
            setHasVoted(true);
          } else {
            setHasVoted(false);
          }
          setSubmittingVote(false);
        });

        socket.on('poll:correct_answer_toggled', ({ show_correct_answer, correctAnswer }) => {
          setShowCorrectAnswer(Boolean(show_correct_answer));
          if (correctAnswer !== undefined) {
            setCorrectAnswer(correctAnswer);
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

        socket.on('poll:quiz_profile_confirmed', (profile) => {
          setQuizProfile(profile);
          try {
            localStorage.setItem('ask_quiz_' + code, JSON.stringify(profile));
          } catch (e) {}
          setSubmittingQuizProfile(false);
        });

        socket.on('poll:leaderboard_toggled', ({ show_leaderboard, leaderboard: lb }) => {
          setShowLeaderboard(Boolean(show_leaderboard));
          if (lb) {
            setLeaderboard(lb);
            const me = lb.find((p) => p.participant_id === participantId);
            if (me) {
              setQuizProfile((prev) => (prev ? { ...prev, score: me.score } : me));
            }
          }
        });

        socket.on('poll:leaderboard_update', ({ leaderboard: lb }) => {
          if (lb) {
            setLeaderboard(lb);
            const me = lb.find((p) => p.participant_id === participantId);
            if (me) {
              setQuizProfile((prev) => (prev ? { ...prev, score: me.score } : me));
            }
          }
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

  const isLockedByHost = showCorrectAnswer || Boolean(currentQuestion?.answer_revealed);

  // Handle vote submit
  const handleVote = (val) => {
    if (!poll || !currentQuestion || !votingOpen || submittingVote || isLockedByHost) return;
    setSubmittingVote(true);

    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit('poll:submit_vote', {
        pollId: poll.id,
        questionId: currentQuestion.id,
        participantId,
        value: val
      });
      setTimeout(() => setSubmittingVote(false), 300);
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
          if (currentQuestion.question_type === 'word_cloud') {
            publicPollApi.get(poll.id, participantId).then((data) => {
              if (data?.userVotes) setMyWords(data.userVotes);
            });
          }
        })
        .catch((err) => {
          alert(err.response?.data?.error || 'Failed to submit vote');
        })
        .finally(() => {
          setSubmittingVote(false);
        });
    }
  };

  // Handle removing a participant's own word from the cloud
  const handleRemoveWord = (voteId) => {
    if (isLockedByHost) return;
    setMyWords((prev) => {
      const next = prev.filter((w) => w.id !== voteId);
      if (next.length === 0) setHasVoted(false);
      return next;
    });

    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit('poll:remove_word', {
        pollId: poll.id,
        questionId: currentQuestion.id,
        participantId,
        voteId
      });
    } else {
      publicPollApi
        .removeWord(poll.id, {
          questionId: currentQuestion.id,
          participantId,
          voteId
        })
        .catch((err) => {
          console.error('Failed to remove word', err);
        });
    }
  };

  // Sync authorName with quizProfile name
  useEffect(() => {
    if (quizProfile?.name && !authorName) {
      setAuthorName(quizProfile.name);
    }
  }, [quizProfile]);

  // Sync ranking options when question or vote changes
  useEffect(() => {
    if (currentQuestion?.question_type === 'ranking') {
      let initial = [];
      if (userVote) {
        try {
          initial = Array.isArray(userVote) ? userVote : JSON.parse(userVote);
        } catch (e) {
          initial = String(userVote).split(',').map((s) => s.trim()).filter(Boolean);
        }
      }
      if (!initial || initial.length === 0) {
        initial = Array.isArray(currentQuestion.options) ? [...currentQuestion.options] : [];
      }
      setRankedItems(initial);
    }
  }, [currentQuestion, userVote]);

  const moveRankItem = (index, direction) => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= rankedItems.length) return;
    const next = [...rankedItems];
    const item = next[index];
    next[index] = next[targetIndex];
    next[targetIndex] = item;
    setRankedItems(next);
  };

  // Handle Quiz Mode Participant Registration
  const handleRegisterQuizParticipant = async (e) => {
    if (e) e.preventDefault();
    const trimmed = quizName.trim();
    if (!trimmed || submittingQuizProfile) return;
    setSubmittingQuizProfile(true);

    const profileData = {
      name: trimmed,
      avatar: quizAvatar || '🚀',
      participant_id: participantId,
      score: 0
    };

    setQuizProfile(profileData);
    if (!authorName) setAuthorName(trimmed);
    try {
      localStorage.setItem('ask_quiz_' + code, JSON.stringify(profileData));
    } catch (err) {}

    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit('poll:register_quiz_participant', {
        pollId: poll.id,
        participantId,
        name: trimmed,
        avatar: quizAvatar || '🚀'
      });
    }

    try {
      await publicPollApi.registerParticipant(poll.id, {
        participantId,
        name: trimmed,
        avatar: quizAvatar || '🚀'
      });
    } catch (err) {
      console.error('Participant registration sync error', err);
    } finally {
      setSubmittingQuizProfile(false);
    }
  };

  // Handle Updating Profile (Name & Avatar)
  const handleSaveProfile = async (e) => {
    if (e) e.preventDefault();
    const trimmed = editProfileName.trim();
    if (!trimmed) return;

    const updatedProfile = {
      ...(quizProfile || {}),
      name: trimmed,
      avatar: editProfileAvatar || '🚀',
      participant_id: participantId
    };

    setQuizProfile(updatedProfile);
    if (!authorName || authorName === quizProfile?.name) {
      setAuthorName(trimmed);
    }
    try {
      localStorage.setItem('ask_quiz_' + code, JSON.stringify(updatedProfile));
    } catch (err) {}

    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit('poll:register_quiz_participant', {
        pollId: poll.id,
        participantId,
        name: trimmed,
        avatar: editProfileAvatar || '🚀'
      });
    }

    try {
      await publicPollApi.registerParticipant(poll.id, {
        participantId,
        name: trimmed,
        avatar: editProfileAvatar || '🚀'
      });
    } catch (err) {
      console.error('Participant profile update error', err);
    } finally {
      setIsEditingProfile(false);
    }
  };

  // Handle Q&A submit
  const handleQaSubmit = (e) => {
    e.preventDefault();
    if (!newQuestionText.trim() || submittingQa) return;
    setSubmittingQa(true);

    const effectiveName = isAnonymousQa
      ? 'Anonymous'
      : (authorName.trim() || quizProfile?.name || 'Anonymous');

    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit('qa:submit', {
        pollId: poll.id,
        participantId,
        author_name: effectiveName,
        question_text: newQuestionText.trim()
      });
      setNewQuestionText('');
      setSubmittingQa(false);
    } else {
      publicPollApi
        .submitQA(poll.id, {
          participantId,
          author_name: effectiveName,
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
            {isQuizMode && quizProfile && (
              <button
                type="button"
                onClick={() => {
                  setEditProfileName(quizProfile.name || '');
                  setEditProfileAvatar(quizProfile.avatar || '🚀');
                  setIsEditingProfile(true);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 hover:bg-amber-100 border border-amber-300 text-xs font-bold text-amber-900 shadow-2xs transition active:scale-95 group cursor-pointer"
                title="Click to change your nickname and avatar"
              >
                <span className="text-base">{quizProfile.avatar || '🚀'}</span>
                <span className="truncate max-w-[120px]">{quizProfile.name}</span>
                <Edit3 className="w-3 h-3 text-amber-600/70 group-hover:text-amber-800 shrink-0 ml-0.5" />
              </button>
            )}
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
            {isQuizMode && !quizProfile ? (
              /* ==============================================================
                 QUIZ MODE ONBOARDING (Name + Avatar Picker)
                 ============================================================== */
              <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm my-auto animate-fadeIn">
                <div className="w-14 h-14 bg-amber-50 text-amber-500 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-amber-200 shadow-2xs">
                  <Trophy className="w-7 h-7 text-amber-500" />
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 text-center tracking-tight mb-1">
                  Welcome to the Live Quiz!
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 text-center mb-6">
                  Enter your nickname and choose your avatar to join the competition.
                </p>

                <form onSubmit={handleRegisterQuizParticipant} className="space-y-5">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
                      Your Player Name
                    </label>
                    <input
                      type="text"
                      required
                      maxLength={30}
                      value={quizName}
                      onChange={(e) => setQuizName(e.target.value)}
                      placeholder="e.g. Alex M."
                      className="w-full px-4 py-3.5 rounded-2xl border-2 border-slate-200 focus:border-amber-500 focus:ring-0 text-base font-semibold text-slate-900 placeholder:text-slate-400 shadow-2xs"
                      autoFocus
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
                      Choose Your Avatar
                    </label>
                    <div className="grid grid-cols-6 gap-2 pt-1">
                      {QUIZ_AVATARS.map((av) => (
                        <button
                          key={av}
                          type="button"
                          onClick={() => setQuizAvatar(av)}
                          className={`h-12 rounded-2xl text-2xl flex items-center justify-center border-2 transition active:scale-95 ${
                            quizAvatar === av
                              ? 'border-amber-500 bg-amber-50 ring-2 ring-amber-400/30 shadow-xs'
                              : 'border-slate-200 bg-white hover:border-amber-300 hover:bg-slate-50'
                          }`}
                        >
                          {av}
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={!quizName.trim() || submittingQuizProfile}
                    className="w-full py-3.5 px-4 rounded-2xl bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-extrabold text-base shadow-sm shadow-amber-500/20 transition active:scale-98 flex items-center justify-center space-x-2"
                  >
                    <span>{submittingQuizProfile ? 'Joining Quiz...' : 'Join Quiz & Start Playing'}</span>
                    <span className="text-lg">🚀</span>
                  </button>
                </form>
              </div>
            ) : isPollClosed ? (
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
                      <LiveBarChart
                        results={liveResults.results}
                        totalVotes={liveResults.totalVotes}
                        correctAnswer={correctAnswer}
                        showCorrectAnswer={showCorrectAnswer}
                      />
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

                {/* Question Input Form / Options (Active whenever voting is open, allows changing vote) */}
                {votingOpen ? (
                  <div className="space-y-4">
                    {/* Multiple Choice */}
                    {currentQuestion.question_type === 'multiple_choice' && (
                      <div className="space-y-2.5">
                        {currentQuestion.options?.map((opt, i) => {
                          const isSelected = String(userVote) === String(opt);
                          const isCorrect = showCorrectAnswer && Boolean(correctAnswer) && String(opt) === String(correctAnswer);
                          const isIncorrectChoice = showCorrectAnswer && Boolean(correctAnswer) && isSelected && !isCorrect;

                          return (
                            <button
                              key={i}
                              disabled={submittingVote || isLockedByHost}
                              onClick={() => handleVote(opt)}
                              className={`w-full text-left p-4 rounded-2xl border-2 transition-all shadow-xs flex items-center justify-between group ${
                                isLockedByHost ? 'cursor-default' : 'active:scale-99'
                              } ${
                                isCorrect
                                  ? 'border-emerald-500 bg-emerald-50/80 text-emerald-950 font-bold ring-2 ring-emerald-500/20'
                                  : isIncorrectChoice
                                  ? 'border-rose-500 bg-rose-50/80 text-rose-950 font-bold ring-2 ring-rose-500/20'
                                  : isSelected
                                  ? 'border-brand-600 bg-brand-50/70 text-brand-950 font-bold ring-2 ring-brand-500/20'
                                  : 'border-slate-200 hover:border-brand-400 hover:bg-slate-50 text-slate-800 font-semibold'
                              }`}
                            >
                              <div className="flex items-center space-x-3">
                                <span className={`w-6 h-6 rounded-full border-2 text-xs font-bold flex items-center justify-center transition ${
                                  isCorrect
                                    ? 'border-emerald-600 bg-emerald-600 text-white'
                                    : isSelected
                                    ? 'border-brand-600 bg-brand-600 text-white'
                                    : 'border-slate-300 text-slate-500 group-hover:border-brand-400'
                                }`}>
                                  {isCorrect ? '✓' : isIncorrectChoice ? '✕' : isSelected ? '✓' : String.fromCharCode(65 + i)}
                                </span>
                                <span>{opt}</span>
                              </div>
                              <div className="flex items-center space-x-2">
                                {isCorrect && (
                                  <span className="text-xs font-bold text-emerald-800 px-2.5 py-0.5 rounded-full bg-emerald-100 border border-emerald-300 flex items-center space-x-1 shadow-2xs">
                                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                    <span>Correct Answer</span>
                                  </span>
                                )}
                                {isIncorrectChoice && (
                                  <span className="text-xs font-bold text-rose-800 px-2.5 py-0.5 rounded-full bg-rose-100 border border-rose-300 flex items-center space-x-1 shadow-2xs">
                                    <X className="w-3.5 h-3.5 text-rose-600" />
                                    <span>Your Choice (Incorrect)</span>
                                  </span>
                                )}
                                {isSelected && !showCorrectAnswer && (
                                  <span className="text-xs font-bold text-brand-600 px-2 py-0.5 rounded-full bg-brand-100">
                                    Your Choice
                                  </span>
                                )}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {/* Word Cloud */}
                    {currentQuestion.question_type === 'word_cloud' && (() => {
                      const allowMultiple = currentQuestion.options?.allowMultiple !== false;
                      return (
                        <div className="space-y-4">
                          {/* User's existing words chips */}
                          {myWords.length > 0 && (
                            <div className="p-4 rounded-2xl bg-brand-50/60 border border-brand-200 space-y-2">
                              <div className="flex items-center justify-between text-xs font-bold text-brand-950">
                                <span className="flex items-center gap-1.5">
                                  <CheckCircle2 className="w-3.5 h-3.5 text-brand-600" />
                                  <span>Your Submitted Words ({myWords.length})</span>
                                </span>
                                {votingOpen && !isLockedByHost && (
                                  <span className="text-[11px] font-normal text-slate-500">
                                    Click ✕ to remove any word
                                  </span>
                                )}
                              </div>
                              <div className="flex flex-wrap gap-2 pt-1">
                                {myWords.map((item) => (
                                  <span
                                    key={item.id}
                                    className="inline-flex items-center gap-1.5 pl-3 pr-2 py-1.5 rounded-xl bg-white border border-brand-200 text-brand-900 text-xs font-bold shadow-2xs group hover:border-brand-400 transition"
                                  >
                                    <span>{item.value}</span>
                                    {votingOpen && !isLockedByHost && (
                                      <button
                                        type="button"
                                        onClick={() => handleRemoveWord(item.id)}
                                        className="p-0.5 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                                        title={`Remove "${item.value}"`}
                                      >
                                        <X className="w-3.5 h-3.5" />
                                      </button>
                                    )}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          <form
                            onSubmit={(e) => {
                              e.preventDefault();
                              if (isLockedByHost) return;
                              const trimmed = textInput.trim();
                              if (trimmed) {
                                const isDuplicate = myWords.some((w) => w.value.toLowerCase() === trimmed.toLowerCase());
                                if (!isDuplicate) {
                                  handleVote(trimmed);
                                }
                                setTextInput('');
                              }
                            }}
                            className="space-y-4"
                          >
                            <div>
                              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                                {allowMultiple
                                  ? myWords.length > 0
                                    ? 'Add another word to the cloud:'
                                    : 'Enter word(s) or short phrases:'
                                  : myWords.length > 0
                                  ? 'Change your word:'
                                  : 'Enter your word:'}
                              </label>
                              <input
                                type="text"
                                maxLength={allowMultiple ? 100 : 35}
                                value={textInput}
                                disabled={!votingOpen || isLockedByHost}
                                onChange={(e) => setTextInput(e.target.value)}
                                placeholder={
                                  isLockedByHost
                                    ? 'Voting is locked for this question'
                                    : allowMultiple
                                    ? 'Type a word and press Enter...'
                                    : 'e.g. Innovative'
                                }
                                className="w-full px-4 py-3.5 rounded-2xl border-2 border-slate-200 focus:border-brand-500 focus:ring-0 text-base font-medium text-slate-900 placeholder:text-slate-400 disabled:bg-slate-50 disabled:cursor-not-allowed"
                                autoFocus
                              />
                              {allowMultiple && !isLockedByHost && (
                                <p className="text-[11px] text-slate-500 mt-1.5">
                                  You can add multiple words sequentially. Each word will appear in the cloud, and you can delete your words anytime.
                                </p>
                              )}
                            </div>
                            <button
                              type="submit"
                              disabled={!textInput.trim() || submittingVote || isLockedByHost}
                              className="w-full py-3.5 px-4 rounded-2xl bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-bold text-base shadow-sm transition active:scale-98 flex items-center justify-center gap-2 cursor-pointer"
                            >
                              <Send className="w-4 h-4" />
                              <span>
                                {isLockedByHost
                                  ? 'Voting Locked'
                                  : allowMultiple
                                  ? myWords.length > 0
                                    ? 'Add Word'
                                    : 'Submit Word'
                                  : myWords.length > 0
                                  ? 'Update Word'
                                  : 'Submit Word'}
                              </span>
                            </button>
                          </form>
                        </div>
                      );
                    })()}

                    {/* Star / Number Rating */}
                    {currentQuestion.question_type === 'rating' && (
                      <div className="py-2">
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-4 text-center">
                          {isLockedByHost ? 'Voting is locked:' : hasVoted ? 'Change your rating anytime:' : 'Select your rating (1 to 5):'}
                        </label>
                        <div className="flex items-center justify-center gap-2 sm:gap-4">
                          {[1, 2, 3, 4, 5].map((star) => {
                            const isSelected = Number(userVote) === star;
                            const isFilled = Number(userVote) >= star;
                            return (
                              <button
                                key={star}
                                disabled={submittingVote || isLockedByHost}
                                onClick={() => handleVote(String(star))}
                                className={`flex flex-col items-center justify-center w-14 h-16 sm:w-16 sm:h-20 rounded-2xl border-2 transition-all group shadow-xs ${
                                  isLockedByHost ? 'cursor-default' : 'active:scale-95'
                                } ${
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

                    {/* Ranking Question */}
                    {currentQuestion.question_type === 'ranking' && (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between text-xs text-slate-500 font-semibold px-1">
                          <span className="flex items-center gap-1.5">
                            <ListOrdered className="w-3.5 h-3.5 text-brand-600" />
                            <span>Rank in your preferred order:</span>
                          </span>
                          <span className="text-[11px] text-slate-400">Use ▲ ▼ to reorder</span>
                        </div>

                        <div className="space-y-2">
                          {rankedItems.map((item, idx) => (
                            <div
                              key={idx}
                              className="p-3.5 rounded-2xl bg-white border-2 border-slate-200 hover:border-brand-300 shadow-2xs flex items-center justify-between gap-3 transition"
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <span className="w-7 h-7 rounded-xl bg-slate-900 text-white font-black text-xs flex items-center justify-center shrink-0">
                                  #{idx + 1}
                                </span>
                                <span className="text-sm sm:text-base font-semibold text-slate-900 truncate">
                                  {item}
                                </span>
                              </div>

                              <div className="flex items-center gap-1 shrink-0">
                                <button
                                  type="button"
                                  disabled={idx === 0 || submittingVote || isLockedByHost}
                                  onClick={() => moveRankItem(idx, 'up')}
                                  className="p-2 rounded-xl bg-slate-100 hover:bg-brand-50 text-slate-600 hover:text-brand-600 disabled:opacity-25 transition active:scale-95 cursor-pointer"
                                  title="Move Up"
                                >
                                  <ChevronUp className="w-4 h-4" />
                                </button>
                                <button
                                  type="button"
                                  disabled={idx === rankedItems.length - 1 || submittingVote || isLockedByHost}
                                  onClick={() => moveRankItem(idx, 'down')}
                                  className="p-2 rounded-xl bg-slate-100 hover:bg-brand-50 text-slate-600 hover:text-brand-600 disabled:opacity-25 transition active:scale-95 cursor-pointer"
                                  title="Move Down"
                                >
                                  <ChevronDown className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>

                        <button
                          type="button"
                          disabled={submittingVote || isLockedByHost || rankedItems.length === 0}
                          onClick={() => handleVote(rankedItems)}
                          className="w-full py-3.5 px-4 rounded-2xl bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-bold text-sm shadow-sm transition active:scale-98 flex items-center justify-center gap-2 cursor-pointer"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          <span>{isLockedByHost ? 'Voting Locked' : hasVoted ? 'Update Ranking' : 'Submit Ranking'}</span>
                        </button>
                      </div>
                    )}
                  </div>
                ) : null}

                {/* Response Status / Correct Answer Banner - sits BELOW choices */}
                {showCorrectAnswer && correctAnswer && currentQuestion.question_type === 'multiple_choice' ? (
                  <div className={`mt-5 p-4 rounded-2xl border flex items-center gap-3 text-sm font-semibold animate-in fade-in shadow-xs ${
                    userVote === correctAnswer
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
                      : userVote
                      ? 'bg-rose-50 border-rose-300 text-rose-950'
                      : 'bg-slate-50 border-slate-300 text-slate-800'
                  }`}>
                    {userVote === correctAnswer ? (
                      <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600" />
                    ) : userVote ? (
                      <AlertCircle className="w-5 h-5 shrink-0 text-rose-600" />
                    ) : (
                      <CheckCircle2 className="w-5 h-5 shrink-0 text-slate-500" />
                    )}
                    <div className="flex-1">
                      <p className="font-bold">
                        {userVote === correctAnswer
                          ? '🎉 You got it right!'
                          : userVote
                          ? 'Your choice was incorrect.'
                          : 'Voting is closed for this question.'}
                      </p>
                      <p className="text-xs font-normal mt-0.5 opacity-90">
                        Correct Answer: <strong className="font-bold underline decoration-2">{correctAnswer}</strong>
                        {userVote && userVote !== correctAnswer && (
                          <span> • You answered: <strong>{userVote}</strong></span>
                        )}
                        {!userVote && <span> • You did not submit a vote before the answer was revealed.</span>}
                      </p>
                    </div>
                  </div>
                ) : isLockedByHost ? (
                  <div className="mt-5 p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-center gap-3 text-slate-800 text-sm font-semibold animate-in fade-in">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                    <div className="flex-1">
                      <p>Your response is recorded and locked.</p>
                      {userVote && (
                        <p className="text-xs text-slate-600 font-normal mt-0.5">
                          Final choice: <strong className="font-bold">
                            {Array.isArray(userVote) ? 'Your submitted ranking' : userVote}
                          </strong>
                          {' • Answers have been locked for this question'}
                        </p>
                      )}
                    </div>
                  </div>
                ) : hasVoted && currentQuestion.question_type !== 'word_cloud' ? (
                  <div className="mt-5 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center gap-3 text-emerald-800 text-sm font-semibold animate-in fade-in">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                    <div className="flex-1">
                      <p>Your response is recorded!</p>
                      {userVote && (
                        <p className="text-xs text-emerald-700/80 font-normal mt-0.5">
                          Current choice: <strong className="font-bold">
                            {Array.isArray(userVote) ? 'Your custom ranking' : userVote}
                          </strong>
                          {votingOpen && !isLockedByHost ? ' • You can update your answer anytime above' : ' • Voting is finalized'}
                        </p>
                      )}
                    </div>
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
                      <LiveBarChart
                        results={liveResults.results}
                        totalVotes={liveResults.totalVotes}
                        correctAnswer={correctAnswer}
                        showCorrectAnswer={showCorrectAnswer}
                      />
                    )}

                    {currentQuestion.question_type === 'word_cloud' && (
                      <WordCloud words={liveResults.words} />
                    )}

                    {currentQuestion.question_type === 'rating' && (
                      <LiveRatingChart ratingData={liveResults} />
                    )}

                    {currentQuestion.question_type === 'ranking' && (
                      <LiveRankingChart rankingData={liveResults} />
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

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={isAnonymousQa}
                        onChange={(e) => setIsAnonymousQa(e.target.checked)}
                        className="w-4 h-4 text-brand-600 rounded border-slate-300 focus:ring-brand-500"
                      />
                      <span>Ask anonymously</span>
                    </label>

                    {!isAnonymousQa && (
                      <input
                        type="text"
                        value={authorName}
                        onChange={(e) => setAuthorName(e.target.value)}
                        placeholder="Your name"
                        className="px-3.5 py-1.5 rounded-xl border border-slate-200 text-xs text-slate-700 placeholder:text-slate-400 max-w-[180px]"
                      />
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={!newQuestionText.trim() || submittingQa}
                    className="py-2 px-4 rounded-xl bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-bold text-xs shadow-xs transition flex items-center justify-center gap-1.5 ml-auto"
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

      {/* Edit Profile Modal */}
      {isEditingProfile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-xl border border-slate-200 space-y-5 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <Trophy className="w-5 h-5 text-amber-500" />
                <h3 className="font-extrabold text-slate-900 text-base">Edit Player Profile</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsEditingProfile(false)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
                  Nickname
                </label>
                <input
                  type="text"
                  required
                  maxLength={30}
                  value={editProfileName}
                  onChange={(e) => setEditProfileName(e.target.value)}
                  placeholder="Your player name"
                  className="w-full px-4 py-3 rounded-2xl border-2 border-slate-200 focus:border-amber-500 focus:ring-0 text-sm font-semibold text-slate-900"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
                  Choose Avatar
                </label>
                <div className="grid grid-cols-6 gap-2">
                  {QUIZ_AVATARS.map((av) => (
                    <button
                      key={av}
                      type="button"
                      onClick={() => setEditProfileAvatar(av)}
                      className={`h-11 rounded-xl text-xl flex items-center justify-center border-2 transition active:scale-95 ${
                        editProfileAvatar === av
                          ? 'border-amber-500 bg-amber-50 ring-2 ring-amber-400/30'
                          : 'border-slate-200 bg-white hover:border-amber-300'
                      }`}
                    >
                      {av}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsEditingProfile(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!editProfileName.trim()}
                  className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-bold text-xs shadow-sm transition"
                >
                  Save Profile
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Persistent Bottom Join Help Bar for Mobile */}
      <footer className="fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur-xs border-t border-slate-200 p-2 sm:hidden flex items-center justify-between text-xs text-slate-500 px-4">
        <span>Poll PIN: <strong className="font-mono text-slate-800">#{poll.code}</strong></span>
        <span className="text-[11px] text-slate-400">Ask by urspace</span>
      </footer>
    </div>
  );
}
