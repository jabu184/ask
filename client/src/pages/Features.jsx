import React from 'react';
import { Link } from 'react-router-dom';
import SEO from '../components/SEO';
import {
  CheckSquare,
  BarChart3,
  Sliders,
  Star,
  ListOrdered,
  FileSpreadsheet,
  Download,
  Users,
  Eye,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  MessageSquare,
  HelpCircle,
  Clock,
  Layers,
  FileText,
  Radio,
  Tv,
  Cloud,
  ThumbsUp,
  QrCode,
  Hash,
  Play
} from 'lucide-react';

export default function Features() {
  const questionTypes = [
    {
      title: 'Multiple Choice',
      badge: 'Single Selection',
      desc: 'Classic radio option pills allowing respondents to choose exactly one answer from custom options.',
      icon: CheckSquare,
      preview: (
        <div className="space-y-2 mt-3">
          <div className="p-2.5 rounded-lg border border-brand-500 bg-brand-50/60 text-xs font-semibold text-brand-700 flex items-center justify-between">
            <span>Very Satisfied</span>
            <span className="w-3.5 h-3.5 rounded-full border-2 border-brand-600 bg-brand-600"></span>
          </div>
          <div className="p-2.5 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-600 flex items-center justify-between">
            <span>Neutral</span>
            <span className="w-3.5 h-3.5 rounded-full border border-slate-300"></span>
          </div>
        </div>
      )
    },
    {
      title: 'Checkboxes',
      badge: 'Multi-Select',
      desc: 'Allow respondents to choose multiple applicable options with toggleable checkbox badges.',
      icon: Layers,
      preview: (
        <div className="space-y-2 mt-3">
          <div className="p-2.5 rounded-lg border border-brand-500 bg-brand-50/60 text-xs font-semibold text-brand-700 flex items-center space-x-2">
            <span className="w-4 h-4 rounded bg-brand-600 text-white flex items-center justify-center text-[10px]">✓</span>
            <span>Product Quality</span>
          </div>
          <div className="p-2.5 rounded-lg border border-brand-500 bg-brand-50/60 text-xs font-semibold text-brand-700 flex items-center space-x-2">
            <span className="w-4 h-4 rounded bg-brand-600 text-white flex items-center justify-center text-[10px]">✓</span>
            <span>Customer Support</span>
          </div>
        </div>
      )
    },
    {
      title: 'Star Rating (1–5 Stars)',
      badge: 'Interactive Rating',
      desc: 'Smooth, visual 5-star rating widget for immediate satisfaction and quality feedback.',
      icon: Star,
      preview: (
        <div className="mt-4 p-3 bg-slate-50 rounded-xl border border-slate-100 text-center">
          <div className="flex items-center justify-center space-x-1.5 text-amber-400">
            {[1, 2, 3, 4, 5].map((s) => (
              <Star key={s} className="w-6 h-6 fill-amber-400 stroke-amber-500" />
            ))}
          </div>
          <p className="text-[11px] font-semibold text-slate-500 mt-2">5 out of 5 Stars</p>
        </div>
      )
    },
    {
      title: 'Slider (1–100)',
      badge: 'Numeric Scale',
      desc: 'Continuous draggable slider with real-time numeric value indicator from 1 to 100.',
      icon: Sliders,
      preview: (
        <div className="mt-4 p-3 bg-slate-50 rounded-xl border border-slate-100">
          <div className="flex justify-between items-center text-xs font-semibold text-slate-600 mb-2">
            <span>1</span>
            <span className="px-2 py-0.5 rounded bg-brand-600 text-white font-bold text-xs">85%</span>
            <span>100</span>
          </div>
          <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
            <div className="bg-brand-600 h-full rounded-full" style={{ width: '85%' }}></div>
          </div>
        </div>
      )
    },
    {
      title: 'Ranking / Ordering',
      badge: 'Priority Sorting',
      desc: 'Permits respondents to sequence choices according to importance and preference.',
      icon: ListOrdered,
      preview: (
        <div className="space-y-1.5 mt-3 text-xs">
          <div className="p-2 bg-white rounded-lg border border-slate-200 flex items-center justify-between font-semibold text-slate-800">
            <span>1. Speed & Reliability</span>
            <span className="text-[10px] text-slate-400">Top Priority</span>
          </div>
          <div className="p-2 bg-white rounded-lg border border-slate-200 flex items-center justify-between font-semibold text-slate-800">
            <span>2. Intuitive Interface</span>
            <span className="text-[10px] text-slate-400">Priority 2</span>
          </div>
        </div>
      )
    },
    {
      title: 'Comment & Single Text Boxes',
      badge: 'Open Ended',
      desc: 'Supports concise single-line answers and rich, multi-line feedback comments.',
      icon: MessageSquare,
      preview: (
        <div className="space-y-2 mt-3 text-xs">
          <input
            type="text"
            disabled
            placeholder="Short answer field..."
            className="w-full px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-400"
          />
          <textarea
            disabled
            rows="2"
            placeholder="Detailed open comment..."
            className="w-full px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-400 resize-none"
          />
        </div>
      )
    }
  ];

  return (
    <main className="bg-slate-50 min-h-screen">
      <SEO
        title="Ask by urspace.com | Free Online Survey Creator & Instant Analytics"
        description="Design modern online surveys with 8+ question types, real-time analytics graphs, and one-click Excel/CSV data exports. Completely free with no subscription required."
        canonicalUrl="https://ask.urspace.com/"
      />
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-20 sm:pt-20 sm:pb-28 border-b border-slate-200 bg-gradient-to-b from-white via-slate-50 to-slate-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center space-x-2 px-3 py-1.5 rounded-full text-xs font-semibold bg-brand-50 text-brand-700 border border-brand-200 mb-6 shadow-sm">
            <Sparkles className="w-3.5 h-3.5 text-brand-600" />
            <span>Full Platform Access — Free Without Subscription</span>
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900 leading-tight">
            Build Powerful Surveys. <br />
            <span className="text-brand-600">Zero Subscription Fees.</span>
          </h1>

          <p className="max-w-2xl mx-auto text-base sm:text-lg text-slate-600 mt-6 leading-relaxed">
            Create dynamic questionnaires with 8+ question types, collect unlimited anonymous responses, inspect submission-level details, and view real-time Chart.js analytics — all completely free, with no recurring subscriptions.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/register"
              className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 px-7 py-3.5 text-sm font-semibold text-white bg-brand-600 hover:bg-brand-700 rounded-xl shadow-md shadow-brand-600/20 transition transform hover:-translate-y-0.5"
            >
              <span>Get Started</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <Link
              to="/login"
              className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 px-7 py-3.5 text-sm font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl shadow-sm transition"
            >
              <span>Sign In to Dashboard</span>
            </Link>
          </div>

          {/* Guarantee Badges */}
          <div className="mt-12 pt-8 border-t border-slate-200/80 grid grid-cols-2 md:grid-cols-4 gap-4 text-xs font-semibold text-slate-600">
            <div className="flex items-center justify-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>No Credit Card Required</span>
            </div>
            <div className="flex items-center justify-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>No Monthly Subscription</span>
            </div>
            <div className="flex items-center justify-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Unlimited Questionnaires</span>
            </div>
            <div className="flex items-center justify-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Universal Excel & CSV Export</span>
            </div>
          </div>
        </div>
      </section>

      {/* NEW: Live Interactive Polling Section (Slido Alternative) */}
      <section className="py-16 bg-gradient-to-b from-slate-900 via-indigo-950 to-slate-900 text-white relative overflow-hidden">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-bold mb-4">
              <Radio className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
              <span>Brand New Feature</span>
            </div>
            <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-white mb-4">
              Live Interactive Polling & Q&A
            </h2>
            <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
              Engage your audience in real time during webinars, all-hands, conferences, and classroom lectures — an all-in-one Slido alternative built right in.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-6 shadow-xl backdrop-blur-sm">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center mb-4">
                <Cloud className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Live Word Clouds & Charts</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Watch animated word clouds scale with crowd frequency, or reveal percentage bar charts as answers stream in synchronously.
              </p>
            </div>

            <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-6 shadow-xl backdrop-blur-sm">
              <div className="w-10 h-10 rounded-xl bg-violet-500/20 text-violet-400 flex items-center justify-center mb-4">
                <ThumbsUp className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Audience Q&A & Upvoting</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Attendees submit questions anonymously and upvote top queries. Hosts can moderate, highlight questions on stage, or mark them answered.
              </p>
            </div>

            <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-6 shadow-xl backdrop-blur-sm">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center mb-4">
                <Tv className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Fullscreen Projector View</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Dedicated cinematic screen-share mode (`/p/:code/present`) with large QR code and PIN for instant zero-app mobile phone joining.
              </p>
            </div>
          </div>

          {/* Quick Join / Host CTAs */}
          <div className="bg-indigo-900/40 border border-indigo-500/30 rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6 backdrop-blur-md">
            <div>
              <div className="text-xs font-bold text-indigo-300 uppercase tracking-wider mb-1 flex items-center space-x-1.5">
                <Hash className="w-4 h-4 text-indigo-400" />
                <span>Have a 6-Digit PIN from a Speaker?</span>
              </div>
              <h4 className="text-xl font-extrabold text-white">Join an ongoing live poll right now</h4>
            </div>
            <div className="flex items-center space-x-3 w-full sm:w-auto">
              <Link
                to="/p"
                className="w-full sm:w-auto px-6 py-3 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white font-bold text-sm shadow-lg shadow-indigo-500/30 transition text-center flex items-center justify-center space-x-2"
              >
                <span>Enter PIN Code</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                to="/polls/new"
                className="w-full sm:w-auto px-6 py-3 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold text-sm transition text-center"
              >
                Host a Poll
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Survey Types Grid Section */}
      <section className="py-16 sm:py-24 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center space-x-1.5 text-xs font-bold text-brand-600 uppercase tracking-wider mb-2">
            <HelpCircle className="w-4 h-4" />
            <span>Versatile Survey Builder</span>
          </div>
          <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            8+ Built-in Question Types for Every Requirement
          </h2>
          <p className="text-sm sm:text-base text-slate-600 mt-3">
            From single-choice polls to interactive star ratings and numeric priority sliders, configure any question with optional or required constraints.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {questionTypes.map((qt, idx) => {
            const Icon = qt.icon;
            return (
              <div
                key={idx}
                className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="p-2.5 bg-brand-50 text-brand-600 rounded-xl border border-brand-100">
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                      {qt.badge}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-slate-900">{qt.title}</h3>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">{qt.desc}</p>
                </div>
                {qt.preview}
              </div>
            );
          })}
        </div>
      </section>

      {/* Analytics & Responses Deep Dive Section */}
      <section className="py-16 sm:py-24 bg-white border-y border-slate-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center space-x-1.5 text-xs font-bold text-purple-600 uppercase tracking-wider mb-2">
                <BarChart3 className="w-4 h-4" />
                <span>Real-Time Intelligence</span>
              </div>
              <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight leading-snug">
                Instant Visual Analytics & Distribution Graphs
              </h2>
              <p className="text-slate-600 text-sm sm:text-base mt-4 leading-relaxed">
                Watch feedback populate instantaneously. Every question type is automatically converted into high-resolution Chart.js visualizations, distribution percentages, and numeric averages.
              </p>

              <div className="mt-6 space-y-3.5 text-sm text-slate-700">
                <div className="flex items-start space-x-3">
                  <CheckCircle2 className="w-5 h-5 text-brand-600 flex-shrink-0 mt-0.5" />
                  <span><strong>Aggregated Percentages:</strong> Real-time bar and doughnut distributions for choices.</span>
                </div>
                <div className="flex items-start space-x-3">
                  <CheckCircle2 className="w-5 h-5 text-brand-600 flex-shrink-0 mt-0.5" />
                  <span><strong>Averages & Ratings:</strong> Automated mean calculations for sliders, scales, and star ratings.</span>
                </div>
                <div className="flex items-start space-x-3">
                  <CheckCircle2 className="w-5 h-5 text-brand-600 flex-shrink-0 mt-0.5" />
                  <span><strong>Open-Text Feed:</strong> Searchable repository of respondent comments and verbatim quotes.</span>
                </div>
              </div>
            </div>

            {/* Visual Analytics Graphic Card */}
            <div className="bg-slate-50 rounded-2xl border border-slate-200 p-6 shadow-sm">
              <div className="flex items-center justify-between pb-4 border-b border-slate-200 mb-5">
                <div>
                  <h4 className="text-sm font-bold text-slate-900">How would you rate our platform?</h4>
                  <p className="text-xs text-slate-500">142 total responses collected</p>
                </div>
                <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 font-bold text-xs rounded-full border border-emerald-200">
                  4.8 ★ Avg
                </span>
              </div>

              {/* Mock Bar Visuals */}
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1">
                    <span>5 Stars (Excellent)</span>
                    <span>78% (111)</span>
                  </div>
                  <div className="w-full bg-slate-200 h-3 rounded-full overflow-hidden">
                    <div className="bg-brand-600 h-full rounded-full" style={{ width: '78%' }}></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1">
                    <span>4 Stars (Good)</span>
                    <span>16% (23)</span>
                  </div>
                  <div className="w-full bg-slate-200 h-3 rounded-full overflow-hidden">
                    <div className="bg-purple-600 h-full rounded-full" style={{ width: '16%' }}></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1">
                    <span>3 Stars (Average)</span>
                    <span>6% (8)</span>
                  </div>
                  <div className="w-full bg-slate-200 h-3 rounded-full overflow-hidden">
                    <div className="bg-amber-500 h-full rounded-full" style={{ width: '6%' }}></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Individual Responses & Management Section */}
      <section className="py-16 sm:py-24 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Mock Individual Response Card */}
          <div className="order-2 lg:order-1 bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 mb-4">
              <div className="flex items-center space-x-2">
                <span className="px-2 py-0.5 bg-brand-50 text-brand-700 font-bold text-xs rounded border border-brand-200">
                  Response #42
                </span>
                <span className="text-xs text-slate-400 flex items-center space-x-1">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Submitted 14 mins ago</span>
                </span>
              </div>
              <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                Complete
              </span>
            </div>

            <div className="space-y-3.5 text-xs">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                <p className="font-bold text-slate-700">Q1. Overall Satisfaction</p>
                <p className="text-brand-600 font-semibold mt-1">★★★★★ (5 Stars)</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                <p className="font-bold text-slate-700">Q2. Would you recommend Ask by urspace?</p>
                <p className="text-emerald-700 font-semibold mt-1">Yes, definitely</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                <p className="font-bold text-slate-700">Q3. Additional Feedback</p>
                <p className="text-slate-600 italic mt-1">"Super fast, easy to answer on my phone, and clean layout."</p>
              </div>
            </div>
          </div>

          <div className="order-1 lg:order-2">
            <div className="inline-flex items-center space-x-1.5 text-xs font-bold text-emerald-600 uppercase tracking-wider mb-2">
              <Eye className="w-4 h-4" />
              <span>Response Management</span>
            </div>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight leading-snug">
              Inspect, Edit & Export Every Individual Submission
            </h2>
            <p className="text-slate-600 text-sm sm:text-base mt-4 leading-relaxed">
              Unlike platforms that lock granular responses behind expensive tier paywalls, Ask gives you complete transparency:
            </p>

            <div className="mt-6 space-y-3.5 text-sm text-slate-700">
              <div className="flex items-start space-x-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                <span><strong>Individual Response Browser:</strong> Step through responses one-by-one with exact submission date and time.</span>
              </div>
              <div className="flex items-start space-x-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                <span><strong>Edit & Prune Data:</strong> Correct test data, sanitize entries, or delete corrupted records.</span>
              </div>
              <div className="flex items-start space-x-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                <span><strong>Universal Export:</strong> Download full datasets in standardized <strong>CSV</strong> or formatted <strong>Excel (.xlsx)</strong> with a single click.</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Value Comparison / No Subscription Section */}
      <section className="py-16 sm:py-24 bg-gradient-to-b from-slate-900 to-slate-950 text-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 mb-6">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>100% Free • No Subscription Trap</span>
          </div>

          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            Everything You Need Without A Monthly Invoice
          </h2>

          <p className="text-slate-300 max-w-2xl mx-auto mt-4 text-sm sm:text-base">
            Most survey tools charge \$25 to \$75 every month just to access custom question types, exports, or more than 40 responses. Ask by urspace.com provides an uncompromising, full-featured survey engine completely free.
          </p>

          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
            <div className="p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm">
              <h4 className="text-base font-bold text-white mb-2">Unlimited Surveys</h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                Author as many active surveys as you need. Run customer polls, internal reviews, and event feedback simultaneously.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm">
              <h4 className="text-base font-bold text-white mb-2">No Response Caps</h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                Collect hundreds or thousands of responses without artificial gates or sudden upgrade prompts.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm">
              <h4 className="text-base font-bold text-white mb-2">Respondent Privacy</h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                Mobile-first public survey links with anonymous atomic submissions. No tracking ads or forced respondent logins.
              </p>
            </div>
          </div>

          <div className="mt-12">
            <Link
              to="/register"
              className="inline-flex items-center space-x-2 px-8 py-4 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-bold text-sm shadow-xl shadow-brand-600/30 transition transform hover:-translate-y-0.5"
            >
              <span>Get Started</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
