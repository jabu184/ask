import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { surveyApi } from '../services/api';
import {
  ArrowLeft,
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  Save,
  CheckSquare,
  ToggleLeft,
  Star,
  X,
  AlertCircle,
  AlignLeft,
  Sliders,
  ListOrdered,
  MessageSquare,
  Type,
  Square
} from 'lucide-react';

export default function SurveyBuilder() {
  const { id } = useParams();
  const isEditing = Boolean(id);
  const navigate = useNavigate();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(false);
  const [questions, setQuestions] = useState([
    {
      id: 'q_' + Math.random().toString(36).substr(2, 9),
      question_text: '',
      question_type: 'multiple_choice',
      options: ['Option 1', 'Option 2'],
      is_required: true,
    }
  ]);
  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isEditing) {
      const fetchSurvey = async () => {
        try {
          setLoading(true);
          const data = await surveyApi.get(id);
          setTitle(data.survey.title);
          setDescription(data.survey.description || '');
          setIsActive(data.survey.is_active === 1);
          setEmailNotifications(Boolean(data.survey.email_notifications));

          if (data.questions && data.questions.length > 0) {
            setQuestions(
              data.questions.map((q) => ({
                id: q.id,
                question_text: q.question_text,
                question_type: q.question_type,
                options: q.options || [],
                is_required: Boolean(q.is_required),
              }))
            );
          }
        } catch (err) {
          setError(err.response?.data?.error || 'Failed to load survey');
        } finally {
          setLoading(false);
        }
      };

      fetchSurvey();
    }
  }, [id, isEditing]);

  const handleAddQuestion = (type = 'multiple_choice') => {
    let initialOptions = [];
    if (type === 'multiple_choice' || type === 'checkboxes') {
      initialOptions = ['Option 1', 'Option 2'];
    } else if (type === 'ranking') {
      initialOptions = ['Option 1', 'Option 2', 'Option 3'];
    }

    const newQ = {
      id: 'q_' + Math.random().toString(36).substr(2, 9),
      question_text: '',
      question_type: type,
      options: initialOptions,
      is_required: false,
    };
    setQuestions([...questions, newQ]);
  };

  const handleRemoveQuestion = (index) => {
    if (questions.length === 1) {
      alert('A survey must have at least one question.');
      return;
    }
    setQuestions(questions.filter((_, i) => i !== index));
  };

  const handleMoveQuestion = (index, direction) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= questions.length) return;

    const updated = [...questions];
    const temp = updated[index];
    updated[index] = updated[targetIndex];
    updated[targetIndex] = temp;
    setQuestions(updated);
  };

  const handleUpdateQuestion = (index, field, value) => {
    const updated = [...questions];
    updated[index] = { ...updated[index], [field]: value };
    setQuestions(updated);
  };

  const handleAddOption = (qIndex, optionText) => {
    if (!optionText || !optionText.trim()) return;
    const updated = [...questions];
    const currentOptions = updated[qIndex].options || [];
    updated[qIndex].options = [...currentOptions, optionText.trim()];
    setQuestions(updated);
  };

  const handleRemoveOption = (qIndex, optIndex) => {
    const updated = [...questions];
    const currentOptions = updated[qIndex].options || [];
    if (currentOptions.length <= 2) {
      alert('This question type requires at least two options.');
      return;
    }
    updated[qIndex].options = currentOptions.filter((_, i) => i !== optIndex);
    setQuestions(updated);
  };

  const handleOptionChange = (qIndex, optIndex, value) => {
    const updated = [...questions];
    const currentOptions = [...updated[qIndex].options];
    currentOptions[optIndex] = value;
    updated[qIndex].options = currentOptions;
    setQuestions(updated);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!title.trim()) {
      setError('Please provide a survey title.');
      return;
    }

    if (questions.length === 0) {
      setError('Please add at least one question.');
      return;
    }

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.question_text.trim()) {
        setError(`Question #${i + 1} prompt cannot be empty.`);
        return;
      }
      if (['multiple_choice', 'checkboxes', 'ranking'].includes(q.question_type)) {
        if (!q.options || q.options.length < 2) {
          setError(`Question #${i + 1} must have at least 2 options.`);
          return;
        }
        for (let j = 0; j < q.options.length; j++) {
          if (!q.options[j].trim()) {
            setError(`Question #${i + 1}, option #${j + 1} cannot be empty.`);
            return;
          }
        }
      }
    }

    const payload = {
      title: title.trim(),
      description: description.trim(),
      is_active: isActive,
      email_notifications: emailNotifications ? 1 : 0,
      questions: questions.map((q, idx) => ({
        order_num: idx + 1,
        question_text: q.question_text.trim(),
        question_type: q.question_type,
        options: q.options || [],
        is_required: q.is_required ? 1 : 0,
      })),
    };

    try {
      setSaving(true);
      if (isEditing) {
        await surveyApi.update(id, payload);
      } else {
        await surveyApi.create(payload);
      }
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save survey');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-3">
        <div className="w-8 h-8 border-3 border-brand-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-slate-500">Loading survey editor...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Top Header */}
      <div className="flex items-center justify-between gap-4 mb-8">
        <div className="flex items-center space-x-3">
          <Link
            to="/dashboard"
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-white rounded-lg border border-transparent hover:border-slate-200 transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              {isEditing ? 'Edit Survey' : 'Create New Survey'}
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">Design questions and configure response options</p>
          </div>
        </div>

        <button
          onClick={handleSubmit}
          disabled={saving}
          className="inline-flex items-center space-x-2 px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold shadow-sm transition disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          <span>{saving ? 'Saving...' : 'Save Survey'}</span>
        </button>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 flex items-start space-x-3 text-red-700">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <span className="text-sm font-medium">{error}</span>
        </div>
      )}

      {/* Survey Metadata Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm mb-8 space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
            Survey Title <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Customer Satisfaction Survey 2026"
            className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-600 text-base font-semibold text-slate-900 placeholder:text-slate-400 placeholder:font-normal"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
            Description (Optional)
          </label>
          <textarea
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Provide a brief context or instructions for your respondents..."
            className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-600 text-sm placeholder:text-slate-400"
          />
        </div>

        <div className="pt-2 flex items-center justify-between border-t border-slate-100">
          <span className="text-sm font-medium text-slate-700">Survey Active Status</span>
          <label className="inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="sr-only peer"
            />
            <div className="relative w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-600"></div>
            <span className="ms-3 text-xs font-semibold text-slate-600">
              {isActive ? 'Accepting Responses' : 'Closed'}
            </span>
          </label>
        </div>

        <div className="pt-3 flex items-center justify-between border-t border-slate-100">
          <div>
            <span className="text-sm font-medium text-slate-700 block">Email Notifications</span>
            <span className="text-xs text-slate-500">Send an email notification when a new response is submitted</span>
          </div>
          <label className="inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={emailNotifications}
              onChange={(e) => setEmailNotifications(e.target.checked)}
              className="sr-only peer"
            />
            <div className="relative w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-600"></div>
            <span className="ms-3 text-xs font-semibold text-slate-600">
              {emailNotifications ? 'Enabled' : 'Disabled'}
            </span>
          </label>
        </div>
      </div>

      {/* Questions Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-bold text-slate-900">Questions ({questions.length})</h2>
          <span className="text-xs text-slate-500">Reorder with arrows or configure types below</span>
        </div>

        {questions.map((q, index) => (
          <div
            key={q.id || index}
            className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4 relative group hover:border-slate-300 transition"
          >
            {/* Question Card Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center text-xs font-bold">
                  {index + 1}
                </span>
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  {q.question_type === 'multiple_choice' && 'Multiple Choice (Single Select)'}
                  {q.question_type === 'checkboxes' && 'Checkboxes (Multi-Select)'}
                  {q.question_type === 'single_text' && 'Single Text Box'}
                  {q.question_type === 'comment_box' && 'Comment Box'}
                  {q.question_type === 'star_rating' && 'Star Rating (1–5 Stars)'}
                  {q.question_type === 'slider' && 'Slider (1–100)'}
                  {q.question_type === 'ranking' && 'Ranking / Ordering'}
                  {q.question_type === 'true_false' && 'True / False (Legacy)'}
                  {q.question_type === 'rating_1_10' && '1–10 Rating Scale (Legacy)'}
                  {q.question_type === 'text' && 'Open Text (Legacy)'}
                </span>
              </div>

              {/* Controls: Move Up, Move Down, Delete */}
              <div className="flex items-center space-x-1 self-end sm:self-auto">
                <button
                  type="button"
                  onClick={() => handleMoveQuestion(index, -1)}
                  disabled={index === 0}
                  className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30 rounded hover:bg-slate-100 transition"
                  title="Move Question Up"
                >
                  <ChevronUp className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => handleMoveQuestion(index, 1)}
                  disabled={index === questions.length - 1}
                  className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30 rounded hover:bg-slate-100 transition"
                  title="Move Question Down"
                >
                  <ChevronDown className="w-4 h-4" />
                </button>
                <div className="h-4 w-px bg-slate-200 mx-1" />
                <button
                  type="button"
                  onClick={() => handleRemoveQuestion(index)}
                  className="p-1 text-slate-400 hover:text-red-600 rounded hover:bg-red-50 transition"
                  title="Delete Question"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Question Text & Type Selector */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Question Prompt
                </label>
                <input
                  type="text"
                  value={q.question_text}
                  onChange={(e) => handleUpdateQuestion(index, 'question_text', e.target.value)}
                  placeholder="e.g. What is your overall feedback?"
                  className="w-full px-3.5 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-600 text-sm font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Question Type
                </label>
                <select
                  value={q.question_type}
                  onChange={(e) => {
                    const newType = e.target.value;
                    const updated = [...questions];
                    let currentOpts = Array.isArray(updated[index].options) ? updated[index].options.filter(Boolean) : [];
                    if (['multiple_choice', 'checkboxes'].includes(newType) && currentOpts.length < 2) {
                      currentOpts = ['Option 1', 'Option 2'];
                    } else if (newType === 'ranking' && currentOpts.length < 2) {
                      currentOpts = ['Option 1', 'Option 2', 'Option 3'];
                    }
                    updated[index].question_type = newType;
                    updated[index].options = currentOpts;
                    setQuestions(updated);
                  }}
                  className="w-full px-3.5 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-600 text-sm bg-white"
                >
                  <option value="multiple_choice">Multiple Choice (Single Select)</option>
                  <option value="checkboxes">Checkboxes (Multi-Select)</option>
                  <option value="single_text">Single Text Box</option>
                  <option value="comment_box">Comment Box (Multi-line)</option>
                  <option value="star_rating">Star Rating (1–5 Stars)</option>
                  <option value="slider">Slider (1–100)</option>
                  <option value="ranking">Ranking / Ordering</option>
                  {q.question_type === 'true_false' && <option value="true_false">True / False (Legacy)</option>}
                  {q.question_type === 'rating_1_10' && <option value="rating_1_10">1–10 Rating Scale (Legacy)</option>}
                  {q.question_type === 'text' && <option value="text">Open Text (Legacy)</option>}
                </select>
              </div>
            </div>

            {/* Multiple Choice Options */}
            {q.question_type === 'multiple_choice' && (
              <div className="pt-2">
                <label className="block text-xs font-semibold text-slate-700 mb-2">
                  Options (Single Choice)
                </label>
                <div className="space-y-2">
                  {(q.options || []).map((opt, optIdx) => (
                    <div key={optIdx} className="flex items-center space-x-2">
                      <div className="w-4 h-4 rounded-full border-2 border-slate-300 flex-shrink-0" />
                      <input
                        type="text"
                        value={opt}
                        onChange={(e) => handleOptionChange(index, optIdx, e.target.value)}
                        placeholder={`Option ${optIdx + 1}`}
                        className="flex-1 px-3 py-1.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-600 text-sm"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveOption(index, optIdx)}
                        className="p-1.5 text-slate-400 hover:text-red-600 rounded hover:bg-slate-100 transition"
                        title="Remove option"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={() => handleAddOption(index, `Option ${(q.options || []).length + 1}`)}
                    className="inline-flex items-center space-x-1.5 text-xs font-semibold text-brand-600 hover:text-brand-700 mt-2 px-2 py-1 rounded hover:bg-brand-50 transition"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Another Option</span>
                  </button>
                </div>
              </div>
            )}

            {/* Checkboxes Options */}
            {q.question_type === 'checkboxes' && (
              <div className="pt-2">
                <label className="block text-xs font-semibold text-slate-700 mb-2">
                  Options (Multiple Select Checkboxes)
                </label>
                <div className="space-y-2">
                  {(q.options || []).map((opt, optIdx) => (
                    <div key={optIdx} className="flex items-center space-x-2">
                      <div className="w-4 h-4 rounded border-2 border-slate-300 flex-shrink-0" />
                      <input
                        type="text"
                        value={opt}
                        onChange={(e) => handleOptionChange(index, optIdx, e.target.value)}
                        placeholder={`Option ${optIdx + 1}`}
                        className="flex-1 px-3 py-1.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-600 text-sm"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveOption(index, optIdx)}
                        className="p-1.5 text-slate-400 hover:text-red-600 rounded hover:bg-slate-100 transition"
                        title="Remove option"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={() => handleAddOption(index, `Option ${(q.options || []).length + 1}`)}
                    className="inline-flex items-center space-x-1.5 text-xs font-semibold text-brand-600 hover:text-brand-700 mt-2 px-2 py-1 rounded hover:bg-brand-50 transition"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Another Option</span>
                  </button>
                </div>
              </div>
            )}

            {/* Ranking / Ordering Options */}
            {q.question_type === 'ranking' && (
              <div className="pt-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Items to Rank (Respondents will arrange these in order)
                </label>
                <p className="text-xs text-slate-400 mb-2">Provide the items you want respondents to rank from highest to lowest.</p>
                <div className="space-y-2">
                  {(q.options || []).map((opt, optIdx) => (
                    <div key={optIdx} className="flex items-center space-x-2">
                      <span className="w-5 text-center text-xs font-bold text-slate-400">{optIdx + 1}.</span>
                      <input
                        type="text"
                        value={opt}
                        onChange={(e) => handleOptionChange(index, optIdx, e.target.value)}
                        placeholder={`Item ${optIdx + 1}`}
                        className="flex-1 px-3 py-1.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-600 text-sm"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveOption(index, optIdx)}
                        className="p-1.5 text-slate-400 hover:text-red-600 rounded hover:bg-slate-100 transition"
                        title="Remove item"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={() => handleAddOption(index, `Option ${(q.options || []).length + 1}`)}
                    className="inline-flex items-center space-x-1.5 text-xs font-semibold text-brand-600 hover:text-brand-700 mt-2 px-2 py-1 rounded hover:bg-brand-50 transition"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Another Item</span>
                  </button>
                </div>
              </div>
            )}

            {/* Single Text Box Preview */}
            {q.question_type === 'single_text' && (
              <div className="pt-2">
                <p className="text-xs text-slate-500 mb-2 font-medium">Preview Single Line Text Box:</p>
                <input
                  type="text"
                  disabled
                  placeholder="Respondents type a short single-line response..."
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-400 text-sm cursor-not-allowed"
                />
              </div>
            )}

            {/* Comment Box Preview */}
            {q.question_type === 'comment_box' && (
              <div className="pt-2">
                <p className="text-xs text-slate-500 mb-2 font-medium">Preview Multi-line Comment Box:</p>
                <textarea
                  disabled
                  rows={3}
                  placeholder="Respondents type an open multi-line comment or feedback..."
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-400 text-sm cursor-not-allowed resize-none"
                />
              </div>
            )}

            {/* Star Rating Preview */}
            {q.question_type === 'star_rating' && (
              <div className="pt-2">
                <p className="text-xs text-slate-500 mb-2 font-medium">Preview Star Rating (1–5 Stars):</p>
                <div className="flex items-center space-x-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <div key={star} className="p-1 text-amber-400">
                      <Star className="w-7 h-7 fill-amber-400 stroke-amber-500" />
                    </div>
                  ))}
                  <span className="text-xs text-slate-400 ml-2">1 to 5 Stars</span>
                </div>
              </div>
            )}

            {/* Slider Preview */}
            {q.question_type === 'slider' && (
              <div className="pt-2">
                <p className="text-xs text-slate-500 mb-2 font-medium">Preview Slider (1–100):</p>
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 max-w-md">
                  <div className="flex justify-between items-center text-xs font-semibold text-slate-600 mb-2">
                    <span>1</span>
                    <span className="px-2 py-0.5 rounded bg-brand-600 text-white text-xs font-bold">50</span>
                    <span>100</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="100"
                    defaultValue="50"
                    disabled
                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-not-allowed accent-brand-600"
                  />
                </div>
              </div>
            )}

            {/* True / False Preview */}
            {q.question_type === 'true_false' && (
              <div className="pt-2">
                <p className="text-xs text-slate-500 mb-2 font-medium">Preview Binary Choices:</p>
                <div className="flex space-x-3">
                  <div className="px-4 py-2 rounded-lg bg-slate-100 border border-slate-200 text-slate-700 text-sm font-semibold">
                    True
                  </div>
                  <div className="px-4 py-2 rounded-lg bg-slate-100 border border-slate-200 text-slate-700 text-sm font-semibold">
                    False
                  </div>
                </div>
              </div>
            )}

            {/* Rating 1-10 Preview */}
            {q.question_type === 'rating_1_10' && (
              <div className="pt-2">
                <p className="text-xs text-slate-500 mb-2 font-medium">Preview 1–10 Scale:</p>
                <div className="flex flex-wrap gap-1.5">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                    <span
                      key={num}
                      className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-xs font-semibold text-slate-700"
                    >
                      {num}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Legacy Text Preview */}
            {q.question_type === 'text' && (
              <div className="pt-2">
                <p className="text-xs text-slate-500 mb-2 font-medium">Preview Open Response Field:</p>
                <textarea
                  disabled
                  rows={2}
                  placeholder="Respondents can type any open-ended text response here..."
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-400 text-sm cursor-not-allowed resize-none"
                />
              </div>
            )}

            {/* Question Footer: Required toggle */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-end">
              <label className="inline-flex items-center cursor-pointer space-x-2 text-xs font-medium text-slate-600">
                <input
                  type="checkbox"
                  checked={q.is_required}
                  onChange={(e) => handleUpdateQuestion(index, 'is_required', e.target.checked)}
                  className="rounded border-slate-300 text-brand-600 focus:ring-brand-500 w-4 h-4"
                />
                <span>Required field</span>
              </label>
            </div>
          </div>
        ))}

        {/* Add Question Button Group */}
        <div className="pt-2">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Add a Question</p>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => handleAddQuestion('multiple_choice')}
              className="inline-flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-white border border-slate-200 hover:border-brand-500 text-slate-700 hover:text-brand-600 text-xs font-semibold shadow-sm transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Multiple Choice</span>
            </button>
            <button
              type="button"
              onClick={() => handleAddQuestion('checkboxes')}
              className="inline-flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-white border border-slate-200 hover:border-brand-500 text-slate-700 hover:text-brand-600 text-xs font-semibold shadow-sm transition"
            >
              <Square className="w-3.5 h-3.5" />
              <span>Checkboxes</span>
            </button>
            <button
              type="button"
              onClick={() => handleAddQuestion('single_text')}
              className="inline-flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-white border border-slate-200 hover:border-brand-500 text-slate-700 hover:text-brand-600 text-xs font-semibold shadow-sm transition"
            >
              <Type className="w-3.5 h-3.5" />
              <span>Single Text Box</span>
            </button>
            <button
              type="button"
              onClick={() => handleAddQuestion('comment_box')}
              className="inline-flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-white border border-slate-200 hover:border-brand-500 text-slate-700 hover:text-brand-600 text-xs font-semibold shadow-sm transition"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Comment Box</span>
            </button>
            <button
              type="button"
              onClick={() => handleAddQuestion('star_rating')}
              className="inline-flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-white border border-slate-200 hover:border-brand-500 text-slate-700 hover:text-brand-600 text-xs font-semibold shadow-sm transition"
            >
              <Star className="w-3.5 h-3.5" />
              <span>Star Rating (1–5)</span>
            </button>
            <button
              type="button"
              onClick={() => handleAddQuestion('slider')}
              className="inline-flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-white border border-slate-200 hover:border-brand-500 text-slate-700 hover:text-brand-600 text-xs font-semibold shadow-sm transition"
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Slider (1–100)</span>
            </button>
            <button
              type="button"
              onClick={() => handleAddQuestion('ranking')}
              className="inline-flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-white border border-slate-200 hover:border-brand-500 text-slate-700 hover:text-brand-600 text-xs font-semibold shadow-sm transition"
            >
              <ListOrdered className="w-3.5 h-3.5" />
              <span>Ranking</span>
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Save Action */}
      <div className="mt-10 pt-6 border-t border-slate-200 flex items-center justify-between">
        <Link
          to="/dashboard"
          className="text-sm font-semibold text-slate-600 hover:text-slate-900"
        >
          Cancel
        </Link>
        <button
          onClick={handleSubmit}
          disabled={saving}
          className="inline-flex items-center space-x-2 px-6 py-2.5 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold shadow-sm transition disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          <span>{saving ? 'Saving...' : 'Save Survey'}</span>
        </button>
      </div>
    </div>
  );
}
