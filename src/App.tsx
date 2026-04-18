/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AuthProvider, useAuth } from './components/AuthContext';
import { Layout } from './components/Layout';
import { ClientView } from './components/ClientView';
import { AdminView } from './components/AdminView';
import { motion } from 'motion/react';
import { Activity, ShieldCheck, ChevronRight } from 'lucide-react';
import React, { useState } from 'react';

function LandingPage() {
  const { login } = useAuth();
  
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] text-center space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
      <div className="relative">
        <div className="absolute -inset-4 bg-blue-500/10 blur-3xl rounded-full" />
        <div className="bg-white p-6 rounded-[2.5rem] shadow-2xl relative border border-slate-100">
          <Activity size={64} className="text-blue-600" />
        </div>
      </div>
      
      <div className="max-w-2xl space-y-4">
        <h1 className="text-5xl md:text-6xl font-black text-slate-900 tracking-tighter leading-tight">
          Ваше здоровье начинается с <span className="text-blue-600">правильной диагностики.</span>
        </h1>
        <p className="text-lg text-slate-500 font-medium">
          Запишитесь на рентген онлайн за 2 минуты. Без очередей, звонков и лишних хлопот.
        </p>
      </div>

      <button
        onClick={() => login()}
        className="group bg-blue-600 text-white px-8 py-4 rounded-full font-bold text-lg shadow-xl shadow-blue-200 hover:bg-blue-700 transition-all flex items-center gap-2"
      >
        Начать запись
        <ChevronRight className="group-hover:translate-x-1 transition-transform" />
      </button>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-4xl mt-12">
        {[
          { title: "Просто", desc: "Всего 3 шага для записи" },
          { title: "Быстро", desc: "Подтверждение за 30 секунд" },
          { title: "Забота", desc: "AI-поддержка 24/7" }
        ].map((item, i) => (
          <div key={i} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
            <h3 className="font-bold text-slate-900 mb-1">{item.title}</h3>
            <p className="text-slate-400 text-sm">{item.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function MainContent() {
  const { user, userRole, loading } = useAuth();
  const [showClientView, setShowClientView] = useState(false);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Activity className="text-blue-600 animate-pulse" size={48} />
        <p className="text-slate-400 font-bold animate-pulse text-sm uppercase tracking-widest">Загрузка...</p>
      </div>
    );
  }

  if (!user) {
    return <LandingPage />;
  }

  // Admin can toggle view for testing
  if (userRole === 'admin') {
    return (
      <div className="space-y-4">
        <div className="bg-slate-900 text-white p-3 rounded-2xl flex justify-between items-center shadow-lg px-6 sticky top-4 z-50">
          <div className="flex items-center gap-2 text-sm font-bold">
            <ShieldCheck className="text-blue-400" size={18} />
            Режим администратора
          </div>
          <button
            onClick={() => setShowClientView(!showClientView)}
            className="text-xs bg-blue-600 hover:bg-blue-700 px-4 py-1.5 rounded-xl font-bold transition-all flex items-center gap-2"
          >
            {showClientView ? 'Вернуться в панель управления' : 'Посмотреть как клиент'}
            <ChevronRight size={14} className={showClientView ? 'rotate-180' : ''} />
          </button>
        </div>
        
        <motion.div
          key={showClientView ? 'client' : 'admin'}
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
        >
          {showClientView ? <ClientView /> : <AdminView />}
        </motion.div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <ClientView />
    </motion.div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Layout>
        <MainContent />
      </Layout>
    </AuthProvider>
  );
}
