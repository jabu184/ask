import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { pollApi } from '../services/api';
import {
  ArrowLeft,
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  Save,
  Play,
  BarChart2,
  Cloud,
  Star,
  MessageSquare,
  Hash,
  Sparkles,
  AlertCircle,
  HelpCircle,
  Check,
  CheckCircle2,
  RefreshCw,
  Copy,
  Trophy,
  ListOrdered
} from 'lucide-react';

const QUESTION_TYPES = [
  {
    type: 'multiple_choice',
    label: 'Multiple Choice',
    desc: 'Instant percentage breakdown bar chart',
    icon: BarChart2,
    color: 'text-indigo-600 bg-indigo-50 border-indigo-200'
  },
  {
    type: 'word_cloud',
    label: 'Word Cloud',
    desc: 'Dynamic animated cloud scaling with word frequency',
    icon: Cloud,
    color: 'text-violet-600 bg-violet-50 border-violet-200'
  },
  {
    type: 'rating',
    label: 'Star Rating',
    desc: '1-5 or 1-10 star rating with score card',
    icon: Star,
    color: 'text-amber-600 bg-amber-50 border-amber-200'
  },
  {
    type: 'ranking',
    label: 'Rank Order',
    desc: 'Respondents rank options; collective ranking results',
    icon: ListOrdered,
    color: 'text-emerald-600 bg-emerald-50 border-emerald-200'
  }
];

