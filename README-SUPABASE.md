# README — Supabase Setup · CRIA Shop Pack

## 1. Criar o Projeto no Supabase

1. Acesse [supabase.com](https://supabase.com) → **New Project**
2. Nome sugerido: `cria-shop-pack`
3. Escolha a senha do banco e a região (Brazil South se disponível, ou US East)
4. Aguarde o projeto inicializar (~2 min)

---

## 2. Criar a Tabela `compradores_shop`

No painel do Supabase → **SQL Editor** → cole e execute:

```sql
-- Tabela de compradores autorizados
CREATE TABLE compradores_shop (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email      TEXT NOT NULL UNIQUE,
  nome       TEXT,
  ativo      BOOLEAN DEFAULT TRUE,
  criado_em  TIMESTAMPTZ DEFAULT NOW(),
  origem     TEXT DEFAULT 'kiwify'  -- kiwify | manual | cortesia
);

-- Index para busca rápida por email
CREATE INDEX ON compradores_shop (email);

-- Habilitar Row Level Security
ALTER TABLE compradores_shop ENABLE ROW LEVEL SECURITY;

-- Policy: permite leitura anônima (o frontend só lê)
CREATE POLICY "leitura_por_email"
  ON compradores_shop
  FOR SELECT
  USING (true);

-- A escrita (INSERT) só é feita via service_role_key (Make/webhook)
-- Nunca exposta no HTML
```

---

## 3. Pegar as Chaves

No painel → **Project Settings** → **API**:

| Chave | Onde usar |
|---|---|
| `Project URL` | `SUPABASE_URL` no `index.html` |
| `anon public` | `SUPABASE_ANON` no `index.html` |
| `service_role` | **Apenas no Make** (nunca no HTML) |

Abra `index.html` e substitua:

```js
const SUPABASE_URL  = 'https://SEU_PROJETO.supabase.co';  // <- sua URL
const SUPABASE_ANON = 'SUA_ANON_KEY_AQUI';               // <- anon key
```

---

## 4. Integração Kiwify -> Make -> Supabase

### Kiwify Webhook

1. No painel Kiwify -> **Produto** -> **Integracoes** -> **Webhooks**
2. Adicione um novo webhook com o evento `order_approved`
3. URL do webhook: **a URL do seu cenario no Make**

### Cenario no Make

```
[Webhook: Kiwify] -> [Supabase: Insert Row]
```

**Configuracao do modulo Supabase Insert:**
- **Table:** `compradores_shop`
- **email:** `{{buyer.email}}` (campo do payload Kiwify)
- **nome:** `{{buyer.name}}`
- **origem:** `kiwify`

Use a `service_role_key` na conexao do Make com Supabase.
A `anon_key` que vai no HTML so permite leitura.

### Payload do Kiwify (referencia)

```json
{
  "event": "order_approved",
  "data": {
    "buyer": {
      "email": "comprador@email.com",
      "name": "Nome do Comprador"
    }
  }
}
```

---

## 5. Adicionar Compradores Manualmente

No painel Supabase -> **Table Editor** -> `compradores_shop` -> **Insert row**

Ou via SQL:

```sql
INSERT INTO compradores_shop (email, nome, origem)
VALUES ('email@do.comprador', 'Nome', 'manual');
```

---

## 6. Revogar Acesso

```sql
UPDATE compradores_shop
SET ativo = false
WHERE email = 'email@do.comprador';
```

---

## 7. Link de Suporte (WhatsApp)

No `index.html`, substitua:

```html
<a href="https://wa.me/SEUNUMERO" target="_blank">
```

Por (numero com DDI, sem simbolos):
```
https://wa.me/5511999999999
```

---

## 8. Link "Comprar Agora"

No `index.html`, substitua o `href="#"` no login:

```html
<a href="https://pay.kiwify.com.br/SEU_LINK" target="_blank">Comprar agora</a>
```

---

## Seguranca

```
ANON_KEY (no HTML)     -> SELECT apenas
SERVICE_ROLE (no Make) -> INSERT/UPDATE

RLS Policy:
  SELECT: ativo = true  (frontend verifica email)
  INSERT/UPDATE/DELETE: bloqueado para anon
```

A anon_key e publica por design no Supabase.
Mesmo que alguem veja no codigo-fonte, nao consegue criar compradores nem deletar dados.
