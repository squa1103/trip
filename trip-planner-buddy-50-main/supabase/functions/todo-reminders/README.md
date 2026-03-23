# todo-reminders

由 **pg_cron** 週期以 `pg_net.http_post` 呼叫。函式內使用 **Service Role** 查詢 `todo_reminders`、寫入 `notifications`、經 **Resend** 寄信。

## Secrets（Supabase Dashboard → Project Settings → Edge Functions）

| 名稱 | 說明 |
|------|------|
| `CRON_SECRET` | 長隨機字串；與 SQL `x-cron-secret` 標頭一致 |
| `RESEND_API_KEY` | Resend API Key |
| `RESEND_FROM` | （選用）例如 `你的名字 <noreply@yourdomain.com>`；未設則用 Resend 測試寄件人 |

若環境未自動提供 `SUPABASE_SERVICE_ROLE_KEY`，請與 `admin-auth` 相同方式設定 `SERVICE_ROLE_KEY`。

## 本機

```bash
supabase secrets set CRON_SECRET=xxx RESEND_API_KEY=re_xxx
supabase functions serve todo-reminders --no-verify-jwt
```

測試請帶標頭：`x-cron-secret: <與 CRON_SECRET 相同>`。