function generateRandomPin() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export default function PollBuilder() {
  const { id } = useParams();
  const isEditing = Boolean(id);
  const navigate = useNavigate();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [code, setCode] = useState('');
  const [isQuizMode, setIsQuizMode] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(true);
  const [qaEnabled, setQaEnabled] = useState(true);
  const [qaModeration, setQaModeration] = useState(false);

  const [questions, setQuestions] = useState([
    {
      id: 'q_' + Math.random().toString(36).substring(2, 9),
      question_text: '',
      question_type: 'multiple_choice',
      options: ['Option 1', 'Option 2'],
      maxRating: 5,
      allowMultiple: true,
      correctAnswer: null
    }
  ]);

  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isEditing) {
      const fetchPoll = async () => {
        try {
          setLoading(true);
          const data = await pollApi.get(id);
          const p = data.poll;
          setTitle(p.title || '');
          setDescription(p.description || '');
          setCode(p.code || '');
          setIsQuizMode(Boolean(p.is_quiz_mode));
          if (typeof p.show_leaderboard !== 'undefined') {
            setShowLeaderboard(Boolean(p.show_leaderboard));
          }
          setQaEnabled(Boolean(p.qa_enabled));
          setQaModeration(Boolean(p.qa_moderation));

          if (data.questions && data.questions.length > 0) {
            setQuestions(
              data.questions.map((q) => {
                let opts = ['Option 1', 'Option 2'];
                let maxR = 5;
                let allowMulti = true;
                if (q.options) {
                  if (Array.isArray(q.options)) {
                    opts = q.options;
                  } else if (typeof q.options === 'object') {
                    if (q.options.max) maxR = q.options.max;
                    if (q.options.allowMultiple !== undefined) allowMulti = Boolean(q.options.allowMultiple);
                  }
                }
                const cAns = q.correct_answer || (q.options && typeof q.options === 'object' ? q.options.correctAnswer : null) || null;
                return {
                  id: q.id,
                  question_text: q.question_text || '',
                  question_type: q.question_type || 'multiple_choice',
                  options: opts,
                  maxRating: maxR,
                  allowMultiple: allowMulti,
                  correctAnswer: cAns
                };
              })
            );
          }
        } catch (err) {
          setError(err.response?.data?.error || 'Failed to load poll details');
        } finally {
          setLoading(false);
        }
      };
      fetchPoll();
    } else {
      setCode(generateRandomPin());
    }
  }, [id, isEditing]);

  const addQuestion = (type = 'multiple_choice') => {
    setQuestions([
      ...questions,
      {
        id: 'q_' + Math.random().toString(36).substring(2, 9),
        question_text: '',
        question_type: type,
        options: ['Option 1', 'Option 2'],
        maxRating: 5,
        allowMultiple: true,
        correctAnswer: null
      }
    ]);
  };

  const updateQuestion = (index, field, value) => {
    const updated = [...questions];
    updated[index] = { ...updated[index], [field]: value };
    setQuestions(updated);
  };

  const deleteQuestion = (index) => {
    if (questions.length === 1) {
      setError('A live poll must have at least one question.');
      return;
    }
    const updated = questions.filter((_, idx) => idx !== index);
    setQuestions(updated);
  };

  const moveQuestion = (index, direction) => {
    const newIdx = direction === 'up' ? index - 1 : index + 1;
    if (newIdx < 0 || newIdx >= questions.length) return;
    const updated = [...questions];
    const temp = updated[index];
    updated[index] = updated[newIdx];
    updated[newIdx] = temp;
    setQuestions(updated);
  };

  const addOption = (qIdx) => {
    const q = questions[qIdx];
    const currentOpts = q.options || [];
    updateQuestion(qIdx, 'options', [...currentOpts, `Option ${currentOpts.length + 1}`]);
  };

  const updateOption = (qIdx, optIdx, text) => {
    const q = questions[qIdx];
    const oldVal = (q.options || [])[optIdx];
    const currentOpts = [...(q.options || [])];
    currentOpts[optIdx] = text;
    const updated = [...questions];
    updated[qIdx] = {
      ...updated[qIdx],
      options: currentOpts,
      correctAnswer: q.correctAnswer === oldVal ? text : q.correctAnswer
    };
    setQuestions(updated);
  };

  const removeOption = (qIdx, optIdx) => {
    const q = questions[qIdx];
    const currentOpts = q.options || [];
    if (currentOpts.length <= 2) {
      setError('Multiple choice questions require at least two options.');
      return;
    }
    const removedVal = currentOpts[optIdx];
    const updatedOpts = currentOpts.filter((_, idx) => idx !== optIdx);
    const updated = [...questions];
    updated[qIdx] = {
      ...updated[qIdx],
      options: updatedOpts,
      correctAnswer: q.correctAnswer === removedVal ? null : q.correctAnswer
    };
    setQuestions(updated);
  };

  const validate = () => {
    if (!title.trim()) {
      setError('Please provide a title for your poll.');
      return false;
    }
    if (code.trim()) {
      const cleanCode = code.trim().toUpperCase();
      if (!/^[A-Z0-9_-]{3,20}$/.test(cleanCode)) {
        setError('Poll code must be 3-20 characters alphanumeric (letters, numbers, hyphens).');
        return false;
      }
    }
    if (questions.length === 0) {
      setError('Please add at least one question.');
      return false;
    }
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.question_text.trim()) {
        setError(`Question #${i + 1} is missing a title/prompt.`);
        return false;
      }
      if (q.question_type === 'multiple_choice' || q.question_type === 'ranking') {
        const opts = (q.options || []).map((o) => o.trim()).filter(Boolean);
        if (opts.length < 2) {
          setError(`Question #${i + 1} needs at least 2 non-empty options.`);
          return false;
        }
      }
    }
    setError('');
    return true;
  };

  const handleSave = async (andStartHost = false) => {
    if (!validate()) return;
    setSaving(true);
    setError('');

    const payload = {
      title: title.trim(),
      description: description.trim(),
      code: code.trim().toUpperCase(),
      is_quiz_mode: isQuizMode,
      show_leaderboard: showLeaderboard ? 1 : 0,
      qa_enabled: qaEnabled,
      qa_moderation: qaModeration,
      questions: questions.map((q) => ({
        id: q.id,
        question_text: q.question_text.trim(),
        question_type: q.question_type,
        options: (q.question_type === 'multiple_choice' || q.question_type === 'ranking') ? q.options.map((o) => o.trim()).filter(Boolean) : null,
        correctAnswer: q.question_type === 'multiple_choice' ? q.correctAnswer || null : null,
        maxRating: q.question_type === 'rating' ? q.maxRating || 5 : null,
        allowMultiple: q.question_type === 'word_cloud' ? (q.allowMultiple !== false) : true
      }))
    };

    try {
      let savedPoll;
      if (isEditing) {
        const res = await pollApi.update(id, payload);
        savedPoll = res.poll;
      } else {
        const res = await pollApi.create(payload);
        savedPoll = res.poll;
      }

      if (andStartHost) {
        navigate(`/polls/${savedPoll.id}/host`);
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save poll. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-slate-500 text-sm">Loading poll configuration...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
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
              {isEditing ? 'Edit Live Poll' : 'Create Live Poll'}
            </h1>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
              Live Mode
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            type="button"
            onClick={() => handleSave(false)}
            disabled={saving}
            className="px-4 py-2 border border-slate-300 rounded-xl text-sm font-semibold text-slate-700 bg-white hover:bg-slate-50 shadow-sm transition-all flex items-center space-x-2 disabled:opacity-50"
          >
            <Save className="w-4 h-4 text-slate-500" />
            <span>{saving ? 'Saving...' : 'Save Draft'}</span>
          </button>
          <button
            type="button"
            onClick={() => handleSave(true)}
            disabled={saving}
            className="px-5 py-2 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-600/20 transition-all flex items-center space-x-2 disabled:opacity-50"
          >
            <Play className="w-4 h-4 fill-white" />
            <span>{saving ? 'Saving...' : 'Launch Host Studio'}</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-start space-x-3 text-rose-700 text-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div className="flex-1 font-medium">{error}</div>
        </div>
      )}

      {/* Main Form Settings */}
      <div className="space-y-6">
        {/* Basic Poll Details Card */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <h2 className="text-base font-bold text-slate-900 mb-4">Poll Details & Code</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Poll Title <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Q4 Townhall & Product Roadmap Discussion"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none text-base font-medium transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Subtitle / Host Notes (Optional)
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  placeholder="Additional context or welcome message for your audience..."
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none text-sm transition-all"
                />
              </div>
            </div>

            {/* Event Code / PIN Column */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center space-x-1">
                    <Hash className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Participant PIN</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setCode(generateRandomPin())}
                    className="text-[11px] text-indigo-600 hover:text-indigo-800 font-semibold flex items-center space-x-1"
                    title="Generate new 6-digit PIN"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Random</span>
                  </button>
                </div>
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="e.g. 842109"
                  maxLength={20}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 font-mono text-center text-lg font-bold tracking-widest uppercase focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none"
                />
                <p className="text-[11px] text-slate-500 mt-2">
                  Participants will join at <span className="font-semibold text-slate-700">ask.urspace.com/p</span> using this code, or scan your QR code.
                </p>
              </div>

              <div className="pt-3 mt-3 border-t border-slate-200/80 text-[11px] text-slate-500 flex items-center space-x-1">
                <Sparkles className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                <span>Custom slugs allowed (e.g. ALLHANDS)</span>
              </div>
            </div>
          </div>

          {/* Quiz Mode & Q&A Settings */}
          <div className="mt-6 pt-6 border-t border-slate-100 space-y-4">
            {/* Quiz Mode Banner Toggle */}
            <div className={`p-4 rounded-2xl border-2 transition-all ${
              isQuizMode
                ? 'border-indigo-600 bg-indigo-50/60 shadow-xs space-y-3'
                : 'border-slate-200 hover:bg-slate-50'
            }`}>
              <label className="flex items-start space-x-3.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isQuizMode}
                  onChange={(e) => setIsQuizMode(e.target.checked)}
                  className="mt-1 w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                />
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <Trophy className={`w-4 h-4 ${isQuizMode ? 'text-indigo-600' : 'text-slate-400'}`} />
                    <span className="text-sm font-bold text-slate-900">
                      Enable Quiz Mode (Player Names, Avatars & Leaderboard)
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 uppercase tracking-wider">
                      Interactive Quiz
                    </span>
                  </div>
                  <span className="text-xs text-slate-500 mt-1 block leading-relaxed">
                    Participants must choose a nickname and avatar before viewing questions. Answers with a designated correct answer score points toward a live leaderboard that the host can display.
                  </span>
                </div>
              </label>

              {/* Presenter Live Leaderboard Toggle (when Quiz Mode is active) */}
              {isQuizMode && (
                <div className="pt-3 border-t border-indigo-200/60 pl-7">
                  <label className="flex items-start space-x-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showLeaderboard}
                      onChange={(e) => setShowLeaderboard(e.target.checked)}
                      className="mt-0.5 w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                    />
                    <div>
                      <span className="text-xs font-bold text-indigo-950 block">
                        Display Live Leaderboard on Presenter Screen (Top 3 in side column)
                      </span>
                      <span className="text-[11px] text-indigo-800/80 block mt-0.5">
                        Shows the top 3 scoring participants on the presenter display, sitting alongside the active question (stacked above audience Q&amp;A if both are enabled).
                      </span>
                    </div>
                  </label>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="flex items-start space-x-3 p-3 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors">
                <input
                  type="checkbox"
                  checked={qaEnabled}
                  onChange={(e) => setQaEnabled(e.target.checked)}
                  className="mt-1 w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                />
              <div>
                <span className="text-sm font-semibold text-slate-900 block">
                  Enable Audience Q&A
                </span>
                <span className="text-xs text-slate-500">
                  Allow participants to ask questions and upvote each other's questions in real-time.
                </span>
              </div>
            </label>

            <label className={`flex items-start space-x-3 p-3 rounded-xl border ${qaEnabled ? 'border-slate-200 hover:bg-slate-50 cursor-pointer' : 'border-slate-100 opacity-50 cursor-not-allowed'} transition-colors`}>
              <input
                type="checkbox"
                checked={qaModeration}
                disabled={!qaEnabled}
                onChange={(e) => setQaModeration(e.target.checked)}
                className="mt-1 w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
              />
              <div>
                <span className="text-sm font-semibold text-slate-900 block">
                  Moderate Q&A Before Showing
                </span>
                <span className="text-xs text-slate-500">
                  When enabled, questions require host approval before appearing on screen or in the audience feed.
                </span>
              </div>
            </label>
          </div>
        </div>
      </div>

        {/* Questions Header */}
        <div className="flex items-center justify-between pt-2">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Poll Questions ({questions.length})</h2>
            <p className="text-xs text-slate-500">
              Host controls which question is live. Participants will see updates in real time.
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-xs font-semibold text-slate-500 mr-1 hidden sm:inline">Add Question:</span>
            {QUESTION_TYPES.map((qt) => {
              const Icon = qt.icon;
              return (
                <button
                  key={qt.type}
                  type="button"
                  onClick={() => addQuestion(qt.type)}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-sm transition-all flex items-center space-x-1.5"
                  title={`Add ${qt.label}`}
                >
                  <Icon className="w-3.5 h-3.5 text-indigo-600" />
                  <span className="hidden md:inline">{qt.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Question Cards List */}
        <div className="space-y-4">
          {questions.map((q, qIdx) => {
            const currentTypeObj = QUESTION_TYPES.find((t) => t.type === q.question_type) || QUESTION_TYPES[0];
            const TypeIcon = currentTypeObj.icon;

            return (
              <div
                key={q.id || qIdx}
                className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:border-slate-300 transition-all"
              >
                {/* Card Top Row: Number, Type selector, Move & Delete buttons */}
                <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
                  <div className="flex items-center space-x-3">
                    <span className="w-7 h-7 rounded-lg bg-slate-900 text-white font-bold text-xs flex items-center justify-center">
                      {qIdx + 1}
                    </span>

                    {/* Question Type Switcher */}
                    <select
                      value={q.question_type}
                      onChange={(e) => updateQuestion(qIdx, 'question_type', e.target.value)}
                      className="text-xs font-semibold px-2.5 py-1 rounded-lg border border-slate-200 bg-slate-50 text-slate-800 focus:bg-white focus:border-indigo-500 outline-none cursor-pointer"
                    >
                      {QUESTION_TYPES.map((t) => (
                        <option key={t.type} value={t.type}>
                          {t.label}
                        </option>
                      ))}
                    </select>

                    <span className="text-[11px] text-slate-400 hidden sm:inline">
                      {currentTypeObj.desc}
                    </span>
                  </div>

                  <div className="flex items-center space-x-1">
                    <button
                      type="button"
                      disabled={qIdx === 0}
                      onClick={() => moveQuestion(qIdx, 'up')}
                      className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 disabled:opacity-25"
                      title="Move Up"
                    >
                      <ChevronUp className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      disabled={qIdx === questions.length - 1}
                      onClick={() => moveQuestion(qIdx, 'down')}
                      className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 disabled:opacity-25"
                      title="Move Down"
                    >
                      <ChevronDown className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteQuestion(qIdx)}
                      className="p-1 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors ml-2"
                      title="Delete Question"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Question Prompt */}
                <div className="mb-4">
                  <input
                    type="text"
                    value={q.question_text}
                    onChange={(e) => updateQuestion(qIdx, 'question_text', e.target.value)}
                    placeholder="Enter your question or prompt (e.g. 'What is your top priority for next quarter?')"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium placeholder:text-slate-400 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none text-sm transition-all"
                  />
                </div>

                {/* Question Type Specific Controls */}
                {q.question_type === 'multiple_choice' && (
                  <div className="pl-2 space-y-2.5 bg-slate-50/50 p-3 rounded-xl border border-slate-100">
                    <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2">
                      Answer Choices
                    </div>
                    {(q.options || []).map((opt, optIdx) => (
                      <div key={optIdx} className="flex items-center space-x-2">
                        <div className="w-5 h-5 rounded-full border border-slate-300 bg-white flex items-center justify-center text-[10px] font-bold text-slate-400 flex-shrink-0">
                          {String.fromCharCode(65 + optIdx)}
                        </div>
                        <input
                          type="text"
                          value={opt}
                          onChange={(e) => updateOption(qIdx, optIdx, e.target.value)}
                          placeholder={`Option ${optIdx + 1}`}
                          className="flex-1 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => updateQuestion(qIdx, 'correctAnswer', q.correctAnswer === opt ? null : opt)}
                          className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1 shrink-0 transition ${
                            q.correctAnswer === opt && opt.trim() !== ''
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-xs'
                              : 'border border-slate-200 text-slate-400 hover:text-emerald-700 hover:border-emerald-300 hover:bg-emerald-50'
                          }`}
                          title={q.correctAnswer === opt ? 'Click to unmark correct answer' : 'Mark as correct answer (optional)'}
                        >
                          {q.correctAnswer === opt && opt.trim() !== '' ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Check className="w-3.5 h-3.5" />
                          )}
                          <span>{q.correctAnswer === opt && opt.trim() !== '' ? 'Correct' : 'Mark Correct'}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => removeOption(qIdx, optIdx)}
                          className="p-1 text-slate-400 hover:text-rose-500 rounded hover:bg-white transition-colors"
                          title="Remove option"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}

                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 pt-1">
                      <button
                        type="button"
                        onClick={() => addOption(qIdx)}
                        className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center space-x-1 px-2 py-1 rounded-lg hover:bg-indigo-50/60 transition-colors w-fit"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add Option</span>
                      </button>
                      <span className="text-[11px] text-slate-400 italic">
                        Optional: Click 'Mark Correct' to set a correct answer for quiz-style voting.
                      </span>
                    </div>
                  </div>
                )}

                {q.question_type === 'word_cloud' && (
                  <div className="p-4 bg-violet-50/50 border border-violet-100 rounded-2xl space-y-3">
                    <div className="flex items-center space-x-3 text-xs text-violet-900">
                      <Cloud className="w-5 h-5 text-violet-600 flex-shrink-0" />
                      <div>
                        <span className="font-bold text-sm block">Word Cloud Configuration</span>
                        <span className="text-violet-700/80">
                          Participants enter words or short phrases. Repeated words scale dynamically in the live cloud.
                        </span>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-violet-100 flex items-center justify-between">
                      <div className="pr-4">
                        <span className="text-xs font-bold text-slate-800 block">
                          Allow entry of multiple words
                        </span>
                        <span className="text-[11px] text-slate-500">
                          When enabled, participants can submit multiple words/phrases to the cloud (default on)
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => updateQuestion(qIdx, 'allowMultiple', q.allowMultiple === false ? true : false)}
                        className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                          q.allowMultiple !== false ? 'bg-indigo-600' : 'bg-slate-300'
                        }`}
                        role="switch"
                        aria-checked={q.allowMultiple !== false}
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                            q.allowMultiple !== false ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                )}

                {q.question_type === 'rating' && (
                  <div className="p-3 bg-amber-50/50 border border-amber-100 rounded-xl flex items-center justify-between text-xs text-amber-900">
                    <div className="flex items-center space-x-2">
                      <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                      <span className="font-semibold">Star Rating Scale:</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        type="button"
                        onClick={() => updateQuestion(qIdx, 'maxRating', 5)}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                          (q.maxRating || 5) === 5
                            ? 'bg-amber-500 text-white shadow-sm'
                            : 'bg-white text-slate-700 border border-slate-200'
                        }`}
                      >
                        1 to 5 Stars
                      </button>
                      <button
                        type="button"
                        onClick={() => updateQuestion(qIdx, 'maxRating', 10)}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                          q.maxRating === 10
                            ? 'bg-amber-500 text-white shadow-sm'
                            : 'bg-white text-slate-700 border border-slate-200'
                        }`}
                      >
                        1 to 10 Stars
                      </button>
                    </div>
                  </div>
                )}

                {q.question_type === 'ranking' && (
                  <div className="pl-2 space-y-2.5 bg-emerald-50/40 p-3.5 rounded-xl border border-emerald-100">
                    <div className="flex items-center justify-between mb-1">
                      <div className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider flex items-center space-x-1.5">
                        <ListOrdered className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Options to Rank</span>
                      </div>
                      <span className="text-[11px] text-emerald-700/80">
                        Respondents rank these options in order. Collective results are calculated live.
                      </span>
                    </div>

                    {(q.options || []).map((opt, optIdx) => (
                      <div key={optIdx} className="flex items-center space-x-2">
                        <div className="w-6 h-6 rounded-lg border border-emerald-200 bg-white flex items-center justify-center text-[11px] font-bold text-emerald-700 flex-shrink-0">
                          #{optIdx + 1}
                        </div>
                        <input
                          type="text"
                          value={opt}
                          onChange={(e) => updateOption(qIdx, optIdx, e.target.value)}
                          placeholder={`Item ${optIdx + 1}`}
                          className="flex-1 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => removeOption(qIdx, optIdx)}
                          className="p-1 text-slate-400 hover:text-rose-500 rounded hover:bg-white transition-colors"
                          title="Remove option"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}

                    <div className="pt-1">
                      <button
                        type="button"
                        onClick={() => addOption(qIdx)}
                        className="text-xs font-semibold text-emerald-700 hover:text-emerald-900 flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-emerald-100/60 hover:bg-emerald-100 transition-colors w-fit"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add Ranking Option</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Add Question Button Footer */}
        <div className="flex justify-center pt-4">
          <button
            type="button"
            onClick={() => addQuestion('multiple_choice')}
            className="px-6 py-3 border-2 border-dashed border-slate-300 hover:border-indigo-400 rounded-2xl text-sm font-semibold text-slate-600 hover:text-indigo-600 hover:bg-indigo-50/30 transition-all flex items-center space-x-2 w-full justify-center"
          >
            <Plus className="w-4 h-4" />
            <span>Add Another Question</span>
          </button>
        </div>

        {/* Bottom Save Action Bar */}
        <div className="pt-6 border-t border-slate-200 flex items-center justify-between">
          <Link
            to="/dashboard"
            className="text-xs font-semibold text-slate-500 hover:text-slate-800"
          >
            Cancel and Return
          </Link>
          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={() => handleSave(false)}
              disabled={saving}
              className="px-4 py-2.5 border border-slate-300 rounded-xl text-sm font-semibold text-slate-700 bg-white hover:bg-slate-50 shadow-sm transition-all flex items-center space-x-2 disabled:opacity-50"
            >
              <Save className="w-4 h-4 text-slate-500" />
              <span>{saving ? 'Saving...' : 'Save Draft'}</span>
            </button>
            <button
              type="button"
              onClick={() => handleSave(true)}
              disabled={saving}
              className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-600/20 transition-all flex items-center space-x-2 disabled:opacity-50"
            >
              <Play className="w-4 h-4 fill-white" />
              <span>{saving ? 'Saving...' : 'Launch Host Studio'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
