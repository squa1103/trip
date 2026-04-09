import { supabase } from './supabase';
import { Trip, TodoItem, LuggageCategory, ShoppingItem } from '@/types/trip';

// Database row shape (snake_case)
export interface TripRow {
  id: string;
  title: string;
  cover_image: string;
  start_date: string;
  end_date: string;
  category: 'domestic' | 'international';
  status: 'planning' | 'ongoing' | 'completed';
  todos: Trip['todos'];
  flights: Trip['flights'];
  hotels: Trip['hotels'];
  daily_itineraries: Trip['dailyItineraries'];
  luggage_list: Trip['luggageList'];
  shopping_list: Trip['shoppingList'];
  other_notes: string;
  /** 舊 DB 尚未 migration 時可能缺此欄 */
  weather_cities?: Trip['weatherCities'];
  created_at?: string;
}

export function rowToTrip(row: TripRow): Trip {
  return {
    id: row.id,
    title: row.title,
    coverImage: row.cover_image,
    startDate: row.start_date,
    endDate: row.end_date,
    category: row.category,
    status: row.status,
    todos: row.todos ?? [],
    flights: row.flights ?? {
      departure: { airline: '', flightNumber: '', departureTime: '', arrivalTime: '', departureAirport: '', arrivalAirport: '', checkedBaggage: 0, carryOnBaggage: 0 },
      return: { airline: '', flightNumber: '', departureTime: '', arrivalTime: '', departureAirport: '', arrivalAirport: '', checkedBaggage: 0, carryOnBaggage: 0 },
    },
    hotels: row.hotels ?? [],
    dailyItineraries: row.daily_itineraries ?? [],
    luggageList: row.luggage_list ?? [],
    shoppingList: row.shopping_list ?? [],
    otherNotes: row.other_notes ?? '',
    weatherCities: row.weather_cities ?? [],
  };
}

export function tripToRow(trip: Trip): Omit<TripRow, 'created_at'> {
  return {
    id: trip.id,
    title: trip.title,
    cover_image: trip.coverImage,
    start_date: trip.startDate,
    end_date: trip.endDate,
    category: trip.category,
    status: trip.status,
    todos: trip.todos,
    flights: trip.flights,
    hotels: trip.hotels,
    daily_itineraries: trip.dailyItineraries,
    luggage_list: trip.luggageList,
    shopping_list: trip.shoppingList,
    other_notes: trip.otherNotes,
    weather_cities: trip.weatherCities,
  };
}

/**
 * Lightweight list query — intentionally excludes large JSONB columns
 * (daily_itineraries, todos, flights, hotels, weather_cities, other_notes)
 * to prevent OOM when trips contain embedded base64 receipt/activity images.
 * Full data is fetched on-demand via fetchTripById() when opening the editor.
 */
export async function fetchTrips(): Promise<Trip[]> {
  const { data, error } = await supabase
    .from('trips')
    .select('id,title,cover_image,start_date,end_date,category,status,luggage_list,shopping_list,created_at')
    .order('start_date', { ascending: false });
  if (error) throw error;
  return (data as TripRow[]).map(rowToTrip);
}

export async function fetchTripById(id: string): Promise<Trip | null> {
  const { data, error } = await supabase
    .from('trips')
    .select('*')
    .eq('id', id)
    .single();
  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  return rowToTrip(data as TripRow);
}

export async function createTrip(trip: Trip): Promise<Trip> {
  const { id: _clientId, ...insertRow } = tripToRow(trip);
  const { data, error } = await supabase
    .from('trips')
    .insert(insertRow)
    .select()
    .single();
  if (error) throw error;
  return rowToTrip(data as TripRow);
}

export async function updateTrip(trip: Trip): Promise<Trip> {
  const row = tripToRow(trip);
  const { data, error } = await supabase
    .from('trips')
    .update(row)
    .eq('id', trip.id)
    .select()
    .single();
  if (error) throw error;
  return rowToTrip(data as TripRow);
}

export async function updateTripLists(
  id: string,
  luggageList: LuggageCategory[],
  shoppingList: ShoppingItem[],
): Promise<void> {
  const { error } = await supabase
    .from('trips')
    .update({ luggage_list: luggageList, shopping_list: shoppingList })
    .eq('id', id)
    .select('id')
    .single();
  if (error) throw error;
}

export async function deleteTrip(id: string): Promise<void> {
  console.log(`[deleteTrip] 清除 todos 孤兒列 tripId=${id}`);
  await supabase.from('todos').delete().eq('trip_id', id);
  console.log(`[deleteTrip] 刪除行程 tripId=${id}`);
  const { error } = await supabase.from('trips').delete().eq('id', id);
  if (error) throw error;
}

// ─── todos 資料表（Email 提醒用） ────────────────────────────────────────────

/**
 * 新增一筆 todo 至獨立 todos 資料表，供 Email 自動提醒後端查詢。
 */
export async function insertTodoRow(tripId: string, todo: TodoItem): Promise<void> {
  if (!todo.remindTime) {
    console.log(`[insertTodoRow] todoId=${todo.id} 無 remindTime，跳過`);
    return;
  }

  const formattedTime = new Date(todo.remindTime).toISOString();
  console.log(`[insertTodoRow] 寫入 todoId=${todo.id} tripId=${tripId} remindTime=${formattedTime}`);

  const { error } = await supabase.from('todos').insert({
    id: todo.id,
    trip_id: tripId,
    task_name: todo.text,
    reminder_time: formattedTime,
  });

  if (error) {
    console.error(`[insertTodoRow] 寫入失敗 todoId=${todo.id}:`, error);
    throw error;
  }
  console.log(`[insertTodoRow] 成功 todoId=${todo.id}`);
}

/**
 * 從 todos 資料表刪除一筆 todo（已完成或已移除）。
 */
export async function deleteTodoRow(todoId: string): Promise<void> {
  console.log(`[deleteTodoRow] 刪除 todoId=${todoId}`);
  const { error } = await supabase.from('todos').delete().eq('id', todoId);
  if (error) {
    console.error(`[deleteTodoRow] 刪除失敗 todoId=${todoId}:`, error);
    throw error;
  }
  console.log(`[deleteTodoRow] 成功 todoId=${todoId}`);
}
