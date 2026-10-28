import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { publicApi } from '../services/api';
import SEO from '../components/SEO';
import {
  CheckCircle2,
  Lock,
  AlertCircle,
  ArrowRight,
  Check,
  Star,
  ChevronUp,
  ChevronDown,
  CheckSquare,
  Plus
} from 'lucide-react';

export default function PublicSurvey() {
  const { surveyId } = useParams();
  const [survey, setSurvey] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [hoveredStar, setHoveredStar] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isClosed, setIsClosed] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchSurvey = async () => {
      try {
        setLoading(true);
        const data = await publicApi.getSurvey(surveyId);
        setSurvey(data.survey);

        if (data.closed) {
          setIsClosed(true);
        } else {
          const qs = data.questions || [];
          setQuestions(qs);

          // Initialize defaults for sliders and ranking if needed
          const initial = {};
          qs.forEach((q) => {
            if (q.question_type === 'ranking' && Array.isArray(q.options) && q.options.length > 0) {
              initial[q.id] = [...q.options];
            } else if (q.question_type === 'slider') {
              initial[q.id] = '50';
            }
          });
          setAnswers(initial);
        }
      } catch (err) {
        setError(err.response?.data?.error || 'Failed to load survey. Please check the URL.');
      } finally {
        setLoading(false);
      }
    };

    fetchSurvey();
  }, [surveyId]);

  const handleSelectAnswer = (questionId, value) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: value,
    }));
  };

  const handleToggleCheckbox = (questionId, option) => {
    setAnswers((prev) => {
      const current = Array.isArray(prev[questionId])
        ? prev[questionId]
        : (prev[questionId] ? [prev[questionId]] : []);
      const updated = current.includes(option)
        ? current.filter((item) => item !== option)
        : [...current, option];
      return { ...prev, [questionId]: updated };
    });
  };

  const handleMoveRank = (questionId, fromIdx, toIdx) => {
    const currentList = Array.isArray(answers[questionId])
      ? [...answers[questionId]]
      : [...(questions.find((q) => q.id === questionId)?.options || [])];

    if (toIdx < 0 || toIdx >= currentList.length) return;

    const item = currentList.splice(fromIdx, 1)[0];
    currentList.splice(toIdx, 0, item);
    handleSelectAnswer(questionId, currentList);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Client-side validation for required fields
    for (const q of questions) {
      if (q.is_required) {
        const val = answers[q.id];
        if (val === undefined || val === null) {
          setError(`Please answer the required question: "${q.question_text}"`);
          return;
        }
        if (Array.isArray(val) && val.length === 0) {
          setError(`Please select at least one option for: "${q.question_text}"`);
          return;
        }
        if (typeof val === 'string' && val.trim() === '') {
          setError(`Please answer the required question: "${q.question_text}"`);
          return;
        }
      }
    }

    try {
      setSubmitting(true);
      await publicApi.submit(surveyId, answers);
      setIsSubmitted(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to submit survey. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <SEO title="Loading Questionnaire — Ask by urspace.com" />
        <div className="w-8 h-8 border-3 border-brand-500 border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-sm font-medium text-slate-500">Loading questionnaire...</p>
      </main>
    );
  }

  if (isSubmitted) {
    return (
      <main className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <SEO
          title={`Response Submitted: ${survey?.title || 'Survey'} — Ask by urspace.com`}
          description="Thank you for taking the time to share your feedback. Your response has been recorded anonymously."
        />
        <article className="max-w-md w-full bg-white rounded-3xl p-8 sm:p-10 border border-slate-100 shadow-xl shadow-slate-200/50 text-center animate-fadeIn">
          <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 mx-auto flex items-center justify-center mb-6 ring-8 ring-emerald-50/50">
            <CheckCircle2 className="w-10 h-10" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Response Submitted!</h2>
          <p className="text-sm text-slate-500 mt-2">
            Thank you for taking the time to share your feedback. Your response has been recorded completely anonymously.
          </p>
          <div className="mt-8 pt-6 border-t border-slate-100 flex flex-col items-center space-y-4">
            <Link
              to="/"
              className="inline-flex items-center space-x-2 px-5 py-2.5 text-xs font-semibold text-brand-700 bg-brand-50 hover:bg-brand-100 border border-brand-200 rounded-xl transition shadow-xs"
            >
              <Plus className="w-3.5 h-3.5 text-brand-600" />
              <span>Create your own free surveys</span>
            </Link>

            <img
              src="/askbuurspace.jpg"
              alt="Ask by urspace.com"
              width="180"
              height="72"
              className="h-14 sm:h-16 w-auto object-contain"
            />
          </div>
        </article>
      </main>
    );
  }

  if (isClosed) {
    return (
      <main className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <SEO
          title={`Survey Closed: ${survey?.title || 'Survey'} — Ask by urspace.com`}
          description="This survey is no longer accepting new submissions. Thank you for your interest."
        />
        <article className="max-w-md w-full bg-white rounded-3xl p-8 sm:p-10 border border-slate-100 shadow-xl shadow-slate-200/50 text-center">
          <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 mx-auto flex items-center justify-center mb-6 ring-8 ring-amber-50/50">
            <Lock className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Survey Closed</h2>
          <h3 className="text-base font-semibold text-slate-700 mt-2">{survey?.title}</h3>
          <p className="text-sm text-slate-500 mt-2">
            This survey is no longer accepting new submissions. Thank you for your interest.
          </p>
          <div className="mt-8 pt-6 border-t border-slate-100 flex flex-col items-center space-y-4">
            <Link
              to="/"
              className="inline-flex items-center space-x-2 px-5 py-2.5 text-xs font-semibold text-brand-700 bg-brand-50 hover:bg-brand-100 border border-brand-200 rounded-xl transition shadow-xs"
            >
              <Plus className="w-3.5 h-3.5 text-brand-600" />
              <span>Create your own free surveys</span>
            </Link>

            <img
              src="/askbuurspace.jpg"
              alt="Ask by urspace.com"
              width="180"
              height="72"
              className="h-14 sm:h-16 w-auto object-contain"
            />
          </div>
        </article>
      </main>
    );
  }

  const pageTitle = survey?.title ? `${survey.title} — Ask by urspace.com` : 'Online Survey — Ask by urspace.com';
  const pageDescription = survey?.description
    ? survey.description.slice(0, 160)
    : 'Participate in this free anonymous questionnaire on Ask by urspace.com.';

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100/70 py-10 px-4 sm:px-6">
      <SEO
        title={pageTitle}
        description={pageDescription}
        canonical={`https://ask.urspace.com/s/${surveyId}`}
        ogType="article"
        schema={{
          '@context': 'https://schema.org',
          '@type': 'WebPage',
          'name': survey?.title,
          'description': survey?.description || pageDescription,
          'url': `https://ask.urspace.com/s/${surveyId}`
        }}
      />
      <div className="max-w-2xl mx-auto">
        {/* Survey Header Banner */}
        <header className="bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-8 shadow-sm mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
            <img
              src="/askbuurspace.jpg"
              alt="Ask by urspace.com"
              width="240"
              height="96"
              className="h-20 sm:h-24 w-auto object-contain rounded-lg self-start"
            />
            <span className="text-xs font-semibold text-brand-600 uppercase tracking-wider bg-brand-50 px-2.5 py-1 rounded-full border border-brand-100 self-start sm:self-auto">
              Anonymous Survey
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            {survey?.title}
          </h1>
          {survey?.description && (
            <p className="text-sm sm:text-base text-slate-600 mt-3 whitespace-pre-line leading-relaxed">
              {survey.description}
            </p>
          )}
        </header>

        {error && (
          <div className="mb-6 p-4 rounded-2xl bg-red-50 border border-red-200 flex items-start space-x-3 text-red-700" role="alert">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <span className="text-sm font-medium">{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {questions.map((q, index) => {
            const selectedVal = answers[q.id];

            return (
              <fieldset
                key={q.id}
                className="bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-7 shadow-sm transition hover:border-slate-300 block"
              >
                <legend className="w-full float-left text-base sm:text-lg font-semibold text-slate-900 leading-snug mb-4">
                  <span className="text-slate-400 font-medium mr-2">{index + 1}.</span>
                  {q.question_text}
                  {q.is_required === 1 && (
                    <span className="text-red-500 ml-1.5" title="Required" aria-label="Required">
                      *
                    </span>
                  )}
                </legend>

                {/* Multiple Choice (Single Select) */}
                {q.question_type === 'multiple_choice' && (
                  <div role="radiogroup" aria-label={q.question_text} className="space-y-2.5 clear-both">
                    {(q.options || []).map((option, optIdx) => {
                      const isSelected = selectedVal === option;
                      return (
                        <button
                          type="button"
                          role="radio"
                          aria-checked={isSelected}
                          aria-label={option}
                          key={optIdx}
                          onClick={() => handleSelectAnswer(q.id, option)}
                          className={`w-full text-left p-3.5 rounded-xl border text-sm font-medium transition flex items-center justify-between group ${
                            isSelected
                              ? 'border-brand-500 bg-brand-50/50 text-brand-900 ring-2 ring-brand-500/20 shadow-sm'
                              : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700'
                          }`}
                        >
                          <div className="flex items-center space-x-3">
                            <span
                              className={`w-5 h-5 rounded-full border flex items-center justify-center transition ${
                                isSelected
                                  ? 'border-brand-600 bg-brand-600 text-white'
                                  : 'border-slate-300 group-hover:border-slate-400'
                              }`}
                            >
                              {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                            </span>
                            <span>{option}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Checkboxes (Multi-Select) */}
                {q.question_type === 'checkboxes' && (
                  <div role="group" aria-label={q.question_text} className="space-y-2.5 clear-both">
                    {(q.options || []).map((option, optIdx) => {
                      const selectedList = Array.isArray(selectedVal) ? selectedVal : [];
                      const isSelected = selectedList.includes(option);
                      return (
                        <button
                          type="button"
                          role="checkbox"
                          aria-checked={isSelected}
                          aria-label={option}
                          key={optIdx}
                          onClick={() => handleToggleCheckbox(q.id, option)}
                          className={`w-full text-left p-3.5 rounded-xl border text-sm font-medium transition flex items-center justify-between group ${
                            isSelected
                              ? 'border-brand-500 bg-brand-50/50 text-brand-900 ring-2 ring-brand-500/20 shadow-sm'
                              : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700'
                          }`}
                        >
                          <div className="flex items-center space-x-3">
                            <span
                              className={`w-5 h-5 rounded-md border flex items-center justify-center transition ${
                                isSelected
                                  ? 'border-brand-600 bg-brand-600 text-white'
                                  : 'border-slate-300 group-hover:border-slate-400'
                              }`}
                            >
                              {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                            </span>
                            <span>{option}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Single Text Box */}
                {q.question_type === 'single_text' && (
                  <div className="pt-1 clear-both">
                    <input
                      type="text"
                      aria-label={q.question_text}
                      aria-required={q.is_required === 1}
                      value={selectedVal || ''}
                      onChange={(e) => handleSelectAnswer(q.id, e.target.value)}
                      placeholder="Type your answer here..."
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-600 text-sm text-slate-800 placeholder:text-slate-400 transition bg-slate-50/50 focus:bg-white"
                    />
                  </div>
                )}

                {/* Comment Box (Multi-line) */}
                {q.question_type === 'comment_box' && (
                  <div className="pt-1 clear-both">
                    <textarea
                      rows={4}
                      aria-label={q.question_text}
                      aria-required={q.is_required === 1}
                      value={selectedVal || ''}
                      onChange={(e) => handleSelectAnswer(q.id, e.target.value)}
                      placeholder="Type your detailed comment here..."
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-600 text-sm text-slate-800 placeholder:text-slate-400 leading-relaxed resize-y transition shadow-inner bg-slate-50/50 focus:bg-white"
                    />
                  </div>
                )}

                {/* Star Rating (1–5 Stars) */}
                {q.question_type === 'star_rating' && (
                  <div role="radiogroup" aria-label={q.question_text} className="pt-2 flex flex-col items-center sm:items-start space-y-2 clear-both">
                    <div className="flex items-center space-x-2">
                      {[1, 2, 3, 4, 5].map((star) => {
                        const currentRating = parseInt(selectedVal, 10) || 0;
                        const hovered = hoveredStar[q.id] || 0;
                        const isFilled = hovered ? star <= hovered : star <= currentRating;

                        return (
                          <button
                            type="button"
                            role="radio"
                            aria-checked={currentRating === star}
                            aria-label={`${star} of 5 stars`}
                            key={star}
                            onClick={() => handleSelectAnswer(q.id, String(star))}
                            onMouseEnter={() => setHoveredStar((prev) => ({ ...prev, [q.id]: star }))}
                            onMouseLeave={() => setHoveredStar((prev) => ({ ...prev, [q.id]: 0 }))}
                            className="p-1.5 focus:outline-none transform hover:scale-110 transition active:scale-95"
                            title={`${star} Star${star > 1 ? 's' : ''}`}
                          >
                            <Star
                              className={`w-9 h-9 transition ${
                                isFilled
                                  ? 'fill-amber-400 stroke-amber-500 text-amber-400'
                                  : 'stroke-slate-300 text-slate-300 hover:stroke-slate-400'
                              }`}
                            />
                          </button>
                        );
                      })}
                    </div>
                    <span className="text-xs font-semibold text-slate-500">
                      {selectedVal ? `${selectedVal} out of 5 stars` : 'Select a rating'}
                    </span>
                  </div>
                )}

                {/* Slider (1–100) */}
                {q.question_type === 'slider' && (
                  <div className="pt-2 px-1 clear-both">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-slate-500">1</span>
                      <span className="px-3 py-1 rounded-full bg-brand-600 text-white font-bold text-sm shadow-sm">
                        {selectedVal !== undefined ? selectedVal : '50'}
                      </span>
                      <span className="text-xs font-semibold text-slate-500">100</span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="100"
                      aria-label={q.question_text}
                      aria-valuemin={1}
                      aria-valuemax={100}
                      aria-valuenow={selectedVal !== undefined ? Number(selectedVal) : 50}
                      value={selectedVal !== undefined ? selectedVal : 50}
                      onChange={(e) => handleSelectAnswer(q.id, e.target.value)}
                      className="w-full h-2.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-brand-600 focus:outline-none"
                    />
                  </div>
                )}

                {/* Ranking / Ordering */}
                {q.question_type === 'ranking' && (
                  <div className="pt-2 space-y-2 clear-both">
                    <p className="text-xs text-slate-500 font-medium mb-3">
                      Use the up and down arrows to arrange the items from top (highest) to bottom:
                    </p>
                    <div role="list" aria-label={q.question_text} className="space-y-2">
                      {((Array.isArray(selectedVal) && selectedVal.length > 0)
                        ? selectedVal
                        : (q.options || [])
                      ).map((item, itemIdx, currentArr) => (
                        <div
                          key={itemIdx}
                          role="listitem"
                          className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition shadow-sm"
                        >
                          <div className="flex items-center space-x-3">
                            <span className="w-6 h-6 rounded-full bg-brand-50 text-brand-700 font-bold text-xs flex items-center justify-center border border-brand-100">
                              {itemIdx + 1}
                            </span>
                            <span className="text-sm font-semibold text-slate-800">{item}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <button
                              type="button"
                              onClick={() => handleMoveRank(q.id, itemIdx, itemIdx - 1)}
                              disabled={itemIdx === 0}
                              aria-label={`Move ${item} up`}
                              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg disabled:opacity-25 transition"
                              title="Move Up"
                            >
                              <ChevronUp className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleMoveRank(q.id, itemIdx, itemIdx + 1)}
                              disabled={itemIdx === currentArr.length - 1}
                              aria-label={`Move ${item} down`}
                              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg disabled:opacity-25 transition"
                              title="Move Down"
                            >
                              <ChevronDown className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* True / False Options */}
                {q.question_type === 'true_false' && (
                  <div role="radiogroup" aria-label={q.question_text} className="grid grid-cols-2 gap-3 clear-both">
                    {['True', 'False'].map((choice) => {
                      const isSelected = selectedVal === choice;
                      return (
                        <button
                          type="button"
                          role="radio"
                          aria-checked={isSelected}
                          aria-label={choice}
                          key={choice}
                          onClick={() => handleSelectAnswer(q.id, choice)}
                          className={`py-3.5 px-4 rounded-xl border text-sm font-semibold transition text-center ${
                            isSelected
                              ? 'border-brand-500 bg-brand-50/60 text-brand-900 ring-2 ring-brand-500/20 shadow-sm'
                              : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700'
                          }`}
                        >
                          {choice}
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* 1–10 Rating Scale */}
                {q.question_type === 'rating_1_10' && (
                  <div role="radiogroup" aria-label={q.question_text} className="space-y-2 clear-both">
                    <div className="grid grid-cols-5 sm:grid-cols-10 gap-1.5 sm:gap-2">
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((rating) => {
                        const isSelected = String(selectedVal) === String(rating);
                        return (
                          <button
                            type="button"
                            role="radio"
                            aria-checked={isSelected}
                            aria-label={`Rating ${rating} of 10`}
                            key={rating}
                            onClick={() => handleSelectAnswer(q.id, String(rating))}
                            className={`h-11 sm:h-12 rounded-xl border text-sm font-bold transition flex items-center justify-center ${
                              isSelected
                                ? 'border-brand-600 bg-brand-600 text-white shadow-md shadow-brand-500/30'
                                : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700'
                            }`}
                          >
                            {rating}
                          </button>
                        );
                      })}
                    </div>
                    <div className="flex items-center justify-between text-xs text-slate-400 pt-1 font-medium px-1">
                      <span>1 = Lowest</span>
                      <span>10 = Highest</span>
                    </div>
                  </div>
                )}

                {/* Open-Ended Text Question (Legacy) */}
                {q.question_type === 'text' && (
                  <div className="pt-1 clear-both">
                    <textarea
                      rows={4}
                      aria-label={q.question_text}
                      aria-required={q.is_required === 1}
                      value={selectedVal || ''}
                      onChange={(e) => handleSelectAnswer(q.id, e.target.value)}
                      placeholder="Type your response here..."
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-600 text-sm text-slate-800 placeholder:text-slate-400 leading-relaxed resize-y transition shadow-inner bg-slate-50/50 focus:bg-white"
                    />
                  </div>
                )}
              </fieldset>
            );
          })}

          <div className="pt-4">
            <button
              type="submit"
              disabled={submitting}
              aria-label="Submit Response"
              className="w-full py-3.5 px-6 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-base font-semibold shadow-md shadow-brand-600/20 transition flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              {submitting ? (
                <span>Submitting your response...</span>
              ) : (
                <>
                  <span>Submit Response</span>
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </div>
        </form>

        <footer className="text-center py-10 text-xs text-slate-400 flex flex-col items-center justify-center space-y-4">
          <Link
            to="/"
            className="inline-flex items-center space-x-2 px-5 py-2.5 text-xs font-semibold text-brand-700 bg-white hover:bg-brand-50 border border-brand-200 rounded-xl shadow-xs transition hover:shadow-sm"
          >
            <Plus className="w-3.5 h-3.5 text-brand-600" />
            <span>Create your own free surveys</span>
          </Link>

          <div className="flex flex-col items-center space-y-2">
            <img
              src="/askbuurspace.jpg"
              alt="Ask by urspace.com"
              width="180"
              height="72"
              className="h-14 sm:h-16 w-auto object-contain opacity-85"
            />
            <span>Ask by urspace.com • Privacy-first, anonymous surveys</span>
          </div>
        </footer>
      </div>
    </main>
  );
}
