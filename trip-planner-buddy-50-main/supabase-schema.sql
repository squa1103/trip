-- Run this in your Supabase project's SQL Editor

-- Enable UUID extension (already enabled by default in Supabase)
-- create extension if not exists "uuid-ossp";

create table if not exists trips (
  id            uuid primary key default gen_random_uuid(),
  title         text not null default '',
  cover_image   text not null default '',
  start_date    text not null default '',
  end_date      text not null default '',
  category      text not null default 'domestic' check (category in ('domestic', 'international')),
  status        text not null default 'planning' check (status in ('planning', 'ongoing', 'completed')),
  todos         jsonb not null default '[]',
  flights       jsonb not null default '{"departure":{},"return":{}}',
  hotels        jsonb not null default '[]',
  daily_itineraries jsonb not null default '[]',
  luggage_list  jsonb not null default '[]',
  shopping_list jsonb not null default '[]',
  other_notes   text not null default '',
  weather_cities jsonb not null default '[]',
  created_at    timestamptz not null default now()
);

-- Allow anyone to read trips (public front-end)
alter table trips enable row level security;

create policy "Public read trips"
  on trips for select
  using (true);

-- Authenticated users (admins) can insert & delete
create policy "Auth users can insert trips"
  on trips for insert
  with check (auth.role() = 'authenticated');

-- Anyone can update trips (front-end edits: todos, shopping, luggage, etc.)
create policy "Public update trips"
  on trips for update
  using (true);

create policy "Auth users can delete trips"
  on trips for delete
  using (auth.role() = 'authenticated');

-- 分帳（trip_participants / expenses / expense_splits）：請另執行專案根目錄
-- supabase-expenses-split-tables.sql（需在本檔 trips 表已建立後執行）。
