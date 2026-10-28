import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Sparkles, ArrowRight, Hash, HelpCircle, BarChart3, ShieldCheck, Zap } from 'lucide-react';
import SEO from '../components/SEO';

export default function PollJoin() {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleJoin = (e) => {
    e.preventDefault();
    const clean = code.trim().replace(/^#/, '');
    if (!clean) {
      setError('Please enter a valid 6-digit PIN or poll code.');
      return;
    }
    navigate(`/p/${encodeURIComponent(clean)}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-indigo-950 to-slate-900 text-white flex flex-col justify-between">
      <SEO
        title="Join a Live Poll"
        description="Enter a 6-digit PIN or event code to participate in live interactive voting, word clouds, and audience Q&A with Ask."
      />

      {/* Top Header */}
      <header className="p-6 flex items-center justify-between max-w-5xl mx-auto w-full">
        <Link to="/" className="flex items-center space-x-2 text-white font-bold text-xl tracking-tight">
          <div className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center shadow-lg shadow-indigo-500/30">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <span>Ask<span className="text-indigo-400">.</span></span>
        </Link>
        <Link
          to="/login"
          className="text-xs sm:text-sm text-slate-300 hover:text-white font-medium px-3.5 py-1.5 rounded-full border border-slate-700/60 hover:border-slate-500 transition-all"
        >
          Host a Poll
        </Link>
      </header>

      {/* Hero Join Card */}
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-400/20 text-indigo-300 text-xs font-semibold mb-4 backdrop-blur-sm">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Realtime Interactive Audience</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white mb-2">
              Join a Live Poll
            </h1>
            <p className="text-slate-400 text-sm">
              Enter the event PIN or code shared by your speaker or presenter.
            </p>
          </div>

          <div className="bg-slate-800/80 backdrop-blur-xl border border-slate-700/60 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-indigo-950/50">
            <form onSubmit={handleJoin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Event Code or 6-Digit PIN
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                    <Hash className="w-5 h-5 text-indigo-400" />
                  </div>
                  <input
                    type="text"
                    value={code}
                    onChange={(e) => {
                      setCode(e.target.value.toUpperCase());
                      if (error) setError('');
                    }}
                    placeholder="e.g. 842109 or team-allhands"
                    maxLength={24}
                    autoFocus
                    className="w-full pl-12 pr-4 py-3.5 bg-slate-900/90 border border-slate-700 focus:border-indigo-500 rounded-2xl text-white text-lg font-mono tracking-wider placeholder:text-slate-500 focus:ring-4 focus:ring-indigo-500/20 transition-all outline-none text-center sm:text-left"
                  />
                </div>
                {error && (
                  <p className="mt-2 text-xs text-rose-400 font-medium flex items-center space-x-1">
                    <span>{error}</span>
                  </p>
                )}
              </div>

              <button
                type="submit"
                className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white font-semibold text-base shadow-lg shadow-indigo-500/25 transition-all flex items-center justify-center space-x-2 group active:scale-[0.98]"
              >
                <span>Enter Poll</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </form>

            <div className="mt-6 pt-6 border-t border-slate-700/50 text-center">
              <p className="text-xs text-slate-400">
                Are you scanning a QR code? Camera scanning takes you directly into the session without needing to enter a PIN manually.
              </p>
            </div>
          </div>

          {/* Quick value props */}
          <div className="grid grid-cols-3 gap-3 mt-8 text-center">
            <div className="p-3 rounded-2xl bg-slate-800/40 border border-slate-800/80">
              <Zap className="w-4 h-4 text-amber-400 mx-auto mb-1" />
              <div className="text-[11px] font-semibold text-slate-200">Zero App Install</div>
              <div className="text-[10px] text-slate-400">Works in any browser</div>
            </div>
            <div className="p-3 rounded-2xl bg-slate-800/40 border border-slate-800/80">
              <ShieldCheck className="w-4 h-4 text-emerald-400 mx-auto mb-1" />
              <div className="text-[11px] font-semibold text-slate-200">100% Anonymous</div>
              <div className="text-[10px] text-slate-400">Safe honest feedback</div>
            </div>
            <div className="p-3 rounded-2xl bg-slate-800/40 border border-slate-800/80">
              <BarChart3 className="w-4 h-4 text-indigo-400 mx-auto mb-1" />
              <div className="text-[11px] font-semibold text-slate-200">Realtime Results</div>
              <div className="text-[10px] text-slate-400">Instant on screen</div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="p-6 text-center text-xs text-slate-500 max-w-5xl mx-auto w-full">
        &copy; {new Date().getFullYear()} Ask. All rights reserved.
      </footer>
    </div>
  );
}
