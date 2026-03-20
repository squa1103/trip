-- 在 Supabase Dashboard → SQL Editor 執行此檔，修正 homepage-media 的 RLS，讓已登入後台可上傳 LOGO/影片
-- 先建立 bucket：Storage → New bucket → 名稱 homepage-media，勾選 Public

-- 若已建立過同名 policy 會報錯，先刪除再建立
drop policy if exists "Public read homepage-media" on storage.objects;
drop policy if exists "Auth insert homepage-media" on storage.objects;
drop policy if exists "Auth update homepage-media" on storage.objects;
drop policy if exists "Auth delete homepage-media" on storage.objects;

-- 所有人可讀（前台顯示影片、LOGO）
create policy "Public read homepage-media"
  on storage.objects for select
  using (bucket_id = 'homepage-media');

-- 已登入使用者可上傳
create policy "Auth insert homepage-media"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'homepage-media');

-- 已登入使用者可更新
create policy "Auth update homepage-media"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'homepage-media');

-- 已登入使用者可刪除
create policy "Auth delete homepage-media"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'homepage-media');
