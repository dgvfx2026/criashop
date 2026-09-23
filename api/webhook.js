// api/webhook.js — Vercel Serverless Function
// Recebe webhook do Kiwify → insere comprador no Supabase

export default async function handler(req, res) {
  // Só aceita POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const body = req.body

    console.log('Kiwify payload recebido:', JSON.stringify(body))

    // ── Verificar token de segurança (Kiwify envia no header ou body) ──
    const tokenRecebido =
      req.headers['x-kiwify-token'] ||
      req.headers['authorization'] ||
      body?.token ||
      ''

    const tokenEsperado = process.env.WEBHOOK_TOKEN || ''

    if (tokenEsperado && tokenRecebido !== tokenEsperado) {
      console.warn('Token inválido recebido:', tokenRecebido)
      return res.status(401).json({ error: 'Token inválido' })
    }

    // ── Extrair dados do payload Kiwify ──
    const evento = body?.event || ''

    // Só processa compras aprovadas (ignora outros eventos)
    if (evento && evento !== 'order_approved') {
      console.log('Evento ignorado:', evento)
      return res.status(200).json({ ok: true, msg: 'Evento ignorado: ' + evento })
    }

    // Kiwify envia os dados assim: body.data.purchase.buyer_email
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

    if (!email || !email.includes('@')) {
      console.error('Email não encontrado no payload')
      return res.status(400).json({ error: 'Email não encontrado no payload' })
    }

    // ── Inserir no Supabase via REST API ──
    const supabaseUrl  = process.env.SUPABASE_URL
    const serviceKey   = process.env.SUPABASE_SERVICE_KEY

    const supabaseRes = await fetch(`${supabaseUrl}/rest/v1/compradores_shop`, {
      method: 'POST',
      headers: {
        'apikey': serviceKey,
        'Authorization': `Bearer ${serviceKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'resolution=merge-duplicates', // upsert: não duplica se email já existir
      },
      body: JSON.stringify({
        email,
        nome: nome || null,
        ativo: true,
        origem: 'kiwify',
      }),
    })

    if (!supabaseRes.ok) {
      const errText = await supabaseRes.text()
      console.error('Erro Supabase:', errText)
      throw new Error('Erro ao inserir no Supabase: ' + errText)
    }

    console.log('✅ Comprador inserido/atualizado:', email)
    return res.status(200).json({ success: true, email })

  } catch (err) {
    console.error('Erro geral:', err.message)
    return res.status(500).json({ error: err.message })
  }
}
