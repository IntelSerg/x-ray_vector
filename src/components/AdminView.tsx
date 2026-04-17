import React, { useState, useEffect } from 'react';
import { collection, query, getDocs, updateDoc, doc, onSnapshot, orderBy, addDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { format, parseISO } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Calendar, Users, ClipboardList, Check, X, Trash2, Plus } from 'lucide-react';

interface Booking {
  id: string;
  userId: string;
  serviceId: string;
  serviceName: string;
  timestamp: string;
  clientName: string;
  clientEmail: string;
  status: 'pending' | 'confirmed' | 'cancelled';
}

interface Service {
  id: string;
  name: string;
  duration: number;
  price: number;
}

export function AdminView() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [view, setView] = useState<'bookings' | 'services'>('bookings');
  
  // Service form
  const [newServiceName, setNewServiceName] = useState('');
  const [newServicePrice, setNewServicePrice] = useState('');
  const [newServiceDuration, setNewServiceDuration] = useState('20');

  useEffect(() => {
    const qBookings = query(collection(db, 'bookings'), orderBy('timestamp', 'asc'));
    const unsubBookings = onSnapshot(qBookings, (snapshot) => {
      setBookings(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Booking)));
    });

    const qServices = query(collection(db, 'services'));
    const unsubServices = onSnapshot(qServices, (snapshot) => {
      setServices(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Service)));
    });

    return () => {
      unsubBookings();
      unsubServices();
    };
  }, []);

  const updateBookingStatus = async (id: string, status: string) => {
    await updateDoc(doc(db, 'bookings', id), { 
      status,
      updatedAt: new Date()
    });
  };

  const handleAddService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newServiceName || !newServicePrice) return;
    await addDoc(collection(db, 'services'), {
      name: newServiceName,
      price: Number(newServicePrice),
      duration: Number(newServiceDuration),
      description: 'Стандартная процедура'
    });
    setNewServiceName('');
    setNewServicePrice('');
  };

  const deleteService = async (id: string) => {
    if (window.confirm("Удалить услугу?")) {
      await deleteDoc(doc(db, 'services', id));
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex gap-4 mb-8">
        <button 
          onClick={() => setView('bookings')}
          className={`flex items-center gap-2 px-6 py-2 rounded-xl font-bold transition-all ${view === 'bookings' ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 border border-slate-200'}`}
        >
          <Calendar size={20} /> Записи
        </button>
        <button 
          onClick={() => setView('services')}
          className={`flex items-center gap-2 px-6 py-2 rounded-xl font-bold transition-all ${view === 'services' ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 border border-slate-200'}`}
        >
          <ClipboardList size={20} /> Услуги
        </button>
      </div>

      {view === 'bookings' ? (
        <section className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="p-6 border-b border-slate-100 flex justify-between items-center">
            <h2 className="text-xl font-bold">Управление записями</h2>
            <div className="flex gap-4 text-sm">
              <span className="flex items-center gap-1 text-slate-500">
                <div className="w-2 h-2 rounded-full bg-amber-500" /> Ожидает
              </span>
              <span className="flex items-center gap-1 text-slate-500">
                <div className="w-2 h-2 rounded-full bg-green-500" /> Подтверждено
              </span>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-400 text-xs uppercase tracking-widest font-bold">
                  <th className="px-6 py-4">Клиент</th>
                  <th className="px-6 py-4">Услуга</th>
                  <th className="px-6 py-4">Дата и время</th>
                  <th className="px-6 py-4">Статус</th>
                  <th className="px-6 py-4 text-right">Действия</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {bookings.map(b => (
                  <tr key={b.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-900">{b.clientName}</div>
                      <div className="text-xs text-slate-500">{b.clientEmail}</div>
                    </td>
                    <td className="px-6 py-4 text-slate-600 font-medium">{b.serviceName}</td>
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-700">{format(parseISO(b.timestamp), 'd MMM, HH:mm', { locale: ru })}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-block px-2 py-1 rounded-md text-[10px] uppercase font-black ${
                        b.status === 'confirmed' ? 'bg-green-100 text-green-700' :
                        b.status === 'cancelled' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                      }`}>
                        {b.status === 'confirmed' ? 'Подтверждено' :
                         b.status === 'cancelled' ? 'Отменено' : 'Ожидает'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        {b.status !== 'confirmed' && (
                          <button 
                            onClick={() => updateBookingStatus(b.id, 'confirmed')}
                            className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                          >
                            <Check size={20} />
                          </button>
                        )}
                        {b.status !== 'cancelled' && (
                          <button 
                            onClick={() => updateBookingStatus(b.id, 'cancelled')}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <X size={20} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <section className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm h-fit">
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
              <Plus className="text-blue-600" /> Добавить услугу
            </h2>
            <form onSubmit={handleAddService} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1 block">Название</label>
                <input 
                  required
                  value={newServiceName}
                  onChange={(e) => setNewServiceName(e.target.value)}
                  className="w-full bg-slate-50 border-none rounded-xl p-3 focus:ring-2 focus:ring-blue-500" 
                  placeholder="Напр. Флюорография"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1 block">Цена (₽)</label>
                  <input 
                    required
                    type="number"
                    value={newServicePrice}
                    onChange={(e) => setNewServicePrice(e.target.value)}
                    className="w-full bg-slate-50 border-none rounded-xl p-3 focus:ring-2 focus:ring-blue-500" 
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1 block">Мин.</label>
                  <input 
                    required
                    type="number"
                    value={newServiceDuration}
                    onChange={(e) => setNewServiceDuration(e.target.value)}
                    className="w-full bg-slate-50 border-none rounded-xl p-3 focus:ring-2 focus:ring-blue-500" 
                  />
                </div>
              </div>
              <button 
                type="submit"
                className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 mt-4"
              >
                Сохранить
              </button>
            </form>
          </section>

          <section className="lg:col-span-2 bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="p-6 border-b border-slate-100">
              <h2 className="text-xl font-bold">Список услуг</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50 text-slate-400 text-xs uppercase font-bold tracking-widest">
                    <th className="px-6 py-4">Название</th>
                    <th className="px-6 py-4">Цена</th>
                    <th className="px-6 py-4">Длит-сть</th>
                    <th className="px-6 py-4 text-right">Удал.</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {services.map(s => (
                    <tr key={s.id}>
                      <td className="px-6 py-4 font-bold text-slate-800">{s.name}</td>
                      <td className="px-6 py-4 text-blue-600 font-bold">{s.price} ₽</td>
                      <td className="px-6 py-4 text-slate-500 text-sm">{s.duration} мин</td>
                      <td className="px-6 py-4 text-right">
                        <button 
                          onClick={() => deleteService(s.id)}
                          className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                        >
                          <Trash2 size={18} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
