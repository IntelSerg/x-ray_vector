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
  order?: number;
  duration: number;
  price: number;
  description?: string;
  checkboxes?: { label: string; explanation: string }[];
}

export function AdminView() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [view, setView] = useState<'bookings' | 'services'>('bookings');
  
  // Service form
  const [newServiceName, setNewServiceName] = useState('');
  const [newServicePrice, setNewServicePrice] = useState('');
  const [newServiceDuration, setNewServiceDuration] = useState('20');
  const [newServiceDescription, setNewServiceDescription] = useState('');

  const seedServices = async () => {
    const list = [
      {
        name: "КТ 5х5",
        order: 1,
        description: "Область 3-5 рядом стоящих зубов. Пожалуйста, укажите номера зубов в примечании.",
        price: 2500,
        duration: 20
      },
      {
        name: "КТ 8х5",
        order: 2,
        description: "Область 8 рядом стоящих зубов. Пожалуйста, укажите номера зубов в примечании.",
        price: 3500,
        duration: 20
      },
      {
        name: "КТ 16х8",
        order: 3,
        description: "КТ верхней и нижней челюстей + бухты гайморовых пазух.",
        price: 4500,
        duration: 30
      },
      {
        name: "КТ 16х14,5",
        order: 4,
        description: "КТ верхней и нижней челюстей + гайморовы пазухи (возможен захват суставов - в зависимости от анатомических особенностей).",
        price: 5500,
        duration: 30
      },
      {
        name: "КТ ВНЧС",
        order: 5,
        description: "КТ височно-нижнечелюстного сустава. Выберите необходимые варианты исследования.",
        price: 4000,
        duration: 40,
        checkboxes: [
          { label: "в привычной окклюзии", explanation: "Относительное положение зубных рядов при их максимальном контакте." },
          { label: "с окклюзией на каппе (орторике)", explanation: "Исследование при использовании специальной ортопедической каппы." },
          { label: "с открытым ртом", explanation: "Необходимо для оценки положения головки сустава при открывании рта." }
        ]
      },
      {
        name: "ТРГ (бок.)",
        order: 6,
        description: "Телерентгенография черепа в боковой проекции.",
        price: 1800,
        duration: 15
      },
      {
        name: "ОПТГ",
        order: 7,
        description: "Ортопантомография (панорамный снимок) зубных рядов.",
        price: 1200,
        duration: 15
      }
    ];

    for (const s of list) {
      await addDoc(collection(db, 'services'), s);
    }
    alert("Услуги из списка успешно добавлены!");
  };

  useEffect(() => {
    const qBookings = query(collection(db, 'bookings'), orderBy('timestamp', 'asc'));
    const unsubBookings = onSnapshot(qBookings, (snapshot) => {
      setBookings(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Booking)));
    });

    const qServices = query(collection(db, 'services'), orderBy('order', 'asc'));
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
      order: services.length + 1,
      price: Number(newServicePrice),
      duration: Number(newServiceDuration),
      description: newServiceDescription || 'Стандартная процедура'
    });
    setNewServiceName('');
    setNewServicePrice('');
    setNewServiceDescription('');
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
        {view === 'services' && services.length === 0 && (
          <button 
            onClick={seedServices}
            className="flex items-center gap-2 px-4 py-2 bg-amber-100 text-amber-700 rounded-xl font-bold hover:bg-amber-200 transition-all text-xs"
          >
            <Plus size={16} /> Добавить стандартный список
          </button>
        )}
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
                      {(b as any).notes && (
                        <div className="text-[10px] bg-amber-50 text-amber-700 p-1 px-2 rounded mt-1 border border-amber-100">
                          Прим: {(b as any).notes}
                        </div>
                      )}
                      {(b as any).selectedOptions && (b as any).selectedOptions.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {(b as any).selectedOptions.map((opt: string, i: number) => (
                            <span key={i} className="text-[8px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded-full font-bold">
                              {opt}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-600 font-medium">{b.serviceName}</div>
                      {(b as any).totalPrice && (
                        <div className="text-blue-600 font-black text-sm mt-1">{(b as any).totalPrice} ₽</div>
                      )}
                      {(b as any).selectedAddons && (b as any).selectedAddons.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {(b as any).selectedAddons.map((addon: string, i: number) => (
                            <div key={i} className="text-[9px] text-slate-400 bg-slate-100 px-2 py-0.5 rounded leading-tight">
                              + {addon}
                            </div>
                          ))}
                        </div>
                      )}
                    </td>
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
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1 block">Описание</label>
                <textarea 
                  value={newServiceDescription}
                  onChange={(e) => setNewServiceDescription(e.target.value)}
                  className="w-full bg-slate-50 border-none rounded-xl p-3 focus:ring-2 focus:ring-blue-500 min-h-[100px]" 
                  placeholder="Пояснение к услуге..."
                />
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
                      <td className="px-6 py-4">
                        <div className="font-bold text-slate-800">{s.name}</div>
                        <div className="text-xs text-slate-400 mt-1 max-w-xs">{s.description}</div>
                        {s.checkboxes && s.checkboxes.length > 0 && (
                          <div className="mt-2 space-y-1">
                            {s.checkboxes.map((cb, idx) => (
                              <div key={idx} className="flex flex-col gap-0.5 ml-2 border-l-2 border-blue-100 pl-2">
                                <span className="text-[10px] font-bold text-blue-600">{cb.label}</span>
                                <span className="text-[9px] text-slate-400 italic leading-none">{cb.explanation}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </td>
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
