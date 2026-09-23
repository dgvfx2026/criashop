// api/debug.js — endpoint de diagnóstico temporário
// Acesse: https://criashop.vercel.app/api/debug após o teste do Kiwify

const logs = []

export default async function handler(req, res) {
  if (req.method === 'GET') {
    // Retorna os últimos logs capturados
    return res.status(200).json({
      total: logs.length,
      logs: logs.slice(-10) // últimos 10
    })
  }

  if (req.method === 'POST') {
    const entry = {
      timestamp: new Date().toISOString(),
      headers: req.headers,
      body: req.body,
      method: req.method,
      url: req.url,
    }
    logs.push(entry)
    console.log('DEBUG CAPTURE:', JSON.stringify(entry))
    return res.status(200).json({ captured: true, entry })
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
