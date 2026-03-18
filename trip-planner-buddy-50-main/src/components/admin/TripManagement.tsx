import { useState } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { mockTrips } from '@/data/mockData';
import { Trip } from '@/types/trip';
import TripEditor from '@/components/admin/TripEditor';

const TripManagement = () => {
  const [trips, setTrips] = useState<Trip[]>(mockTrips);
  const [editingTrip, setEditingTrip] = useState<Trip | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const createNewTrip = (): Trip => ({
    id: Date.now().toString(),
    title: '',
    coverImage: '',
    startDate: '',
    endDate: '',
    category: 'domestic',
    status: 'planning',
    todos: [],
    flights: {
      departure: { airline: '', flightNumber: '', departureTime: '', arrivalTime: '', departureAirport: '', arrivalAirport: '', checkedBaggage: 0, carryOnBaggage: 0 },
      return: { airline: '', flightNumber: '', departureTime: '', arrivalTime: '', departureAirport: '', arrivalAirport: '', checkedBaggage: 0, carryOnBaggage: 0 },
    },
    hotels: [],
    dailyItineraries: [],
    luggageList: [],
    shoppingList: [],
    otherNotes: '',
  });

  const handleNew = () => {
    setEditingTrip(createNewTrip());
    setIsCreating(true);
  };

  const handleSave = (trip: Trip) => {
    if (isCreating) {
      setTrips((prev) => [...prev, trip]);
    } else {
      setTrips((prev) => prev.map((t) => (t.id === trip.id ? trip : t)));
    }
    setEditingTrip(null);
    setIsCreating(false);
  };

  const handleDelete = (id: string) => {
    if (confirm('確定刪除此行程?')) {
      setTrips((prev) => prev.filter((t) => t.id !== id));
    }
  };

  if (editingTrip) {
    return <TripEditor trip={editingTrip} onSave={handleSave} onCancel={() => { setEditingTrip(null); setIsCreating(false); }} />;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <p className="text-muted-foreground text-sm">管理前台顯示之行程</p>
        <button onClick={handleNew} className="flex items-center gap-1 px-4 py-2 rounded-lg bg-secondary text-secondary-foreground text-sm font-medium hover:opacity-90">
          <Plus className="h-4 w-4" /> 新增行程
        </button>
      </div>

      <div className="bg-card rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="text-left px-4 py-3 text-muted-foreground font-medium">封面</th>
              <th className="text-left px-4 py-3 text-muted-foreground font-medium">標題</th>
              <th className="text-left px-4 py-3 text-muted-foreground font-medium">日期</th>
              <th className="text-left px-4 py-3 text-muted-foreground font-medium">分類</th>
              <th className="text-left px-4 py-3 text-muted-foreground font-medium">狀態</th>
              <th className="text-right px-4 py-3 text-muted-foreground font-medium w-24">操作</th>
            </tr>
          </thead>
          <tbody>
            {trips.map((trip) => (
              <tr key={trip.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                <td className="px-4 py-3">
                  {trip.coverImage ? (
                    <img src={trip.coverImage} alt="" className="w-16 h-10 rounded object-cover" />
                  ) : (
                    <div className="w-16 h-10 rounded bg-muted" />
                  )}
                </td>
                <td className="px-4 py-3 text-foreground font-medium">{trip.title || '(未命名)'}</td>
                <td className="px-4 py-3 text-muted-foreground">{trip.startDate} ~ {trip.endDate}</td>
                <td className="px-4 py-3">
                  <span className="px-2 py-0.5 rounded-full text-xs bg-muted text-muted-foreground">
                    {trip.category === 'domestic' ? '國內' : '國外'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs ${
                    trip.status === 'planning' ? 'bg-blue-100 text-blue-700' : trip.status === 'ongoing' ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'
                  }`}>
                    {trip.status === 'planning' ? '規劃中' : trip.status === 'ongoing' ? '進行中' : '已完成'}
                  </span>
                </td>
                <td className="px-4 py-3 text-right space-x-2">
                  <button onClick={() => setEditingTrip(trip)} className="text-secondary hover:text-secondary/80">
                    <Pencil className="h-4 w-4 inline" />
                  </button>
                  <button onClick={() => handleDelete(trip.id)} className="text-destructive hover:text-destructive/80">
                    <Trash2 className="h-4 w-4 inline" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TripManagement;
