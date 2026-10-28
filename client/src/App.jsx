import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import AdminRoute from './components/AdminRoute';
import Navbar from './components/Navbar';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import SurveyBuilder from './pages/SurveyBuilder';
import SurveyAnalytics from './pages/SurveyAnalytics';
import PublicSurvey from './pages/PublicSurvey';
import AdminDashboard from './pages/AdminDashboard';
import Features from './pages/Features';
import Account from './pages/Account';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import PollJoin from './pages/PollJoin';
import PublicPoll from './pages/PublicPoll';
import PollPresenter from './pages/PollPresenter';
import PollBuilder from './pages/PollBuilder';
import PollHost from './pages/PollHost';
import PollAnalytics from './pages/PollAnalytics';

function LayoutWithNavbar({ children }) {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar />
      <main className="flex-1">
        {children}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Survey Respondent Experience (no creator chrome) */}
          <Route path="/s/:surveyId" element={<PublicSurvey />} />

          {/* Public Live Poll Join Screen */}
          <Route
            path="/p"
            element={
              <LayoutWithNavbar>
                <PollJoin />
              </LayoutWithNavbar>
            }
          />
          <Route path="/p/:code" element={<PublicPoll />} />
          <Route path="/p/:code/present" element={<PollPresenter />} />

          {/* Main Landing / Features Showcase Page */}
          <Route
            path="/"
            element={
              <LayoutWithNavbar>
                <Features />
              </LayoutWithNavbar>
            }
          />
          <Route
            path="/features"
            element={
              <LayoutWithNavbar>
                <Features />
              </LayoutWithNavbar>
            }
          />

          {/* Creator Authentication */}
          <Route
            path="/login"
            element={
              <LayoutWithNavbar>
                <Login />
              </LayoutWithNavbar>
            }
          />
          <Route
            path="/register"
            element={
              <LayoutWithNavbar>
                <Register />
              </LayoutWithNavbar>
            }
          />
          <Route
            path="/forgot-password"
            element={
              <LayoutWithNavbar>
                <ForgotPassword />
              </LayoutWithNavbar>
            }
          />
          <Route
            path="/reset-password"
            element={
              <LayoutWithNavbar>
                <ResetPassword />
              </LayoutWithNavbar>
            }
          />

          {/* Protected Creator Workspace */}
          <Route element={<ProtectedRoute />}>
            <Route
              path="/dashboard"
              element={
                <LayoutWithNavbar>
                  <Dashboard />
                </LayoutWithNavbar>
              }
            />
            <Route
              path="/surveys/new"
              element={
                <LayoutWithNavbar>
                  <SurveyBuilder />
                </LayoutWithNavbar>
              }
            />
            <Route
              path="/surveys/:id/edit"
              element={
                <LayoutWithNavbar>
                  <SurveyBuilder />
                </LayoutWithNavbar>
              }
            />
            <Route
              path="/surveys/:surveyId/analytics"
              element={
                <LayoutWithNavbar>
                  <SurveyAnalytics />
                </LayoutWithNavbar>
              }
            />

            {/* Live Polling Creator Routes */}
            <Route
              path="/polls/new"
              element={
                <LayoutWithNavbar>
                  <PollBuilder />
                </LayoutWithNavbar>
              }
            />
            <Route
              path="/polls/:id/edit"
              element={
                <LayoutWithNavbar>
                  <PollBuilder />
                </LayoutWithNavbar>
              }
            />
            <Route
              path="/polls/:id/host"
              element={
                <LayoutWithNavbar>
                  <PollHost />
                </LayoutWithNavbar>
              }
            />
            <Route
              path="/polls/:id/analytics"
              element={
                <LayoutWithNavbar>
                  <PollAnalytics />
                </LayoutWithNavbar>
              }
            />
            <Route
              path="/account"
              element={
                <LayoutWithNavbar>
                  <Account />
                </LayoutWithNavbar>
              }
            />
          </Route>

          {/* Dedicated Administrator Portal (restricted to jb@urspace.com) */}
          <Route element={<AdminRoute />}>
            <Route
              path="/admin"
              element={
                <LayoutWithNavbar>
                  <AdminDashboard />
                </LayoutWithNavbar>
              }
            />
          </Route>

          {/* Catch-all fallback */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
