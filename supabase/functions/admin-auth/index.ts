import { createClient } from 'jsr:@supabase/supabase-js@2'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Verify caller's JWT
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: '未授權：缺少 Authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const anonClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: { user: caller }, error: authError } = await anonClient.auth.getUser()
    if (authError || !caller) {
      return new Response(JSON.stringify({ error: '未授權：無效的 token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Use service role client for admin operations
    const adminClient = createClient(supabaseUrl, supabaseServiceKey)

    const body = await req.json()
    const { action } = body

    switch (action) {
      case 'listUsers': {
        const { data: { users }, error } = await adminClient.auth.admin.listUsers()
        if (error) throw error
        return new Response(
          JSON.stringify({
            users: users.map((u) => ({ id: u.id, email: u.email, created_at: u.created_at })),
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        )
      }

      case 'createUser': {
        const { email, password } = body
        if (!email || !password) {
          return new Response(JSON.stringify({ error: '缺少 email 或 password' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          })
        }
        const { data, error } = await adminClient.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
        })
        if (error) throw error
        return new Response(
          JSON.stringify({
            user: { id: data.user.id, email: data.user.email, created_at: data.user.created_at },
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        )
      }

      case 'updateUserPassword': {
        const { userId, password } = body
        if (!userId || !password) {
          return new Response(JSON.stringify({ error: '缺少 userId 或 password' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          })
        }
        const { data, error } = await adminClient.auth.admin.updateUserById(userId, { password })
        if (error) throw error
        return new Response(
          JSON.stringify({
            user: { id: data.user.id, email: data.user.email },
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        )
      }

      case 'deleteUser': {
        const { userId } = body
        if (!userId) {
          return new Response(JSON.stringify({ error: '缺少 userId' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          })
        }
        const { error } = await adminClient.auth.admin.deleteUser(userId)
        if (error) throw error
        return new Response(
          JSON.stringify({ ok: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        )
      }

      default:
        return new Response(JSON.stringify({ error: `未知的 action: ${action}` }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
    }
  } catch (error) {
    console.error('[admin-auth] Error:', error)
    return new Response(
      JSON.stringify({ error: error.message ?? String(error) }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }
})
