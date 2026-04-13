import { createClient } from 'jsr:@supabase/supabase-js@2'

const BREVO_API_KEY = Deno.env.get('BREVO_API_KEY')!
const BREVO_SENDER_EMAIL = Deno.env.get('BREVO_SENDER_EMAIL')!
const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

const MAX_RETRIES = 5

Deno.serve(async (req) => {
  // 驗證 cron secret，防止未授權呼叫
  const cronSecret = Deno.env.get('CRON_SECRET')
  if (cronSecret) {
    const requestSecret = req.headers.get('x-cron-secret')
    if (requestSecret !== cronSecret) {
      console.warn('[send-email] 未授權呼叫：x-cron-secret 不符')
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
    }
  }

  const triggeredAt = new Date().toISOString()

  // 判斷模式：retry_only=true 時只處理曾失敗的重試項目
  let retryOnly = false
  try {
    const body = await req.json()
    retryOnly = body?.retry_only === true
  } catch { /* 無 body 或解析失敗，預設為一般模式 */ }

  const mode = retryOnly ? '重試' : '一般'
  console.log(`[send-email] cron triggered at ${triggeredAt} | mode=${mode}`)

  // 每筆 todo 的處理紀錄，最後寫入 email_job_logs
  type DetailEntry = {
    todo_id: string
    task_name: string
    trip_title: string
    status: 'sent' | 'failed' | 'abandoned'
    retry_count: number
    error?: string
  }
  const details: DetailEntry[] = []

  try {
    // 1. 依模式撈出待發送的待辦
    //    一般模式：只撈首次發送（retry_count = 0）
    //    重試模式：只撈曾失敗的（retry_count > 0 且 < MAX_RETRIES）
    let query = supabase
      .from('todos')
      .select(`*, trips ( title ), trip_participants ( display_name, email )`)
      .lte('reminder_time', triggeredAt)
      .eq('is_notified', false)

    if (retryOnly) {
      query = query.gt('retry_count', 0).lt('retry_count', MAX_RETRIES)
    } else {
      query = query.eq('retry_count', 0)
    }

    const { data: todos, error: fetchError } = await query

    if (fetchError) {
      console.error('[send-email] 查詢 todos 失敗:', fetchError)
      throw fetchError
    }

    const totalFound = todos?.length ?? 0
    console.log(`[send-email] 查詢到 ${totalFound} 筆待發送`)

    if (!todos || todos.length === 0) {
      await writeJobLog(triggeredAt, 0, 0, [])
      return new Response(
        JSON.stringify({ triggered_at: triggeredAt, total_found: 0, sent_count: 0, details: [] }),
        { status: 200 }
      )
    }

    for (const todo of todos) {
      const tripTitle = todo.trips?.title || '未命名行程'
      const currentRetry = todo.retry_count ?? 0
      console.log(
        `[send-email] 處理 todo ${todo.id} | retry_count=${currentRetry} | task="${todo.task_name}" | trip="${tripTitle}"`
      )

      // 2. 解析收件人 email：直接從 trip_participants.email 取得
      const FALLBACK_EMAIL = 'wind7664891103@gmail.com'
      const participant = todo.trip_participants
      const recipientEmail = participant?.email || FALLBACK_EMAIL

      if (participant?.email) {
        console.log(`[send-email] 收件人: ${participant.display_name} <${recipientEmail}>`)
      } else {
        console.log(`[send-email] todo ${todo.id} 無指派參與者或無 email，使用預設 email`)
      }

      // 3. 發送 Email（Brevo API）
      const subject = `【提醒】${tripTitle} 的待辦：${todo.task_name}`
      const htmlContent = `<strong>時間到囉！</strong><br>您在行程「<strong>${tripTitle}</strong>」中設定的待辦事項「<strong>${todo.task_name}</strong>」已經到期了，請趕快去處理吧！`

      let emailError: { message: string } | null = null
      try {
        const brevoRes = await fetch('https://api.brevo.com/v3/smtp/email', {
          method: 'POST',
          headers: {
            'api-key': BREVO_API_KEY,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            sender: { name: 'Todo App', email: BREVO_SENDER_EMAIL },
            to: [{ email: recipientEmail }],
            subject,
            htmlContent,
          }),
        })
        if (!brevoRes.ok) {
          const errBody = await brevoRes.text()
          emailError = { message: `Brevo ${brevoRes.status}: ${errBody}` }
        }
      } catch (e) {
        emailError = { message: e.message ?? String(e) }
      }

      if (emailError) {
        const newCount = currentRetry + 1
        const giveUp = newCount >= MAX_RETRIES
        console.error(
          `[send-email] 發信失敗 todo ${todo.id} | 新 retry_count=${newCount}` +
          (giveUp ? ' | 已達上限，放棄重試' : ''),
          emailError
        )

        await supabase.from('todos').update({
          retry_count: newCount,
          ...(giveUp ? { is_notified: true } : {}),
        }).eq('id', todo.id)

        details.push({
          todo_id: todo.id,
          task_name: todo.task_name,
          trip_title: tripTitle,
          status: giveUp ? 'abandoned' : 'failed',
          retry_count: newCount,
          error: emailError.message ?? String(emailError),
        })
        continue
      }

      // 4. 發信成功
      console.log(`[send-email] 發信成功 todo ${todo.id}，更新 is_notified=true`)
      const { error: updateError } = await supabase
        .from('todos')
        .update({ is_notified: true })
        .eq('id', todo.id)

      if (updateError) {
        console.error(`[send-email] 更新 is_notified 失敗 todo ${todo.id}:`, updateError)
      }

      details.push({
        todo_id: todo.id,
        task_name: todo.task_name,
        trip_title: tripTitle,
        status: 'sent',
        retry_count: currentRetry,
      })
    }

    const sentCount = details.filter((d) => d.status === 'sent').length
    console.log(`[send-email] 完成 | 共 ${totalFound} 筆 | 成功 ${sentCount} 筆`)

    await writeJobLog(triggeredAt, totalFound, sentCount, details)

    return new Response(
      JSON.stringify({ triggered_at: triggeredAt, total_found: totalFound, sent_count: sentCount, details }),
      { status: 200 }
    )

  } catch (error) {
    console.error('[send-email] 未預期錯誤:', error)
    await writeJobLog(triggeredAt, 0, 0, [{
      todo_id: '',
      task_name: '',
      trip_title: '',
      status: 'failed',
      retry_count: 0,
      error: error.message ?? String(error),
    }])
    return new Response(JSON.stringify({ error: error.message }), { status: 400 })
  }
})

async function writeJobLog(
  triggeredAt: string,
  totalFound: number,
  sentCount: number,
  details: object[]
): Promise<void> {
  const { error } = await supabase.from('email_job_logs').insert({
    triggered_at: triggeredAt,
    total_found: totalFound,
    sent_count: sentCount,
    details,
  })
  if (error) {
    console.error('[send-email] 寫入 email_job_logs 失敗:', error)
  } else {
    console.log(`[send-email] job log 已寫入 triggered_at=${triggeredAt}`)
  }
}
