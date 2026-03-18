# etiqPRO PWA 2.0

Gestão de Etiquetas para Cozinha Industrial — PWA + Supabase + Bluetooth

## 🚀 Deploy rápido (3 passos)

### 1. Configurar o Supabase
1. Acesse [supabase.com](https://supabase.com) e crie um projeto
2. Vá em **SQL Editor** e execute o arquivo `supabase_setup.sql`
3. Copie a **Project URL** e **anon key** em: Project Settings > API

### 2. Configurar variáveis de ambiente
```bash
cp .env.example .env
# Edite .env com suas credenciais do Supabase
```

### 3. Deploy no Vercel
```bash
npm install -g vercel
vercel --prod
# Informe as variáveis VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY
```

Ou faça upload no [vercel.com](https://vercel.com) via interface web.

## 💻 Rodar localmente

```bash
npm install
npm run dev
```
Acesse: http://localhost:5173

## 🖨️ Impressão Bluetooth (WKDY-80D)

A impressão funciona via **Web Bluetooth API** — disponível apenas no **Chrome para Android**.

- Ligue a impressora e ative o Bluetooth do tablet
- Na página Config, clique em **Conectar Impressora**
- Selecione a WKDY-80D na lista
- Pronto! O pareamento é salvo automaticamente

## 📱 Instalar como app no tablet

1. Abra o link do Vercel no Chrome Android
2. Toque no menu (⋮) > **Adicionar à tela inicial**
3. O etiqPRO aparece como app instalado

## 🗄️ Estrutura do banco (Supabase)

| Tabela | Descrição |
|--------|-----------|
| `produtos` | Cadastro de produtos com validade padrão |
| `etiquetas` | Etiquetas geradas (ativa/vencida/descartada) |
| `operadores` | Funcionários que etiquetam |
| `descartes` | Registro de descartes para relatório |

## 🌐 Tecnologias

- **React 18** + Vite
- **Vite PWA** (manifest + service worker)
- **Supabase** (PostgreSQL na nuvem)
- **Web Bluetooth API** (impressão ESC/POS)
- **Recharts** (gráficos de relatório)
