# Mini MES - La Miguelita Salgados
## Arquitetura Completa do Sistema

---

## Visão Geral

Sistema MES (Manufacturing Execution System) para fábrica de salgados congelados com:
- Planejamento semanal automatizado
- Execução de produção por batidas
- Integração com balança
- Cálculo de custo real
- Assistente IA para operadores

---

## Stack Tecnológica

| Camada       | Tecnologia              | Motivo                          |
|-------------|-------------------------|---------------------------------|
| Backend     | Node.js + TypeScript    | Velocidade de I/O, ecossistema  |
| Framework   | Express + Zod           | Simples, validação robusta       |
| ORM         | Prisma                  | Type-safe, migrations automáticas|
| Banco       | PostgreSQL 16           | Relacional, transações ACID      |
| Frontend    | Next.js 14 + TypeScript | SSR, App Router, performance     |
| Styling     | Tailwind CSS            | Rápido, tema industrial          |
| Estado      | Zustand + React Query   | Simples + cache de servidor      |
| Tempo Real  | Socket.IO               | Balança, status produção         |
| IA          | Claude Haiku (Anthropic)| Rápido, barato, multilíngue      |
| Balança     | SerialPort              | Protocolo RS-232/USB             |
| Containers  | Docker Compose          | Deploy simples                   |

---

## Arquitetura em Camadas

```
┌─────────────────────────────────────────────────────┐
│                    FRONTEND (Next.js)                │
│                                                      │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────┐  │
│  │  Operador   │  │  Supervisora │  │   Admin    │  │
│  │  Produção   │  │  Dashboard   │  │  Cadastros │  │
│  │  Batidas    │  │  Aprovações  │  │  Planejo   │  │
│  └─────────────┘  └──────────────┘  └────────────┘  │
│                                                      │
│  ┌──────────────────────────────────────────────┐    │
│  │      Assistente IA (Claude Haiku)            │    │
│  └──────────────────────────────────────────────┘    │
└──────────────────────┬──────────────────────────────┘
                       │ REST API + WebSocket
┌──────────────────────▼──────────────────────────────┐
│                   BACKEND (Express)                  │
│                                                      │
│  ┌──────────┐  ┌──────────┐  ┌──────────────────┐   │
│  │ Produtos │  │ Planejo  │  │  Ordens + Batidas │   │
│  └──────────┘  └──────────┘  └──────────────────┘   │
│                                                      │
│  ┌──────────┐  ┌──────────┐  ┌──────────────────┐   │
│  │ Balança  │  │  Custos  │  │   IA Assistant   │   │
│  │ Socket   │  │   ERP    │  │  (Claude API)    │   │
│  └──────────┘  └──────────┘  └──────────────────┘   │
│                                                      │
│  ┌────────────────────────────────────────────────┐  │
│  │         Algoritmo de Planejamento              │  │
│  │  (agrupamento por tipo + balanceamento carga)  │  │
│  └────────────────────────────────────────────────┘  │
└──────────────────────┬──────────────────────────────┘
                       │ Prisma ORM
┌──────────────────────▼──────────────────────────────┐
│                  PostgreSQL 16                       │
│                                                      │
│  produtos  ingredientes  ordens_producao  batidas    │
│  consumos  custos  planos_semanais  conhecimento_ia  │
└─────────────────────────────────────────────────────┘
```

---

## Fluxo Principal de Produção

```
Planejamento Semanal
       │
       ▼
Algoritmo gera Agenda ──► Aprovação (Supervisora)
       │
       ▼
Ordens de Produção (OP) geradas por produto/dia
       │
       ▼
Sistema divide OP em BATIDAS automaticamente
  Ex: 2000 bauros ÷ 500/batida = 4 batidas
       │
       ▼
TELA DO OPERADOR: "Produção do Dia"
  ┌─ Bauru Presunto Queijo  2000  [4 batidas] ─┐
  │  Coxinha Frango         1200  [3 batidas]  │
  │  Pastel Carne            900  [2 batidas]  │
  └────────────────────────────────────────────┘
       │ Operador seleciona produto
       ▼
TELA DA BATIDA
  - Meta: 500 unidades
  - Ingredientes previstos
  - [INICIAR] → [PAUSAR / FECHAR]
       │
       ▼
BALANÇA (Serial RS-232 ou manual)
  - Modo: Por Caixa ou Acumulado
  - Validação de tolerância de peso
       │
       ▼
FECHAMENTO DA BATIDA
  - Quantidade produzida
  - Consumo real de ingredientes
  - Registro de sobras (massa/recheio)
  - Registro de perdas (massa/recheio/processo)
       │
       ▼
CONFIRMAÇÃO (Supervisora)
       │
       ▼
CÁLCULO DE CUSTO REAL
  - Custo total da batida
  - Custo unitário
  - Custo das perdas
       │
       ▼
DASHBOARD DE INDICADORES
  - Produzido vs Planejado
  - Eficiência por máquina
  - Ranking de perdas
  - Consumo previsto vs real
```

---

## Módulos do Sistema

### 1. Cadastro de Produtos
- CRUD completo de produtos
- Associação com receitas e ingredientes
- Instruções operacionais com fotos
- Configuração de lotes e tolerâncias de peso

### 2. Cadastro de Ingredientes
- CRUD com custo unitário
- Código ERP para integração futura
- Controle de estoque mínimo

### 3. Planejamento de Produção
- Entradas: estoque atual, pedidos, ou quantidade direta
- Algoritmo automático de otimização:
  - Agrupa produtos por tipo de processo
  - Prioriza por volume e urgência
  - Balanceia carga entre Usifood 1 e 2
  - Minimiza trocas de setup
