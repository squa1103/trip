-- 既有 Supabase 專案：在 trips 表新增天氣追蹤城市清單（JSONB 字串陣列）
-- 於 SQL Editor 執行一次即可

alter table public.trips
  add column if not exists weather_cities jsonb not null default '[]';
