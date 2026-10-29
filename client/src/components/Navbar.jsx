import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { CheckSquare, Plus, LogOut, User, ShieldCheck } from 'lucide-react';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const isAdmin = user && (user.isAdmin || (user.email && user.email.toLowerCase() === 'jb@urspace.com'));

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-24 flex items-center justify-between">
        <div className="flex items-center space-x-6">
          <Link to="/" className="flex items-center space-x-3 group py-1.5" title="Ask by urspace.com">
            <img
              src="/askbuurspace.jpg"
              alt="Ask by urspace.com"
              className="h-16 sm:h-20 w-auto object-contain rounded-lg hover:opacity-95 transition"
            />
          </Link>
          {user && (
            <Link
              to="/dashboard"
              className="text-sm font-semibold text-slate-600 hover:text-brand-600 px-3 py-2 rounded-lg hover:bg-slate-50 transition"
            >
              Dashboard
            </Link>
          )}
          <Link
            to="/"
            className="text-sm font-semibold text-slate-600 hover:text-brand-600 px-3 py-2 rounded-lg hover:bg-slate-50 transition"
          >
            Features
          </Link>
          <Link
            to="/join"
            className="text-sm font-bold text-indigo-600 hover:text-indigo-700 px-3 py-2 rounded-lg hover:bg-indigo-50/70 transition flex items-center space-x-1"
          >
            <span>Join Poll</span>
          </Link>
        </div>

        {user ? (
          <div className="flex items-center space-x-3">
            {isAdmin && (
              <Link
                to="/admin"
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 text-xs font-bold shadow-sm transition"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-amber-700" />
                <span>Admin Portal</span>
              </Link>
            )}

            <Link
              to="/surveys/new"
              className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium shadow-sm transition"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">New Survey</span>
            </Link>

            <div className="h-5 w-px bg-slate-200" />

            <Link
              to="/account"
              title="My Account Settings"
              className="flex items-center space-x-2 text-sm text-slate-600 hover:text-brand-600 group transition p-1.5 rounded-xl hover:bg-slate-50"
            >
              <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-300 group-hover:border-brand-500 group-hover:bg-brand-50 flex items-center justify-center text-slate-700 group-hover:text-brand-700 font-bold text-xs shadow-xs transition">
                {user.email[0].toUpperCase()}
              </div>
              <span className="hidden md:inline font-medium text-slate-700 group-hover:text-slate-900">{user.email}</span>
              {isAdmin && (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                  Admin
                </span>
              )}
            </Link>

            <button
              onClick={handleLogout}
              title="Logout"
              className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="flex items-center space-x-3">
            <Link
              to="/"
              className="sm:hidden text-sm font-medium text-slate-700 hover:text-slate-900 px-2 py-2 rounded-lg hover:bg-slate-100 transition"
            >
              Features
            </Link>
            <Link
              to="/login"
              className="text-sm font-medium text-slate-700 hover:text-slate-900 px-3 py-2 rounded-lg hover:bg-slate-100 transition"
            >
              Log in
            </Link>
            <Link
              to="/register"
              className="text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 px-3.5 py-2 rounded-lg shadow-sm transition"
            >
              Get Started
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}
