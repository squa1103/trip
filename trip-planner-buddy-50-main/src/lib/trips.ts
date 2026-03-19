import { supabase } from './supabase';
import { Trip } from '@/types/trip';

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
  };
}

export async function fetchTrips(): Promise<Trip[]> {
  const { data, error } = await supabase
    .from('trips')
    .select('*')
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
  const row = tripToRow(trip);
  const { data, error } = await supabase
    .from('trips')
    .insert(row)
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

export async function deleteTrip(id: string): Promise<void> {
  const { error } = await supabase.from('trips').delete().eq('id', id);
  if (error) throw error;
}
