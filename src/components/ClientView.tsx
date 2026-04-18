import React, { useState, useEffect } from 'react';
import { collection, query, getDocs, addDoc, where, orderBy, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from './AuthContext';
import { format, addDays, startOfDay, isSameDay, parseISO } from 'date-fns';
import { ru } from 'date-fns/locale';
import { motion, AnimatePresence } from 'motion/react';
import { Calendar as CalendarIcon, Clock, CheckCircle2, AlertCircle, MessageSquare, Send, X, Activity } from 'lucide-react';
import { askGemini } from '../lib/gemini';

interface Service {
  id: string;
  name: string;
  order?: number;
  duration: number;
  price: number;
  description: string;
  checkboxes?: { label: string; explanation: string }[];
}

interface Booking {
  id: string;
  serviceId: string;
  timestamp: string;
  status: string;
}

export function ClientView() {
  const { user } = useAuth();
  const [services, setServices] = useState<Service[]>([]);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(startOfDay(new Date()));
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [qaOpen, setQaOpen] = useState(false);
  const [question, setQuestion] = useState('');
  const [qaHistory, setQaHistory] = useState<{q: string, a: string}[]>([]);

  useEffect(() => {
    const fetchServices = async () => {
      const q = query(collection(db, 'services'), orderBy('order', 'asc'));
      const snapshot = await getDocs(q);
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Service));
      setServices(list);
    };

    const fetchMyBookings = () => {
      if (!user) return;
      const q = query(collection(db, 'bookings'), where('userId', '==', user.uid), orderBy('timestamp', 'desc'));
      return onSnapshot(q, (snapshot) => {
        setBookings(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Booking)));
      });
    };

    fetchServices();
    return fetchMyBookings();
  }, [user]);

  const handleBooking = async () => {
    if (!user || !selectedService || !selectedSlot) return;
    setLoading(true);
    try {
      await addDoc(collection(db, 'bookings'), {
        userId: user.uid,
        serviceId: selectedService.id,
        serviceName: selectedService.name,
        timestamp: selectedSlot,
        selectedOptions,
        notes,
        clientName: user.displayName,
        clientEmail: user.email,
        status: 'pending',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      setStep(4);
    } catch (error) {
      console.error("Booking error:", error);
      alert("Ошибка при записи. Попробуйте еще раз.");
    } finally {
      setLoading(false);
    }
  };

  const handleAsk = async () => {
    if (!question.trim()) return;
    const q = question;
    setQuestion('');
    setQaHistory(prev => [...prev, { q, a: "Обдумываю..." }]);
    const answer = await askGemini(q);
    setQaHistory(prev => {
      const history = [...prev];
      history[history.length - 1].a = answer;
      return history;
    });
    
    // Also save to DB for admin to see
    if (user) {
      await addDoc(collection(db, 'questions'), {
        userId: user.uid,
        text: q,
        answer: answer,
        isAiAnswer: true,
        status: 'answered',
        createdAt: serverTimestamp()
      });
    }
  };

  const next7Days = Array.from({ length: 7 }, (_, i) => addDays(new Date(), i));
  const timeSlots = Array.from({ length: 16 }, (_, i) => {
    const hour = 9 + Math.floor(i / 2);
    const min = (i % 2) * 30;
    return `${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`;
  });

  return (
    <div className="space-y-12">
      {/* QA Floating Button */}
      <button 
        onClick={() => setQaOpen(true)}
        className="fixed bottom-8 right-8 bg-blue-600 text-white p-4 rounded-full shadow-2xl hover:scale-110 transition-transform z-40"
      >
        <MessageSquare size={24} />
      </button>

      {/* QA Dialog */}
      <AnimatePresence>
        {qaOpen && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="fixed bottom-24 right-8 w-80 md:w-96 bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 flex flex-col max-h-[500px]"
          >
            <div className="p-4 border-b flex justify-between items-center bg-blue-600 text-white rounded-t-2xl">
              <h3 className="font-bold">Ассистент</h3>
              <button onClick={() => setQaOpen(false)}><X size={20}/></button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {qaHistory.length === 0 && (
                <p className="text-slate-400 text-sm text-center italic">Задайте вопрос о процедурах или подготовке к ним.</p>
              )}
              {qaHistory.map((item, i) => (
                <div key={i} className="space-y-2">
                  <div className="bg-slate-100 p-2 rounded-lg text-sm self-end ml-8">{item.q}</div>
                  <div className="bg-blue-50 p-2 rounded-lg text-sm mr-8 border border-blue-100">{item.a}</div>
                </div>
              ))}
            </div>
            <div className="p-4 border-t flex gap-2">
              <input 
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAsk()}
                placeholder="Ваш вопрос..."
                className="flex-1 bg-slate-50 border-none rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
              />
              <button onClick={handleAsk} className="bg-blue-600 text-white p-2 rounded-lg"><Send size={18}/></button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <section>
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Запись на исследование</h1>
            <p className="text-slate-500">Выберите подходящую процедуру и время.</p>
          </div>
          <div className="flex gap-2">
            {[1, 2, 3].map(s => (
              <div key={s} className={`w-3 h-3 rounded-full ${step >= s ? 'bg-blue-600' : 'bg-slate-200'}`} />
            ))}
          </div>
        </div>

        <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
          {step === 1 && (
            <div className="p-8">
              <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                <Activity className="text-blue-600" size={24} />
                Тип исследования
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {services.length === 0 && <p className="text-slate-400">Загрузка услуг...</p>}
                {services.map(s => (
                  <button
                    key={s.id}
                    onClick={() => { setSelectedService(s); setStep(2); setSelectedOptions([]); }}
                    className="flex flex-col text-left p-6 rounded-2xl border-2 border-slate-50 hover:border-blue-500 hover:shadow-lg transition-all group"
                  >
                    <span className="font-bold text-lg group-hover:text-blue-600 transition-colors">{s.name}</span>
                    <span className="text-slate-500 text-sm mt-2">{s.description}</span>
                    <div className="mt-4 flex justify-between items-center w-full">
                      <span className="text-blue-600 font-bold">{s.price} ₽</span>
                      <span className="text-slate-400 text-xs">{s.duration} мин</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 2 && selectedService && (
            <div className="p-8">
              <button onClick={() => setStep(1)} className="text-sm text-blue-600 font-medium mb-6 hover:underline">← Назад к выбору услуги</button>
              <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                <CalendarIcon className="text-blue-600" size={24} />
                Выбор даты и времени
              </h2>
              <div className="flex gap-4 overflow-x-auto pb-4 mb-8 no-scrollbar">
                {next7Days.map(date => (
                  <button
                    key={date.toISOString()}
                    onClick={() => setSelectedDate(date)}
                    className={`flex flex-col items-center min-w-[100px] p-4 rounded-2xl border-2 transition-all ${
                      isSameDay(date, selectedDate) 
                      ? 'border-blue-600 bg-blue-50 text-blue-600' 
                      : 'border-slate-50 text-slate-500 hover:border-slate-200'
                    }`}
                  >
                    <span className="text-xs uppercase font-bold tracking-widest">{format(date, 'EEE', { locale: ru })}</span>
                    <span className="text-2xl font-black">{format(date, 'd')}</span>
                    <span className="text-xs font-medium">{format(date, 'MMM', { locale: ru })}</span>
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-3">
                {timeSlots.map(time => (
                  <button
                    key={time}
                    onClick={() => setSelectedSlot(`${format(selectedDate, 'yyyy-MM-dd')}T${time}`)}
                    className={`p-3 rounded-xl border-2 text-center text-sm font-bold transition-all ${
                      selectedSlot === `${format(selectedDate, 'yyyy-MM-dd')}T${time}`
                      ? 'border-blue-600 bg-blue-600 text-white'
                      : 'border-slate-50 text-slate-600 hover:border-blue-200'
                    }`}
                  >
                    {time}
                  </button>
                ))}
              </div>

              {selectedService.checkboxes && selectedService.checkboxes.length > 0 && (
                <div className="mt-12 bg-slate-50 p-6 rounded-2xl border border-slate-100">
                  <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <CheckCircle2 size={20} className="text-blue-600" />
                    Дополнительная информация для {selectedService.name}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {selectedService.checkboxes.map((cb, idx) => (
                      <label key={idx} className="flex items-start gap-3 p-3 bg-white rounded-xl border border-slate-200 cursor-pointer hover:border-blue-300 transition-colors">
                        <input 
                          type="checkbox" 
                          checked={selectedOptions.includes(cb.label)}
                          onChange={(e) => {
                            if (e.target.checked) setSelectedOptions([...selectedOptions, cb.label]);
                            else setSelectedOptions(selectedOptions.filter(o => o !== cb.label));
                          }}
                          className="mt-1 w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        />
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-slate-700">{cb.label}</span>
                          <span className="text-xs text-slate-500 leading-tight">{cb.explanation}</span>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-12 flex justify-end">
                <button
                  disabled={!selectedSlot}
                  onClick={() => setStep(3)}
                  className="bg-blue-600 text-white px-10 py-3 rounded-2xl font-bold shadow-lg shadow-blue-200 hover:bg-blue-700 disabled:opacity-50 transition-all"
                >
                  Продолжить
                </button>
              </div>
            </div>
          )}

          {step === 3 && selectedService && selectedSlot && (
            <div className="p-8 max-w-2xl mx-auto">
              <button onClick={() => setStep(2)} className="text-sm text-blue-600 font-medium mb-6 hover:underline">← Назад к выбору времени</button>
              <h2 className="text-2xl font-bold mb-8 text-center">Подтверждение записи</h2>
              <div className="bg-slate-50 rounded-2xl p-6 space-y-4">
                <div className="flex justify-between border-b border-slate-200 pb-4">
                  <span className="text-slate-500">Услуга</span>
                  <span className="font-bold">{selectedService.name}</span>
                </div>
                <div className="flex justify-between border-b border-slate-200 pb-4">
                  <span className="text-slate-500">Дата</span>
                  <span className="font-bold">{format(parseISO(selectedSlot), 'd MMMM yyyy', { locale: ru })}</span>
                </div>
                <div className="flex justify-between border-b border-slate-200 pb-4">
                  <span className="text-slate-500">Время</span>
                  <span className="font-bold">{format(parseISO(selectedSlot), 'HH:mm')}</span>
                </div>
                <div className="flex justify-between pt-2">
                  <span className="text-slate-500 font-medium">К оплате (в клинике)</span>
                  <span className="font-bold text-xl text-blue-600">{selectedService.price} ₽</span>
                </div>
              </div>

              <div className="mt-8">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1 block">Примечание (напр. номера зубов)</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Введите дополнительную информацию..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-blue-500 min-h-[80px] text-sm"
                />
              </div>

              <div className="mt-10 flex flex-col gap-4">
                <button
                  onClick={handleBooking}
                  disabled={loading}
                  className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold text-lg shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all flex justify-center items-center gap-2"
                >
                  {loading ? 'Обработка...' : 'Подтвердить запись'}
                  {!loading && <CheckCircle2 size={24} />}
                </button>
                <div className="flex gap-2 text-xs text-slate-500 bg-amber-50 p-4 rounded-xl border border-amber-100">
                  <AlertCircle size={16} className="text-amber-500 shrink-0" />
                  <span>Пожалуйста, приходите за 10 минут до начала процедуры. Не забудьте паспорт и полис.</span>
                </div>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="p-16 text-center animate-in fade-in zoom-in duration-500">
              <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 size={48} />
              </div>
              <h2 className="text-3xl font-black mb-4">Вы успешно записаны!</h2>
              <p className="text-slate-500 mb-10 max-w-sm mx-auto">
                Мы пришлем напоминание в день обследования. Вы всегда можете просмотреть свои записи ниже.
              </p>
              <button
                onClick={() => { 
                  setStep(1); 
                  setSelectedService(null); 
                  setSelectedSlot(null); 
                  setNotes('');
                  setSelectedOptions([]);
                }}
                className="text-blue-600 font-bold hover:underline"
              >
                Вернуться к началу
              </button>
            </div>
          )}
        </div>
      </section>

      {bookings.length > 0 && (
        <section>
          <h2 className="text-2xl font-bold mb-6">Мои записи</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {bookings.map(b => (
              <div key={b.id} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex justify-between items-center group hover:shadow-md transition-shadow">
                <div className="flex gap-4 items-center">
                  <div className="bg-blue-50 p-3 rounded-xl text-blue-600">
                    <Clock size={24} />
                  </div>
                  <div>
                    <h3 className="font-bold">{(b as any).serviceName}</h3>
                    <p className="text-slate-500 text-sm">
                      {format(parseISO(b.timestamp), 'd MMM, HH:mm', { locale: ru })}
                    </p>
                  </div>
                </div>
                <div className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest ${
                  b.status === 'confirmed' ? 'bg-green-100 text-green-700' :
                  b.status === 'cancelled' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                }`}>
                  {b.status === 'confirmed' ? 'Подтверждено' :
                   b.status === 'cancelled' ? 'Отменено' : 'Ожидает'}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
