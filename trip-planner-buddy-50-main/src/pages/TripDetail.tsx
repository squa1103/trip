import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Plus, Plane, Hotel, Luggage, ShoppingCart, X, ExternalLink, Check } from 'lucide-react';
import { Trip, ActivityCard as ActivityCardType, TodoItem, LuggageCategory, ShoppingItem } from '@/types/trip';
import Header from '@/components/Header';
import ActivityDetailModal from '@/components/trip/ActivityDetailModal';
import LuggageModal from '@/components/trip/LuggageModal';
import ShoppingModal from '@/components/trip/ShoppingModal';
import { fetchTripById, updateTrip, updateTripLists } from '@/lib/trips';

const TripDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: trip, isLoading, isError } = useQuery({
    queryKey: ['trip', id],
    queryFn: () => fetchTripById(id!),
    enabled: !!id,
  });

  const mutation = useMutation({
    mutationFn: updateTrip,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trips'] });
    },
  });

  const listsMutation = useMutation({
    mutationFn: ({ luggageList, shoppingList }: { luggageList: LuggageCategory[]; shoppingList: ShoppingItem[] }) =>
      updateTripLists(id!, luggageList, shoppingList),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trips'] });
    },
  });

  const [selectedActivity, setSelectedActivity] = useState<ActivityCardType | null>(null);
  const [luggageOpen, setLuggageOpen] = useState(false);
  const [shoppingOpen, setShoppingOpen] = useState(false);
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [newTodo, setNewTodo] = useState('');
  const [showTodoInput, setShowTodoInput] = useState(false);

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (trip) {
      setTodos(trip.todos);
    }
  }, [trip]);

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, []);

  const scheduleSave = useCallback(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      const latest = queryClient.getQueryData<Trip>(['trip', id]);
      if (latest) listsMutation.mutate({ luggageList: latest.luggageList, shoppingList: latest.shoppingList });
      saveTimerRef.current = null;
    }, 600);
  }, [queryClient, id, listsMutation]);

  const flushSave = useCallback(() => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
      const latest = queryClient.getQueryData<Trip>(['trip', id]);
      if (latest) listsMutation.mutate({ luggageList: latest.luggageList, shoppingList: latest.shoppingList });
    }
  }, [queryClient, id, listsMutation]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">載入中...</p>
      </div>
    );
  }

  if (isError || !trip) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">找不到此行程</p>
      </div>
    );
  }

  const toggleTodo = (todoId: string) => {
    const next = todos.map((t) => (t.id === todoId ? { ...t, checked: !t.checked } : t));
    setTodos(next);
    mutation.mutate({ ...trip, todos: next });
  };

  const addTodo = () => {
    if (!newTodo.trim()) return;
    const next = [...todos, { id: Date.now().toString(), text: newTodo.trim(), checked: false }];
    setTodos(next);
    setNewTodo('');
    setShowTodoInput(false);
    mutation.mutate({ ...trip, todos: next });
  };

  const handleLuggageUpdate = (next: LuggageCategory[]) => {
    queryClient.setQueryData<Trip>(['trip', id], (old) =>
      old ? { ...old, luggageList: next } : old
    );
    scheduleSave();
  };

  const handleShoppingUpdate = (next: ShoppingItem[]) => {
    queryClient.setQueryData<Trip>(['trip', id], (old) =>
      old ? { ...old, shoppingList: next } : old
    );
    scheduleSave();
  };

  const renderAddress = (address: string) => {
    if (!address) return null;
    const isUrl = address.startsWith('http');
    if (isUrl) {
      return (
        <a href={address} target="_blank" rel="noopener noreferrer" className="text-xs text-secondary hover:underline flex items-center gap-1 truncate">
          查看地圖 <ExternalLink className="h-3 w-3 shrink-0" />
        </a>
      );
    }
    return <p className="text-xs text-muted-foreground truncate">{address}</p>;
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Cover */}
      <div className="relative">
        <img src={trip.coverImage} alt={trip.title} className="w-full h-64 md:h-96 object-cover" />
        <div className="absolute inset-0 bg-hero-overlay" />
        <button
          onClick={() => navigate(-1)}
          className="absolute top-4 left-4 w-10 h-10 rounded-full bg-primary/50 text-primary-foreground flex items-center justify-center hover:bg-primary/70 transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="absolute bottom-6 left-6 md:left-12">
          <h1 className="text-2xl md:text-4xl font-bold text-primary-foreground drop-shadow-lg">{trip.title}</h1>
          <p className="text-primary-foreground/80 mt-1">{trip.startDate} ~ {trip.endDate}</p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 space-y-10">
        {/* Todos */}
        <div className="bg-card rounded-xl p-6 shadow-sm">
          <h3 className="font-semibold text-foreground mb-4">待辦事項</h3>
          <div className="space-y-2">
            {todos.map((todo) => (
              <label key={todo.id} className="flex items-center gap-3 cursor-pointer group">
                <button
                  onClick={() => toggleTodo(todo.id)}
                  className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                    todo.checked ? 'bg-secondary border-secondary' : 'border-border hover:border-secondary'
                  }`}
                >
                  {todo.checked && <Check className="h-3 w-3 text-secondary-foreground" />}
                </button>
                <span className={`text-sm ${todo.checked ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                  {todo.text}
                </span>
              </label>
            ))}
            {showTodoInput ? (
              <div className="flex items-center gap-2 mt-2">
                <input
                  autoFocus
                  value={newTodo}
                  onChange={(e) => setNewTodo(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addTodo()}
                  placeholder="輸入待辦事項..."
                  className="flex-1 text-sm px-3 py-1.5 rounded-md border bg-background text-foreground outline-none focus:ring-1 focus:ring-ring"
                />
                <button onClick={addTodo} className="px-3 py-1.5 text-sm rounded-md bg-secondary text-secondary-foreground">新增</button>
                <button onClick={() => setShowTodoInput(false)} className="text-muted-foreground"><X className="h-4 w-4" /></button>
              </div>
            ) : (
              <button
                onClick={() => setShowTodoInput(true)}
                className="flex items-center gap-1 text-sm text-muted-foreground/60 hover:text-secondary transition-colors mt-2"
              >
                <Plus className="h-4 w-4" /> 新增待辦事項
              </button>
            )}
          </div>
        </div>

        {/* Flights & Hotels */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Flights */}
          <div className="bg-card rounded-xl p-6 shadow-sm">
            <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
              <Plane className="h-5 w-5 text-secondary" /> 航班資訊
            </h3>
            <div className="grid grid-cols-2 gap-4">
              {(['departure', 'return'] as const).map((dir) => (
                <div key={dir}>
                  <p className="text-xs text-muted-foreground mb-2 uppercase tracking-wide">{dir === 'departure' ? '去程' : '回程'}</p>
                  {trip.flights[dir].airline ? (
                    <div className="space-y-1 text-sm">
                      <p className="font-medium text-foreground">{trip.flights[dir].airline} {trip.flights[dir].flightNumber}</p>
                      <p className="text-muted-foreground">{trip.flights[dir].departureAirport}</p>
                      <p className="text-muted-foreground">→ {trip.flights[dir].arrivalAirport}</p>
                      <p className="text-secondary font-medium">{trip.flights[dir].departureTime}</p>
                      {(trip.flights[dir].checkedBaggage > 0 || trip.flights[dir].carryOnBaggage > 0) && (
                        <div className="mt-2 space-y-0.5 text-xs text-muted-foreground">
                          {trip.flights[dir].checkedBaggage > 0 && <p>托運行李：{trip.flights[dir].checkedBaggage} Kg</p>}
                          {trip.flights[dir].carryOnBaggage > 0 && <p>隨身行李：{trip.flights[dir].carryOnBaggage} Kg</p>}
                        </div>
                      )}
                    </div>
                  ) : <p className="text-sm text-muted-foreground">尚未設定</p>}
                </div>
              ))}
            </div>
          </div>

          {/* Hotels */}
          <div className="bg-card rounded-xl p-6 shadow-sm">
            <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
              <Hotel className="h-5 w-5 text-secondary" /> 住宿資訊
            </h3>
            {trip.hotels.length === 0 ? (
              <p className="text-sm text-muted-foreground">尚未設定</p>
            ) : (
              <div className="space-y-3">
                {trip.hotels.map((hotel) => (
                  <div key={hotel.id} className="p-3 rounded-lg bg-muted/50">
                    <p className="font-medium text-foreground text-sm">{hotel.name}</p>
                    <p className="text-xs text-muted-foreground mt-1">{hotel.checkIn} ~ {hotel.checkOut}</p>
                    {hotel.address && (
                      hotel.address.startsWith('http') ? (
                        <a href={hotel.address} target="_blank" rel="noopener noreferrer" className="text-xs text-secondary hover:underline flex items-center gap-1 mt-1">
                          查看地圖 <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : (
                        <p className="text-xs text-muted-foreground">{hotel.address}</p>
                      )
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Daily Itineraries */}
        <div className="bg-card rounded-xl p-6 shadow-sm">
          <h3 className="font-semibold text-foreground mb-4">每日行程</h3>
          {trip.dailyItineraries.length === 0 ? (
            <p className="text-sm text-muted-foreground">尚未設定行程</p>
          ) : (
            <div className="flex gap-6 overflow-x-auto scrollbar-hide pb-4">
              {trip.dailyItineraries.map((day) => (
                <div key={day.date} className="flex-shrink-0 w-64">
                  <div className="sticky top-0 bg-secondary text-secondary-foreground rounded-t-lg px-4 py-2 text-sm font-medium text-center">
                    {new Date(day.date).toLocaleDateString('zh-TW', { month: '2-digit', day: '2-digit', weekday: 'short' })}
                  </div>
                  <div className="space-y-3 mt-3">
                    {day.activities.map((activity) => (
                      <button
                        key={activity.id}
                        onClick={() => setSelectedActivity(activity)}
                        className="w-full text-left bg-muted/50 rounded-lg overflow-hidden hover:shadow-md transition-shadow group"
                      >
                        {activity.coverImage && (
                          <img src={activity.coverImage} alt={activity.title} className="w-full h-32 object-cover group-hover:scale-105 transition-transform duration-300" />
                        )}
                        <div className="p-3">
                          <p className="font-medium text-foreground text-sm truncate">{activity.title}</p>
                          <span className="inline-block mt-1 px-2 py-0.5 bg-secondary/20 text-secondary text-xs rounded-full">{activity.type}</span>
                          <div className="mt-1">{renderAddress(activity.address)}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Luggage & Shopping */}
        <div className="grid grid-cols-2 gap-6">
          <button
            onClick={() => setLuggageOpen(true)}
            className="bg-card rounded-xl p-8 shadow-sm hover:shadow-md transition-shadow flex flex-col items-center gap-3 group"
          >
            <Luggage className="h-10 w-10 text-secondary group-hover:scale-110 transition-transform" />
            <span className="font-medium text-foreground">行李清單</span>
          </button>
          <button
            onClick={() => setShoppingOpen(true)}
            className="bg-card rounded-xl p-8 shadow-sm hover:shadow-md transition-shadow flex flex-col items-center gap-3 group"
          >
            <ShoppingCart className="h-10 w-10 text-secondary group-hover:scale-110 transition-transform" />
            <span className="font-medium text-foreground">採購清單</span>
          </button>
        </div>

        {/* Section 5: Other notes */}
        {trip.otherNotes && (
          <div className="bg-card rounded-xl p-6 shadow-sm">
            <h3 className="font-semibold text-foreground mb-4">其他</h3>
            <div className="text-sm text-muted-foreground" dangerouslySetInnerHTML={{ __html: trip.otherNotes }} />
          </div>
        )}
      </div>

      {/* Modals */}
      {selectedActivity && (
        <ActivityDetailModal activity={selectedActivity} onClose={() => setSelectedActivity(null)} />
      )}
      <LuggageModal
        open={luggageOpen}
        onClose={() => { flushSave(); setLuggageOpen(false); }}
        luggageList={trip.luggageList}
        onUpdate={handleLuggageUpdate}
      />
      <ShoppingModal
        open={shoppingOpen}
        onClose={() => { flushSave(); setShoppingOpen(false); }}
        shoppingList={trip.shoppingList}
        onUpdate={handleShoppingUpdate}
      />
    </div>
  );
};

export default TripDetail;
