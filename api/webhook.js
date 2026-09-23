// api/webhook.js — Vercel Serverless Function
// Recebe webhook do Kiwify → insere comprador no Supabase

export default async function handler(req, res) {
  // Só aceita POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const body = req.body

    // Log completo do payload para debug
    console.log('=== KIWIFY WEBHOOK ===')
    console.log('Headers:', JSON.stringify(req.headers))
    console.log('Body:', JSON.stringify(body))
    console.log('======================')

    // Extrai email tentando todos os caminhos possíveis do Kiwify
    const email = (
      body?.data?.purchase?.buyer_email ||
      body?.purchase?.buyer_email ||
      body?.buyer_email ||
      body?.email ||
      ''
    ).toLowerCase().trim()

    const nome = (
      body?.data?.purchase?.buyer_name ||
      body?.purchase?.buyer_name ||
      body?.buyer_name ||
      body?.nome ||
      ''
    ).trim()

    const evento = body?.event || 'sem_evento'
    console.log('Evento:', evento, '| Email:', email, '| Nome:', nome)

    // Se não tiver email válido (ex: teste do Kiwify sem dados reais)
    if (!email || !email.includes('@')) {
      console.log('Sem email válido no payload')
      return res.status(200).json({ ok: true, msg: 'Sem email no payload' })
    }

    // Insere no Supabase via REST
    const supabaseUrl = process.env.SUPABASE_URL
    const serviceKey  = process.env.SUPABASE_SERVICE_KEY

    if (!supabaseUrl || !serviceKey) {
      console.error('ERRO: variáveis SUPABASE_URL ou SUPABASE_SERVICE_KEY não configuradas!')
      return res.status(500).json({ error: 'Variáveis de ambiente não configuradas' })
    }

    const supabaseRes = await fetch(`${supabaseUrl}/rest/v1/compradores_shop`, {
      method: 'POST',
      headers: {
        'apikey': serviceKey,
        'Authorization': `Bearer ${serviceKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'resolution=merge-duplicates',
      },
      body: JSON.stringify({
        email,
        nome: nome || null,
        ativo: true,
        origem: 'kiwify',
      }),
    })

    const resText = await supabaseRes.text()
    console.log('Supabase status:', supabaseRes.status, '| Resposta:', resText)

    if (!supabaseRes.ok) {
      throw new Error(`Supabase erro ${supabaseRes.status}: ${resText}`)
    }

    console.log('✅ Comprador inserido:', email)
    return res.status(200).json({ success: true, email })

  } catch (err) {
    console.error('ERRO GERAL:', err.message)
    return res.status(500).json({ error: err.message })
  }
}
