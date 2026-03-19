# Edge Function: admin-auth

後台帳號管理（列出/新增/改密碼/刪除使用者）改由此 Edge Function 執行，**service_role key 僅存在 Supabase 伺服端**，不會暴露在前端。

## 部署

1. 安裝 [Supabase CLI](https://supabase.com/docs/guides/cli) 並登入：
   ```bash
   npx supabase login
   ```

2. 連結專案（若尚未連結）：
   ```bash
   npx supabase link --project-ref 你的專案 ref
   ```
   （專案 ref 在 Dashboard → Project Settings → General → Reference ID）

3. 設定 Edge Function 的 Secret（**必做**，否則會出現 Invalid API key）：
   - 到 [Supabase Dashboard](https://supabase.com/dashboard) → 左側 **Edge Functions** ⚡ → **Secrets**
   - 新增一筆：Name = `SERVICE_ROLE_KEY`（不可用 SUPABASE_ 開頭），Value = 你的 **service_role** key（Project Settings → API → service_role）

4. 部署此 function：
   ```bash
   npx supabase functions deploy admin-auth
   ```

部署完成後，前端會呼叫 `https://<你的專案>.supabase.co/functions/v1/admin-auth`，無需在前端或 GitHub Secrets 裡放 service_role key。
