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
  /** 追蹤天氣的城市字串（建議格式：名稱, 國碼，如 Taipei, TW） */
  weatherCities: string[];
}

export interface TodoItem {
  id: string;
  text: string;
  checked: boolean;
  /** 事項／截止時間（選填，僅顯示用；未設定則為 null） */
  dueAt?: string | null;
  /** ISO string; 僅在設定提醒時寫入（dueAt - remindOffset），有值才會觸發通知 */
  remindTime?: string | null;
  /** minutes; 例如 60 表示「1小時前」提醒；未設定則為 null */
  remindOffset?: number | null;
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
  /** 專屬成員；舊資料未填時前端視為第一位成員 */
  participantId?: string;
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
  /** 專屬成員；舊資料未填時前端視為第一位成員 */
  participantId?: string;
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
