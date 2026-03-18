import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../../database/client'
import { gerarPlanoSemanal, ItemPlanejamento } from '../../algorithms/production-planner'
import { asyncHandler } from '../../middleware/asyncHandler'
import { AppError } from '../../utils/AppError'

export const planejamentoRouter = Router()

// Gerar plano semanal automaticamente
planejamentoRouter.post('/gerar', asyncHandler(async (req, res) => {
  const schema = z.object({
    semana_inicio: z.string(), // YYYY-MM-DD (segunda-feira)
    itens: z.array(z.object({
      produto_id: z.string().uuid(),
      quantidade: z.number().int().positive(),
      prioridade: z.enum(['BAIXA', 'MEDIA', 'ALTA', 'URGENTE']).default('MEDIA'),
      pedido_ref: z.string().optional()
    }))
  })

  const { semana_inicio, itens } = schema.parse(req.body)

  // Buscar dados dos produtos
  const produtos = await prisma.produto.findMany({
    where: { id: { in: itens.map(i => i.produto_id) }, ativo: true }
  })

  const itensPlanejamento: ItemPlanejamento[] = itens.map(item => {
    const produto = produtos.find(p => p.id === item.produto_id)
    if (!produto) throw new AppError(`Produto ${item.produto_id} não encontrado`, 404)

    return {
      produto_id: produto.id,
      produto_nome: produto.nome,
      tipo_producao: produto.tipo_producao,
      maquinas_permitidas: produto.maquina_permitida as any,
      quantidade: item.quantidade,
      prioridade: item.prioridade as any,
      tempo_medio_min: produto.tempo_medio_min,
      lote_ideal: produto.lote_ideal,
      lote_maximo_batida: produto.lote_maximo_batida,
      pedido_ref: item.pedido_ref
    }
  })

  const plano = await gerarPlanoSemanal(new Date(semana_inicio), itensPlanejamento)

  res.json(plano)
}))

// Salvar plano aprovado
planejamentoRouter.post('/salvar', asyncHandler(async (req, res) => {
  const schema = z.object({
    semana_inicio: z.string(),
    semana_fim: z.string(),
    agenda: z.array(z.object({
      maquina: z.string(),
      data: z.string(),
      turno: z.string(),
      itens: z.array(z.object({
        produto_id: z.string(),
        quantidade: z.number(),
        horario_inicio: z.string(),
        horario_fim: z.string(),
        num_batidas: z.number(),
        prioridade: z.string()
      }))
    }))
  })

  const dados = schema.parse(req.body)

  const plano = await prisma.planoSemanal.create({
    data: {
      semana_inicio: new Date(dados.semana_inicio),
      semana_fim: new Date(dados.semana_fim),
      gerado_por_ia: true,
      status: 'RASCUNHO'
    }
  })

  res.status(201).json(plano)
}))

// Listar planos
planejamentoRouter.get('/', asyncHandler(async (req, res) => {
  const planos = await prisma.planoSemanal.findMany({
    orderBy: { semana_inicio: 'desc' },
    take: 10,
    include: { _count: { select: { ordens: true } } }
  })
  res.json(planos)
}))
