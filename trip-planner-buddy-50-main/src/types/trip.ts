export interface Trip {
  id: string;
  title: string;
  coverImage: string;
  startDate: string;
  endDate: string;
  category: 'domestic' | 'international';
  status: 'planning' | 'ongoing' | 'completed';
  todos: TodoItem[];
  flights: FlightInfo;
  hotels: HotelInfo[];
  dailyItineraries: DailyItinerary[];
  luggageList: LuggageCategory[];
  shoppingList: ShoppingItem[];
  otherNotes: string;
}

export interface TodoItem {
  id: string;
  text: string;
  checked: boolean;
}

export interface FlightInfo {
  departure: FlightDetail;
  return: FlightDetail;
}

export interface FlightDetail {
  airline: string;
  flightNumber: string;
  departureTime: string;
  arrivalTime: string;
  departureAirport: string;
  arrivalAirport: string;
  checkedBaggage: number;
  carryOnBaggage: number;
}

export interface HotelInfo {
  id: string;
  name: string;
  checkIn: string;
  checkOut: string;
  address: string;
  confirmationNumber: string;
}

export interface DailyItinerary {
  date: string;
  activities: ActivityCard[];
}

export interface ActivityCard {
  id: string;
  coverImage: string;
  title: string;
  type: string;
  address: string;
  notes: string;
  price: number;
  payers: string;
  members: string;
  memberCount: number;
  amountPerPerson: number;
  settlementStatus: 'unsettled' | 'settled';
  receipts: string[];
}

export interface LuggageCategory {
  id: string;
  name: string;
  items: LuggageItem[];
}

export interface LuggageItem {
  id: string;
  text: string;
  checked: boolean;
}

export interface ShoppingItem {
  id: string;
  status: 'incomplete' | 'complete';
  name: string;
  location: string;
  price: number;
}

export interface CarouselSlide {
  id: string;
  imageUrl: string;
  title?: string;
}

export interface AdminUser {
  username: string;
  password: string;
}
