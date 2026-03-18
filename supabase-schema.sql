-- ═══════════════════════════════════════════════════════
-- etiqPRO — SQL para criar tabelas no Supabase
-- Cole no SQL Editor: https://supabase.com → SQL Editor
-- ═══════════════════════════════════════════════════════

create table if not exists grupos (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  cor text not null default '#e67e00',
  criado_em timestamptz default now()
);

create table if not exists produtos (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  grupo_id uuid references grupos(id),
  validade_dias integer not null default 3,
  ingredientes text,
  conservacao text,
  obs text,
  ativo boolean default true,
  criado_em timestamptz default now()
);

create table if not exists operadores (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  usuario text unique not null,
  senha text not null,
  role text not null default 'operador',
  ativo boolean default true,
  criado_em timestamptz default now()
);

create table if not exists etiquetas (
  id uuid primary key default gen_random_uuid(),
  numero text not null unique,
  produto_nome text not null,
  produto_id uuid references produtos(id),
  grupo_nome text,
  grupo_cor text,
  ingredientes text,
  conservacao text,
  obs text,
  data_manipulacao date not null,
  data_validade date,
  operador text not null,
  peso_kg numeric(8,3),
  status text not null default 'ativa',
  baixada_em timestamptz,
  baixada_por text,
  descarte_motivo text,
  descarte_peso_kg numeric(8,3),
  criado_em timestamptz default now()
);

create table if not exists config (
  chave text primary key,
  valor text
);

insert into config (chave, valor) values ('etq_counter', '0') on conflict do nothing;

insert into grupos (nome, cor) values
  ('Carnes',           '#e53935'),
  ('Molhos e Caldos',  '#f4a11d'),
  ('Cereais e Massas', '#1a6b3c'),
  ('Laticínios',       '#1976d2'),
  ('Hortifruti',       '#7b1fa2')
on conflict do nothing;

insert into operadores (nome, usuario, senha, role) values
  ('Administrador', 'admin', 'admin123', 'admin'),
  ('Operador Padrão', 'op', 'op123', 'operador')
on conflict do nothing;

alter table grupos     disable row level security;
alter table produtos   disable row level security;
alter table operadores disable row level security;
alter table etiquetas  disable row level security;
alter table config     disable row level security;
