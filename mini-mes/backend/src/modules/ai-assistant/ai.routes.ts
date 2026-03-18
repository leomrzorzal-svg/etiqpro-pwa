import { Router } from 'express'
import { z } from 'zod'
import Anthropic from '@anthropic-ai/sdk'
import { prisma } from '../../database/client'
import { asyncHandler } from '../../middleware/asyncHandler'

export const iaRouter = Router()
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// Contexto base da IA com conhecimento da fábrica
async function buildSystemPrompt(): Promise<string> {
  const conhecimentos = await prisma.conhecimentoIA.findMany({
    where: { ativo: true },
    orderBy: { categoria: 'asc' }
  })

  const base = conhecimentos
    .map(c => `## ${c.categoria}: ${c.titulo}\n${c.conteudo}`)
    .join('\n\n')

  return `Você é o assistente de produção da La Miguelita Salgados.
Sua função é ajudar operadores e supervisoras com informações sobre:
- Receitas e procedimentos de produção
- Pesos e medidas dos produtos
- Higiene e boas práticas
- Operação dos equipamentos (Usifood e MCI)
- Temperaturas de fritura e forno
- Resolução de problemas no chão de fábrica

Seja sempre direto, prático e use linguagem simples para os operadores.
Quando não souber algo, diga que vai verificar com a supervisora.

BASE DE CONHECIMENTO DA FÁBRICA:
${base}

PRODUTOS PRODUZIDOS: coxinha, bauru, pastel, quibe, esfirra, croissant, trouxinha`
}

// Chat com a IA
iaRouter.post('/chat', asyncHandler(async (req, res) => {
  const schema = z.object({
    mensagem: z.string().min(1).max(1000),
    contexto: z.object({
      batida_id: z.string().optional(),
      produto_id: z.string().optional(),
      op_codigo: z.string().optional()
    }).optional()
  })

  const { mensagem, contexto } = schema.parse(req.body)

  // Buscar contexto adicional se fornecido
  let contextoExtra = ''
  if (contexto?.batida_id) {
    const batida = await prisma.batida.findUnique({
      where: { id: contexto.batida_id },
      include: { ordem: { include: { produto: true } } }
    })
    if (batida) {
      contextoExtra = `\nCONTEXTO ATUAL: Operador está na batida ${batida.numero_batida}/${batida.total_batidas} do produto ${batida.ordem.produto.nome}. Meta: ${batida.quantidade_meta} unidades.`
    }
  }

  const systemPrompt = await buildSystemPrompt()

  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 512,
    system: systemPrompt + contextoExtra,
    messages: [{ role: 'user', content: mensagem }]
  })

  const resposta = response.content[0].type === 'text' ? response.content[0].text : ''

  // Salvar conversa para análise
  await prisma.conversaIA.create({
    data: {
      usuario_id: (req as any).user?.id,
      pergunta: mensagem,
      resposta,
      contexto: contexto || {}
    }
  })

  res.json({ resposta, tokens_usados: response.usage.output_tokens })
}))

// Listar perguntas frequentes (últimas 20)
iaRouter.get('/historico', asyncHandler(async (req, res) => {
  const conversas = await prisma.conversaIA.findMany({
    where: { usuario_id: (req as any).user?.id },
    orderBy: { timestamp: 'desc' },
    take: 20,
    select: { pergunta: true, resposta: true, timestamp: true }
  })
  res.json(conversas)
}))

// Gerenciar base de conhecimento
iaRouter.get('/conhecimento', asyncHandler(async (req, res) => {
  const conhecimentos = await prisma.conhecimentoIA.findMany({ where: { ativo: true } })
  res.json(conhecimentos)
}))

iaRouter.post('/conhecimento', asyncHandler(async (req, res) => {
  const schema = z.object({
    categoria: z.string(),
    titulo: z.string(),
    conteudo: z.string(),
    tags: z.array(z.string()).default([])
  })
  const dados = schema.parse(req.body)
  const item = await prisma.conhecimentoIA.create({ data: dados })
  res.status(201).json(item)
}))
