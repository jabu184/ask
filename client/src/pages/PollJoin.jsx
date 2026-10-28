import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowRight, Hash, ShieldCheck, Zap, BarChart3, AlertCircle } from 'lucide-react';
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
    <main className="min-h-[85vh] flex items-center justify-center px-4 py-12">
      <SEO
        title="Join a Live Poll — Ask by urspace.com"
        description="Enter a 6-digit PIN or event code to participate in live interactive voting, word clouds, and audience Q&A with Ask."
      />

      <div className="w-full max-w-md">
        {/* Main Card */}
        <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100 p-8">
          <div className="text-center mb-6">
            <Link to="/" title="Ask by urspace.com">
              <img
                src="/askbuurspace.jpg"
                alt="Ask by urspace.com"
                width="240"
                height="96"
                className="h-20 sm:h-24 mx-auto mb-4 object-contain rounded-lg hover:opacity-95 transition"
              />
            </Link>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Join a Live Poll
            </h1>
            <p className="text-slate-500 text-xs sm:text-sm mt-1">
              Enter the event PIN or code shared by your speaker
            </p>
          </div>

          {error && (
            <div className="mb-5 p-3 rounded-xl bg-red-50 border border-red-200 flex items-start space-x-2.5 text-xs text-red-700 font-medium">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleJoin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2 text-center">
                Event PIN or Code
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={code}
                  onChange={(e) => {
                    setCode(e.target.value.toUpperCase());
                    if (error) setError('');
                  }}
                  placeholder="e.g. 842109"
                  maxLength={24}
                  autoFocus
                  className="w-full px-4 py-3.5 bg-slate-50 border-2 border-slate-200 focus:border-brand-500 focus:bg-white rounded-xl text-slate-900 text-2xl font-mono tracking-widest text-center font-bold outline-none transition-all shadow-inner"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3.5 px-6 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-semibold text-sm shadow-sm shadow-brand-600/20 transition-all flex items-center justify-center space-x-2 group active:scale-[0.99]"
            >
              <span>Enter Live Poll</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-slate-100 text-center">
            <p className="text-xs text-slate-500 leading-relaxed">
              Scanning a presenter QR code with your camera? It connects you directly without needing to enter a PIN manually.
            </p>
          </div>
        </div>

        {/* Feature Pills */}
        <div className="grid grid-cols-3 gap-3 mt-6 text-center">
          <div className="p-3 rounded-xl bg-white border border-slate-200/80 shadow-xs">
            <Zap className="w-4 h-4 text-amber-500 mx-auto mb-1" />
            <div className="text-[11px] font-bold text-slate-800">Zero Install</div>
            <div className="text-[10px] text-slate-500">Any browser</div>
          </div>
          <div className="p-3 rounded-xl bg-white border border-slate-200/80 shadow-xs">
            <ShieldCheck className="w-4 h-4 text-emerald-600 mx-auto mb-1" />
            <div className="text-[11px] font-bold text-slate-800">Anonymous</div>
            <div className="text-[10px] text-slate-500">Safe feedback</div>
          </div>
          <div className="p-3 rounded-xl bg-white border border-slate-200/80 shadow-xs">
            <BarChart3 className="w-4 h-4 text-brand-600 mx-auto mb-1" />
            <div className="text-[11px] font-bold text-slate-800">Real-time</div>
            <div className="text-[10px] text-slate-500">Instant results</div>
          </div>
        </div>
      </div>
    </main>
  );
}