- Saída: agenda semanal com horários por máquina

### 4. Ordens de Produção (OP)
- Criação manual ou via plano semanal
- Divisão automática em batidas
- Cálculo automático de consumo previsto (proporcional ao lote ideal)

### 5. Execução de Produção
- Tela principal: visão do dia por máquina
- Cards de OP com progresso em tempo real
- Início, pausa e fechamento de batidas

### 6. Integração com Balança
- Comunicação serial RS-232/USB (SerialPort)
- Modo 1: pesagem por caixa
- Modo 2: peso acumulado
- Modo manual como fallback
- Validação de tolerância configurable
- Tempo real via Socket.IO

### 7. Fechamento de Batida
- Registro de quantidade produzida
- Consumo real vs previsto por ingrediente
- Sobras de massa e recheio com destino
- Perdas por tipo (massa, recheio, processo)
- Confirmação da supervisora

### 8. Cálculo de Custo Real
- Automático após fechamento
- Custo por ingrediente consumido
- Custo das perdas (estimativa proporcional)
- Custo unitário do produto
- Pronto para integração ERP (fonte de preços)

### 9. Dashboard de Indicadores
- Produzido vs planejado (por dia e semana)
- Eficiência por máquina
- Tempo médio por batida
- Ranking de perdas por produto
- Consumo previsto vs real
- Custo total e por produto

### 10. Assistente IA (Claude Haiku)
- Interface de chat para operadores
- Base de conhecimento configurável:
  - Receitas e pesos
  - Procedimentos operacionais
  - Boas práticas de higiene
  - Temperaturas e parâmetros de máquinas
- Contexto da batida atual automaticamente injetado
- Histórico de conversas por operador

---

## Perfis de Usuário

| Perfil       | Permissões                                              |
|-------------|----------------------------------------------------------|
| OPERADOR    | Ver produção do dia, executar batidas, fechar batidas    |
| SUPERVISORA | Tudo do Operador + confirmar batidas + aprovar planos    |
| GERENTE     | Tudo + dashboard completo + relatórios de custo          |
| ADMIN       | Tudo + cadastros + usuários + base de conhecimento IA    |

---

## Estrutura de Arquivos

```
mini-mes/
├── backend/
│   └── src/
│       ├── server.ts                    # Entry point + Socket.IO
│       ├── modules/
│       │   ├── auth/                    # JWT, login, perfis
│       │   ├── products/                # CRUD produtos + receitas
│       │   ├── ingredients/             # CRUD ingredientes
│       │   ├── planning/                # Plano semanal
│       │   ├── orders/                  # Ordens de Produção
│       │   ├── batches/                 # Batidas (execução)
│       │   ├── scale/                   # Integração balança
│       │   ├── costs/                   # Cálculo de custo real
│       │   ├── dashboard/               # Indicadores
│       │   └── ai-assistant/            # Chat IA (Claude)
│       ├── algorithms/
│       │   ├── production-planner.ts    # Algoritmo de planejamento
│       │   └── batch-generator.ts       # Gerador de batidas
│       ├── integrations/
│       │   ├── scale/socket.ts          # SerialPort + Socket.IO
│       │   └── erp/                     # Futuro: integração ERP
│       ├── middleware/                  # Auth, error handler
│       ├── database/client.ts           # Prisma client
│       └── utils/                       # Logger, AppError
│
├── frontend/
│   └── src/
│       ├── app/
│       │   ├── operator/
│       │   │   ├── production/page.tsx  # Tela principal operador
│       │   │   └── batch/[id]/page.tsx  # Tela da batida
│       │   ├── admin/
│       │   │   ├── products/            # Cadastro de produtos
│       │   │   ├── planning/            # Planejamento semanal
│       │   │   └── dashboard/           # Dashboard completo
│       │   └── login/page.tsx
│       ├── components/
│       │   ├── operator/
│       │   │   ├── OrdemCard.tsx        # Card da OP na lista
│       │   │   ├── BalancaWidget.tsx    # Widget da balança
│       │   │   ├── FechamentoBatida.tsx # Modal de fechamento
│       │   │   ├── IngredientesList.tsx # Lista de ingredientes
│       │   │   └── InstrucoesProduto.tsx
│       │   └── ai/
│       │       └── AssistenteIA.tsx     # Chat flutuante
│       ├── hooks/
│       │   └── useSocket.ts             # Socket.IO hook
│       └── lib/
│           └── api.ts                   # Axios com interceptors
│
├── database/
│   └── schema.prisma                    # Schema completo PostgreSQL
│
├── docker-compose.yml
└── .env.example
```

---

## Integrações Futuras

### ERP
- Buscar custo atualizado de ingredientes
- Sincronizar pedidos de venda
- Exportar consumo real para baixa de estoque

### Balança Avançada
- Múltiplas balanças simultâneas
- Protocolo MODBUS/TCP para balanças industriais
- Calibração automática

### IA Avançada
- Previsão de demanda com Machine Learning
- Detecção de anomalias no processo
- Sugestão automática de ajustes de receita

---

## Como Rodar

```bash
# 1. Copiar variáveis de ambiente
cp .env.example .env
# Editar .env com suas chaves (especialmente ANTHROPIC_API_KEY)

# 2. Subir tudo com Docker
docker compose up -d

# 3. Rodar migrations
docker exec mini-mes-api npx prisma migrate deploy

# 4. Seed com dados iniciais (produtos da La Miguelita)
docker exec mini-mes-api npm run db:seed

# Acesso:
# Frontend: http://localhost:3000
# API:      http://localhost:3001
# DB:       localhost:5432
```
