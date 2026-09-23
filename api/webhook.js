// api/webhook.js — Vercel Serverless Function
// Recebe webhook do Kiwify → insere comprador no Supabase
// Payload real do Kiwify mapeado via diagnóstico

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const body = req.body

    console.log('=== KIWIFY WEBHOOK ===')
    console.log('webhook_event_type:', body?.webhook_event_type)
    console.log('Customer.email:', body?.Customer?.email)
    console.log('Customer.full_name:', body?.Customer?.full_name)

    // ── Verificar evento ─────────────────────────────────────
    // Kiwify usa webhook_event_type (não "event")
    const evento = body?.webhook_event_type || ''

    if (evento && evento !== 'order_approved') {
      console.log('Evento ignorado:', evento)
      return res.status(200).json({ ok: true, msg: 'Evento ignorado: ' + evento })
    }

    // ── Extrair dados do payload real do Kiwify ──────────────
    // Email: body.Customer.email
    // Nome:  body.Customer.full_name
    const email = (body?.Customer?.email || '').toLowerCase().trim()
    const nome  = (body?.Customer?.full_name || body?.Customer?.first_name || '').trim()

    if (!email || !email.includes('@')) {
      console.log('Sem email válido no payload')
      return res.status(200).json({ ok: true, msg: 'Sem email no payload' })
    }

    // ── Inserir no Supabase ──────────────────────────────────
    const supabaseUrl = process.env.SUPABASE_URL
    const serviceKey  = process.env.SUPABASE_SERVICE_KEY

    if (!supabaseUrl || !serviceKey) {
      console.error('ERRO: variáveis de ambiente não configuradas!')
      return res.status(500).json({ error: 'Variáveis de ambiente não configuradas' })
    }

    const supabaseRes = await fetch(`${supabaseUrl}/rest/v1/compradores_shop`, {
      method: 'POST',
      headers: {
        'apikey':          serviceKey,
        'Authorization':   `Bearer ${serviceKey}`,
        'Content-Type':    'application/json',
        'Prefer':          'resolution=merge-duplicates',
      },
      body: JSON.stringify({
        email,
        nome:    nome || null,
        ativo:   true,
        origem:  'kiwify',
      }),
    })

    const resText = await supabaseRes.text()
    console.log('Supabase status:', supabaseRes.status, '| Resposta:', resText)

    if (!supabaseRes.ok) {
      throw new Error(`Supabase erro ${supabaseRes.status}: ${resText}`)
    }

    console.log('✅ Comprador inserido:', email, '|', nome)
    return res.status(200).json({ success: true, email })

  } catch (err) {
    console.error('ERRO GERAL:', err.message)
    return res.status(500).json({ error: err.message })
  }
}
