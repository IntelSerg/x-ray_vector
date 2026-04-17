import React from 'react';
import { useAuth } from './AuthContext';
import { LogIn, LogOut, User as UserIcon, Calendar, Activity, ShieldCheck } from 'lucide-react';
import { motion } from 'motion/react';

export function Layout({ children }: { children: React.ReactNode }) {
  const { user, userRole, login, logout } = useAuth();

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-2">
              <div className="bg-blue-600 p-2 rounded-lg text-white">
                <Activity size={24} />
              </div>
              <span className="font-bold text-xl tracking-tight hidden sm:block">X-Ray Center</span>
            </div>

            <div className="flex items-center gap-4">
              {user ? (
                <>
                  <div className="flex items-center gap-2 text-sm font-medium text-slate-600 px-3 py-1 bg-slate-100 rounded-full">
                    {userRole === 'admin' ? <ShieldCheck size={16} className="text-blue-600" /> : <UserIcon size={16} />}
                    <span className="hidden md:block">{user.displayName || user.email}</span>
                  </div>
                  <button
                    onClick={() => logout()}
                    className="flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-red-600 transition-colors"
                  >
                    <LogOut size={18} />
                    <span className="hidden sm:block">Выйти</span>
                  </button>
                </>
              ) : (
                <button
                  onClick={() => login()}
                  className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2 rounded-full font-semibold hover:bg-blue-700 transition-all shadow-lg shadow-blue-200"
                >
                  <LogIn size={18} />
                  Войти
                </button>
              )}
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
      
      <footer className="bg-white border-t border-slate-200 py-8 mt-12">
        <div className="max-w-7xl mx-auto px-4 text-center text-slate-500 text-sm">
          &copy; 2026 Рентгенологический кабинет. Все права защищены.
        </div>
      </footer>
    </div>
  );
}
