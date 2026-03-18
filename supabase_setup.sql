-- ══════════════════════════════════════════════════════════════
-- etiqPRO PWA 2.0 — Script de criação do banco no Supabase
-- Execute no SQL Editor do painel em: supabase.com > SQL Editor
-- ══════════════════════════════════════════════════════════════

-- Tabela única que guarda todos os dados do app como JSON
CREATE TABLE IF NOT EXISTS app_data (
  id          TEXT PRIMARY KEY,
  payload     JSONB NOT NULL DEFAULT '{}',
  updated_at  TIMESTAMPTZ DEFAULT now()
);

-- Row Level Security: permite leitura/escrita via anon key
ALTER TABLE app_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "acesso_publico" ON app_data
  FOR ALL USING (true) WITH CHECK (true);

-- Habilitar Realtime para sincronização entre dispositivos
ALTER PUBLICATION supabase_realtime ADD TABLE app_data;

-- Inserir registro inicial (só se não existir)
INSERT INTO app_data (id, payload)
VALUES ('main', '{"hist":[],"prods":[],"grps":[],"usuarios":[],"counter":0}')
ON CONFLICT (id) DO NOTHING;
