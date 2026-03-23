import { useState, useRef, useEffect, DragEvent } from 'react';
import { ArrowLeft, Plus, Trash2, Upload, GripVertical, Users, Luggage, ShoppingCart, Check, X } from 'lucide-react';
import { Trip, DailyItinerary, ActivityCard, HotelInfo, LuggageCategory, ShoppingItem } from '@/types/trip';
import LuggageModal from '@/components/trip/LuggageModal';
import ShoppingModal from '@/components/trip/ShoppingModal';
import TripExpensesPanel from '@/components/admin/TripExpensesPanel';
import ManageParticipants from '@/components/trip/ManageParticipants';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { computeRemindTimeISO, datetimeLocalToISO, formatDateTimeZhTw, remindOffsetOptions } from '@/lib/todoReminders';

interface Props {
  trip: Trip;
  onSave: (trip: Trip) => void;
  onCancel: () => void;
  isSaving?: boolean;
  /** 後台「新增行程」尚未儲存前為 true，記帳管理將暫時停用 */
  isNewTrip?: boolean;
}

const fileToDataUrl = (file: File): Promise<string> =>
  new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.readAsDataURL(file);
  });

const TripEditor = ({ trip: initial, onSave, onCancel, isSaving = false, isNewTrip = false }: Props) => {
  const [trip, setTrip] = useState<Trip>({ ...initial });
  const coverInputRef = useRef<HTMLInputElement>(null);
  const [luggageOpen, setLuggageOpen] = useState(false);
  const [shoppingOpen, setShoppingOpen] = useState(false);
  const [participantsOpen, setParticipantsOpen] = useState(false);
  const [showTodoInput, setShowTodoInput] = useState(false);
  const [newTodo, setNewTodo] = useState('');
  const [newTodoDueAt, setNewTodoDueAt] = useState(() => {
    const d = new Date(Date.now() + 30 * 60_000);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  });
  const [newTodoRemindOffsetMinutes, setNewTodoRemindOffsetMinutes] = useState<number>(60);

  useEffect(() => {
    setTrip((prev) => ({ ...prev, luggageList: initial.luggageList, shoppingList: initial.shoppingList }));
  }, [initial.luggageList, initial.shoppingList]);
  // Drag state for activities
  const dragActivity = useRef<{ dayIdx: number; actIdx: number } | null>(null);
  const dragOverActivity = useRef<{ dayIdx: number; actIdx: number } | null>(null);

  // Drag state for day columns
  const dragDay = useRef<number | null>(null);
  const dragOverDay = useRef<number | null>(null);

  const handleActivityDragStart = (dayIdx: number, actIdx: number) => {
    dragActivity.current = { dayIdx, actIdx };
  };

  const handleActivityDragOver = (e: DragEvent, dayIdx: number, actIdx: number) => {
    e.preventDefault();
    dragOverActivity.current = { dayIdx, actIdx };
  };

  const handleActivityDrop = (e: DragEvent) => {
    e.preventDefault();
    const from = dragActivity.current;
    const to = dragOverActivity.current;
    if (!from || !to) return;

    const updated = trip.dailyItineraries.map(d => ({ ...d, activities: [...d.activities] }));
    const [movedItem] = updated[from.dayIdx].activities.splice(from.actIdx, 1);
    updated[to.dayIdx].activities.splice(to.actIdx, 0, movedItem);
    update('dailyItineraries', updated);

    dragActivity.current = null;
    dragOverActivity.current = null;
  };

  const handleDayDragStart = (dayIdx: number) => {
    dragDay.current = dayIdx;
  };

  const handleDayDragOver = (e: DragEvent, dayIdx: number) => {
    e.preventDefault();
    dragOverDay.current = dayIdx;
  };

  const handleDayDrop = (e: DragEvent) => {
    e.preventDefault();
    const from = dragDay.current;
    const to = dragOverDay.current;
    if (from === null || to === null || from === to) return;

    const updated = [...trip.dailyItineraries];
    const [movedDay] = updated.splice(from, 1);
    updated.splice(to, 0, movedDay);
    update('dailyItineraries', updated);

    dragDay.current = null;
    dragOverDay.current = null;
  };

  const update = <K extends keyof Trip>(key: K, value: Trip[K]) => {
    setTrip((prev) => ({ ...prev, [key]: value }));
  };

  const toggleTodo = (todoId: string) => {
    const next = trip.todos.map((t) => (t.id === todoId ? { ...t, checked: !t.checked } : t));
    update('todos', next);
  };

  const addTodo = () => {
    if (!newTodo.trim()) return;
    const dueAtIso = datetimeLocalToISO(newTodoDueAt);
    if (!dueAtIso) return;
    const remindTimeIso = computeRemindTimeISO(dueAtIso, newTodoRemindOffsetMinutes);

    const next = [
      ...trip.todos,
      {
        id: Date.now().toString(),
        text: newTodo.trim(),
        checked: false,
        remindTime: remindTimeIso,
        remindOffset: newTodoRemindOffsetMinutes,
      },
    ];
    update('todos', next);
    setNewTodo('');
    setShowTodoInput(false);
  };

  const updateFlight = (direction: 'departure' | 'return', field: string, value: string | number) => {
    setTrip((prev) => ({
      ...prev,
      flights: { ...prev.flights, [direction]: { ...prev.flights[direction], [field]: value } },
    }));
  };

  const addHotel = () => {
    const newHotel: HotelInfo = { id: Date.now().toString(), name: '', checkIn: '', checkOut: '', address: '', confirmationNumber: '' };
    update('hotels', [...trip.hotels, newHotel]);
  };

  const updateHotel = (id: string, field: keyof HotelInfo, value: string) => {
    update('hotels', trip.hotels.map((h) => (h.id === id ? { ...h, [field]: value } : h)));
  };

  const addDay = () => {
    const lastDate = trip.dailyItineraries.length > 0
      ? new Date(trip.dailyItineraries[trip.dailyItineraries.length - 1].date)
      : trip.startDate ? new Date(trip.startDate) : new Date();
    const nextDate = new Date(lastDate);
    nextDate.setDate(nextDate.getDate() + 1);
    const dateStr = nextDate.toISOString().split('T')[0];
    update('dailyItineraries', [...trip.dailyItineraries, { date: dateStr, activities: [] }]);
  };

  const updateDayDate = (dayIndex: number, newDate: string) => {
    const updated = [...trip.dailyItineraries];
    updated[dayIndex] = { ...updated[dayIndex], date: newDate };
    update('dailyItineraries', updated);
  };

  const addActivity = (dayIndex: number) => {
    const newActivity: ActivityCard = {
      id: Date.now().toString(),
      coverImage: '',
      title: '',
      type: '景點',
      address: '',
      notes: '',
      price: 0,
      payers: '',
      members: '',
      memberCount: 0,
      amountPerPerson: 0,
      settlementStatus: 'unsettled',
      receipts: [],
    };
    const updated = [...trip.dailyItineraries];
    updated[dayIndex] = { ...updated[dayIndex], activities: [...updated[dayIndex].activities, newActivity] };
    update('dailyItineraries', updated);
  };

  const updateActivity = (dayIndex: number, actId: string, field: string, value: unknown) => {
    const updated = [...trip.dailyItineraries];
    updated[dayIndex] = {
      ...updated[dayIndex],
      activities: updated[dayIndex].activities.map((a) => {
        if (a.id !== actId) return a;
        return { ...a, [field]: value };
      }),
    };
    update('dailyItineraries', updated);
  };

  const deleteActivity = (dayIndex: number, actId: string) => {
    const updated = [...trip.dailyItineraries];
    updated[dayIndex] = {
      ...updated[dayIndex],
      activities: updated[dayIndex].activities.filter((a) => a.id !== actId),
    };
    update('dailyItineraries', updated);
  };

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const dataUrl = await fileToDataUrl(file);
    update('coverImage', dataUrl);
  };

  const handleActivityImageUpload = async (dayIdx: number, actId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const dataUrl = await fileToDataUrl(file);
    updateActivity(dayIdx, actId, 'coverImage', dataUrl);
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <button onClick={onCancel} className="p-2 rounded-lg hover:bg-muted transition-colors">
          <ArrowLeft className="h-5 w-5 text-foreground" />
        </button>
        <h2 className="text-xl font-bold text-foreground flex-1">編輯行程</h2>
        <button
          onClick={() => onSave(trip)}
          disabled={isSaving}
          className="px-6 py-2 rounded-lg bg-action text-action-foreground font-medium hover:bg-action/90 disabled:opacity-60"
        >
          {isSaving ? '儲存中...' : '儲存'}
        </button>
      </div>

      <Tabs defaultValue="itinerary" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="itinerary">行程內容</TabsTrigger>
          <TabsTrigger value="expenses">記帳管理</TabsTrigger>
        </TabsList>

        <TabsContent value="itinerary" className="mt-6 space-y-8">
      {/* Section 1: Basic Info */}
      <div className="bg-card rounded-xl p-6 shadow-sm space-y-4">
        <h3 className="font-semibold text-foreground">基本資訊</h3>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-muted-foreground mb-1">行程標題</label>
            <input value={trip.title} onChange={(e) => update('title', e.target.value)} className="w-full px-3 py-2 rounded-lg border bg-background text-foreground text-sm outline-none focus:ring-1 focus:ring-ring" />
          </div>
          <div>
            <label className="block text-sm text-muted-foreground mb-1">封面圖片</label>
            <input ref={coverInputRef} type="file" accept="image/*" onChange={handleCoverUpload} className="hidden" />
            <button
              onClick={() => coverInputRef.current?.click()}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed bg-background text-muted-foreground text-sm hover:border-secondary hover:text-secondary transition-colors"
            >
              <Upload className="h-4 w-4" /> {trip.coverImage ? '重新上傳封面' : '上傳封面圖片'}
            </button>
          </div>
          <div>
            <label className="block text-sm text-muted-foreground mb-1">開始日期</label>
            <input type="date" value={trip.startDate} onChange={(e) => update('startDate', e.target.value)} className="w-full px-3 py-2 rounded-lg border bg-background text-foreground text-sm outline-none focus:ring-1 focus:ring-ring" />
          </div>
          <div>
            <label className="block text-sm text-muted-foreground mb-1">結束日期</label>
            <input type="date" value={trip.endDate} onChange={(e) => update('endDate', e.target.value)} className="w-full px-3 py-2 rounded-lg border bg-background text-foreground text-sm outline-none focus:ring-1 focus:ring-ring" />
          </div>
          <div>
            <label className="block text-sm text-muted-foreground mb-1">行程分類</label>
            <select value={trip.category} onChange={(e) => update('category', e.target.value as any)} className="w-full px-3 py-2 rounded-lg border bg-background text-foreground text-sm outline-none">
              <option value="domestic">國內旅遊</option>
              <option value="international">國外旅遊</option>
            </select>
          </div>
          <div>
            <label className="block text-sm text-muted-foreground mb-1">行程狀態</label>
            <select value={trip.status} onChange={(e) => update('status', e.target.value as any)} className="w-full px-3 py-2 rounded-lg border bg-background text-foreground text-sm outline-none">
              <option value="planning">規劃中</option>
              <option value="ongoing">進行中</option>
              <option value="completed">已完成</option>
            </select>
          </div>
        </div>
        {trip.coverImage && (
          <img src={trip.coverImage} alt="封面預覽" className="w-full max-w-md h-48 object-cover rounded-lg mt-2" />
        )}
      </div>

      {/* Section 2: Flights */}
      <div className="bg-card rounded-xl p-6 shadow-sm space-y-4">
        <h3 className="font-semibold text-foreground">航班資訊</h3>
        <div className="grid md:grid-cols-2 gap-6">
          {(['departure', 'return'] as const).map((dir) => (
            <div key={dir} className="space-y-3">
              <p className="text-sm font-medium text-secondary">{dir === 'departure' ? '去程' : '回程'}</p>
              {(['airline', 'flightNumber', 'departureAirport', 'arrivalAirport', 'departureTime', 'arrivalTime'] as const).map((field) => (
                <div key={field}>
                  <label className="block text-xs text-muted-foreground mb-1">
                    {{ airline: '航空公司', flightNumber: '航班編號', departureAirport: '出發機場', arrivalAirport: '抵達機場', departureTime: '出發時間', arrivalTime: '抵達時間' }[field]}
                  </label>
                  <input
                    value={(trip.flights[dir] as any)[field]}
                    onChange={(e) => updateFlight(dir, field, e.target.value)}
                    className="w-full px-3 py-1.5 rounded-md border bg-background text-foreground text-sm outline-none focus:ring-1 focus:ring-ring"
                  />
                </div>
              ))}
              <div>
                <label className="block text-xs text-muted-foreground mb-1">托運行李 (Kg)</label>
                <input
                  type="number"
                  value={trip.flights[dir].checkedBaggage || ''}
                  onChange={(e) => updateFlight(dir, 'checkedBaggage', Number(e.target.value))}
                  className="w-full px-3 py-1.5 rounded-md border bg-background text-foreground text-sm outline-none focus:ring-1 focus:ring-ring"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">隨身行李 (Kg)</label>
                <input
                  type="number"
                  value={trip.flights[dir].carryOnBaggage || ''}
                  onChange={(e) => updateFlight(dir, 'carryOnBaggage', Number(e.target.value))}
                  className="w-full px-3 py-1.5 rounded-md border bg-background text-foreground text-sm outline-none focus:ring-1 focus:ring-ring"
                  placeholder="0"
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Hotels */}
      <div className="bg-card rounded-xl p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-foreground">住宿資訊</h3>
          <button onClick={addHotel} className="flex items-center gap-1 text-sm text-action hover:text-action/80">
            <Plus className="h-4 w-4" /> 新增
          </button>
        </div>
        {trip.hotels.map((hotel) => (
          <div key={hotel.id} className="grid md:grid-cols-4 gap-3 p-3 rounded-lg bg-muted/50 relative">
            <input value={hotel.name} onChange={(e) => updateHotel(hotel.id, 'name', e.target.value)} placeholder="飯店名稱" className="px-2 py-1.5 rounded border bg-background text-foreground text-sm outline-none" />
            <input type="date" value={hotel.checkIn} onChange={(e) => updateHotel(hotel.id, 'checkIn', e.target.value)} className="px-2 py-1.5 rounded border bg-background text-foreground text-sm outline-none" />
            <input type="date" value={hotel.checkOut} onChange={(e) => updateHotel(hotel.id, 'checkOut', e.target.value)} className="px-2 py-1.5 rounded border bg-background text-foreground text-sm outline-none" />
            <div className="flex gap-2 min-w-0">
              <input value={hotel.address} onChange={(e) => updateHotel(hotel.id, 'address', e.target.value)} placeholder="Google Map URL" className="flex-1 min-w-0 px-2 py-1.5 rounded border bg-background text-foreground text-sm outline-none overflow-hidden" onWheel={(e) => { e.currentTarget.scrollLeft += e.deltaY; e.preventDefault(); }} />
              <button onClick={() => update('hotels', trip.hotels.filter((h) => h.id !== hotel.id))} className="text-destructive shrink-0">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Section 3: Daily Itineraries */}
      <div className="bg-card rounded-xl p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-foreground">每日行程</h3>
          <button onClick={addDay} className="flex items-center gap-1 text-sm text-action hover:text-action/80">
            <Plus className="h-4 w-4" /> 新增日期
          </button>
        </div>
        <div className="flex gap-6 overflow-x-auto pb-4" style={{ scrollbarWidth: 'thin' }}>
          {trip.dailyItineraries.map((day, dayIdx) => (
            <div
              key={dayIdx}
              className="flex-shrink-0 w-72"
              draggable
              onDragStart={() => handleDayDragStart(dayIdx)}
              onDragOver={(e) => handleDayDragOver(e, dayIdx)}
              onDrop={handleDayDrop}
            >
              <div className="bg-table-header text-table-header-foreground rounded-t-lg px-4 py-2 text-sm font-medium text-center flex items-center gap-2 cursor-grab active:cursor-grabbing">
                <GripVertical className="h-4 w-4 shrink-0 opacity-60" />
                <input
                  type="date"
                  value={day.date}
                  onChange={(e) => updateDayDate(dayIdx, e.target.value)}
                  className="bg-transparent text-table-header-foreground text-sm font-medium text-center outline-none border-none flex-1 cursor-pointer"
                />
                <button
                  onClick={() => update('dailyItineraries', trip.dailyItineraries.filter((_, i) => i !== dayIdx))}
                  className="w-5 h-5 rounded-full border border-table-header-foreground/50 text-table-header-foreground/80 hover:bg-destructive hover:border-destructive hover:text-destructive-foreground flex items-center justify-center transition-colors shrink-0"
                  title="刪除此日期"
                >
                  <span className="text-sm font-bold leading-none">−</span>
                </button>
              </div>
              <div
                className="space-y-3 mt-3 overflow-y-auto max-h-[680px] pr-1"
                style={{ scrollbarWidth: 'thin' }}
                onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); dragOverActivity.current = { dayIdx, actIdx: day.activities.length }; }}
                onDrop={(e) => { e.stopPropagation(); handleActivityDrop(e); }}
              >
                {day.activities.map((act, actIdx) => (
                  <div
                    key={act.id}
                    className="bg-muted/50 rounded-lg p-3 space-y-2 text-sm border-2 border-transparent hover:border-secondary/20 transition-colors"
                    draggable
                    onDragStart={(e) => { e.stopPropagation(); handleActivityDragStart(dayIdx, actIdx); }}
                    onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); dragOverActivity.current = { dayIdx, actIdx }; }}
                    onDrop={(e) => { e.stopPropagation(); handleActivityDrop(e); }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1 cursor-grab active:cursor-grabbing">
                        <GripVertical className="h-4 w-4 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">活動卡片</span>
                      </div>
                      <button
                        onClick={() => deleteActivity(dayIdx, act.id)}
                        className="w-5 h-5 rounded-full border border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground flex items-center justify-center transition-colors"
                        title="刪除卡片"
                      >
                        <span className="text-sm font-bold leading-none">−</span>
                      </button>
                    </div>
                    <input value={act.title} onChange={(e) => updateActivity(dayIdx, act.id, 'title', e.target.value)} placeholder="標題" className="w-full px-2 py-1 rounded border bg-background text-foreground outline-none text-sm" />
                    <input value={act.address} onChange={(e) => updateActivity(dayIdx, act.id, 'address', e.target.value)} placeholder="Google Map URL" className="w-full px-2 py-1 rounded border bg-background text-foreground outline-none text-sm" onWheel={(e) => { e.currentTarget.scrollLeft += e.deltaY; e.preventDefault(); }} />
                    <div>
                      <input type="file" accept="image/*" onChange={(e) => handleActivityImageUpload(dayIdx, act.id, e)} className="hidden" id={`act-img-${act.id}`} />
                      <label htmlFor={`act-img-${act.id}`} className="w-full flex items-center gap-1 px-2 py-1 rounded border border-dashed bg-background text-muted-foreground text-sm cursor-pointer hover:border-secondary hover:text-secondary transition-colors">
                        <Upload className="h-3.5 w-3.5" /> {act.coverImage ? '重新上傳圖片' : '上傳封面圖片'}
                      </label>
                      {act.coverImage && <img src={act.coverImage} alt="" className="mt-1 w-full h-20 object-cover rounded" />}
                    </div>
                    <select value={act.type} onChange={(e) => updateActivity(dayIdx, act.id, 'type', e.target.value)} className="w-full px-2 py-1 rounded border bg-background text-foreground text-sm">
                      <option>景點</option><option>美食</option><option>購物</option><option>交通</option><option>其他</option>
                    </select>
                    <textarea value={act.notes} onChange={(e) => updateActivity(dayIdx, act.id, 'notes', e.target.value)} placeholder="備註 (支援HTML)" rows={2} className="w-full px-2 py-1 rounded border bg-background text-foreground outline-none text-sm" />
                  </div>
                ))}
                <button onClick={() => addActivity(dayIdx)} className="w-full py-2 rounded-lg border-2 border-dashed border-border text-muted-foreground text-sm hover:border-action hover:text-action transition-colors flex items-center justify-center gap-1">
                  <Plus className="h-4 w-4" /> 新增卡片
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Section 3.5: Todos */}
      <div className="bg-card rounded-xl p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-foreground">待辦事項</h3>
          {showTodoInput ? null : (
            <button
              type="button"
              onClick={() => setShowTodoInput(true)}
              className="flex items-center gap-1 text-sm text-action hover:text-action/80"
            >
              <Plus className="h-4 w-4" /> 新增待辦
            </button>
          )}
        </div>

        <div className="space-y-2">
          {trip.todos.length === 0 && (
            <p className="text-sm text-muted-foreground">尚未新增待辦事項</p>
          )}

          {trip.todos.map((todo) => (
            <div key={todo.id} className="flex items-start gap-3">
              <button
                type="button"
                onClick={() => toggleTodo(todo.id)}
                className={`w-5 h-5 mt-0.5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                  todo.checked ? 'bg-secondary border-secondary' : 'border-border hover:border-secondary'
                }`}
              >
                {todo.checked && <Check className="h-3 w-3 text-secondary-foreground" />}
              </button>
              <div className="min-w-0 flex-1">
                <div className={`text-sm ${todo.checked ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                  {todo.text}
                </div>
                {todo.remindTime && (
                  <div className={`text-xs mt-1 ${todo.checked ? 'text-muted-foreground/70' : 'text-muted-foreground'}`}>
                    提醒：{formatDateTimeZhTw(todo.remindTime)}
                  </div>
                )}
              </div>
            </div>
          ))}

          {showTodoInput && (
            <div className="flex items-center gap-2 flex-wrap pt-2">
              <input
                autoFocus
                value={newTodo}
                onChange={(e) => setNewTodo(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addTodo()}
                placeholder="輸入待辦事項..."
                className="flex-1 min-w-[160px] text-sm px-3 py-1.5 rounded-md border bg-background text-foreground outline-none focus:ring-1 focus:ring-ring"
              />

              <input
                type="datetime-local"
                value={newTodoDueAt}
                onChange={(e) => setNewTodoDueAt(e.target.value)}
                className="text-sm px-3 py-1.5 rounded-md border bg-background text-foreground outline-none focus:ring-1 focus:ring-ring"
              />

              <select
                value={newTodoRemindOffsetMinutes}
                onChange={(e) => setNewTodoRemindOffsetMinutes(Number(e.target.value))}
                className="text-sm px-3 py-1.5 rounded-md border bg-background text-foreground outline-none focus:ring-1 focus:ring-ring"
              >
                {remindOffsetOptions.map((opt) => (
                  <option key={opt.minutes} value={opt.minutes}>
                    {opt.label}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={addTodo}
                className="px-3 py-1.5 text-sm rounded-md bg-action text-action-foreground hover:bg-action/90"
              >
                新增
              </button>

              <button
                type="button"
                onClick={() => setShowTodoInput(false)}
                className="text-muted-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Section 4: Luggage, Shopping & Participants（按鈕樣式與前台 TripDetail 一致） */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <button
          type="button"
          onClick={() => setLuggageOpen(true)}
          className="bg-card rounded-xl p-8 shadow-sm hover:shadow-md transition-shadow flex flex-col items-center gap-3 group"
        >
          <Luggage className="h-10 w-10 text-secondary group-hover:scale-110 transition-transform" />
          <span className="font-medium text-foreground">行李清單</span>
        </button>
        <button
          type="button"
          onClick={() => setShoppingOpen(true)}
          className="bg-card rounded-xl p-8 shadow-sm hover:shadow-md transition-shadow flex flex-col items-center gap-3 group"
        >
          <ShoppingCart className="h-10 w-10 text-secondary group-hover:scale-110 transition-transform" />
          <span className="font-medium text-foreground">採購清單</span>
        </button>
        <button
          type="button"
          onClick={() => !isNewTrip && setParticipantsOpen(true)}
          disabled={isNewTrip}
          className="bg-card rounded-xl p-8 shadow-sm hover:shadow-md transition-shadow flex flex-col items-center gap-3 group disabled:pointer-events-none disabled:opacity-50 disabled:hover:shadow-sm"
        >
          <Users className="h-10 w-10 text-secondary group-hover:scale-110 transition-transform" />
          <span className="font-medium text-foreground">行程成員</span>
          {isNewTrip && (
            <span className="text-xs text-muted-foreground text-center -mt-1">請先儲存行程後再管理</span>
          )}
        </button>
      </div>
        </TabsContent>

        <TabsContent value="expenses" className="mt-6">
          <TripExpensesPanel tripId={trip.id} disabled={isNewTrip} />
        </TabsContent>
      </Tabs>

      {/* Modals */}
      <LuggageModal
        open={luggageOpen}
        onClose={() => setLuggageOpen(false)}
        tripId={trip.id}
        luggageList={trip.luggageList}
        onUpdate={(list) => update('luggageList', list)}
      />
      <ShoppingModal
        open={shoppingOpen}
        onClose={() => setShoppingOpen(false)}
        tripId={trip.id}
        shoppingList={trip.shoppingList}
        onUpdate={(list) => update('shoppingList', list)}
      />
      <ManageParticipants tripId={trip.id} open={participantsOpen} onOpenChange={setParticipantsOpen} />
    </div>
  );
};

export default TripEditor;
