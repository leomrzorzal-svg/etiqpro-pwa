import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../../database/client'
import { gerarBatidasOP } from '../../algorithms/batch-generator'
import { asyncHandler } from '../../middleware/asyncHandler'
import { AppError } from '../../utils/AppError'

export const ordensRouter = Router()

// Listar OPs do dia
ordensRouter.get('/dia/:data', asyncHandler(async (req, res) => {
  const { data } = req.params
  const inicio = new Date(data)
  inicio.setHours(0, 0, 0, 0)
  const fim = new Date(data)
  fim.setHours(23, 59, 59, 999)

  const ordens = await prisma.ordemProducao.findMany({
    where: { data_planejada: { gte: inicio, lte: fim } },
    include: {
      produto: { select: { nome: true, tipo_producao: true, foto_url: true } },
      batidas: { select: { id: true, numero_batida: true, status: true, quantidade_produzida: true } }
    },
    orderBy: [{ prioridade: 'desc' }, { maquina: 'asc' }]
  })

  res.json(ordens)
}))

// Criar OP + gerar batidas automaticamente
ordensRouter.post('/', asyncHandler(async (req, res) => {
  const schema = z.object({
    produto_id: z.string().uuid(),
    quantidade_planejada: z.number().int().positive(),
    maquina: z.enum(['USIFOOD_1', 'USIFOOD_2', 'MCI', 'MESA_1', 'MESA_2', 'MESA_3']),
    data_planejada: z.string(),
    turno: z.enum(['MANHA', 'TARDE', 'NOITE']),
    prioridade: z.enum(['BAIXA', 'MEDIA', 'ALTA', 'URGENTE']).default('MEDIA'),
    pedido_ref: z.string().optional(),
    observacoes: z.string().optional()
  })

  const dados = schema.parse(req.body)
  const produto = await prisma.produto.findUnique({
    where: { id: dados.produto_id },
    include: { receita: { include: { ingredientes: { include: { ingrediente: true } } } } }
  })

  if (!produto) throw new AppError('Produto não encontrado', 404)

  // Gerar código OP sequencial
  const count = await prisma.ordemProducao.count()
  const codigo = `OP-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`

  const op = await prisma.ordemProducao.create({
    data: {
      codigo,
      produto_id: dados.produto_id,
      quantidade_planejada: dados.quantidade_planejada,
      maquina: dados.maquina,
      data_planejada: new Date(dados.data_planejada),
      turno: dados.turno,
      prioridade: dados.prioridade,
      pedido_ref: dados.pedido_ref,
      observacoes: dados.observacoes,
      lote_maximo_batida: produto.lote_maximo_batida,
      status: 'LIBERADA'
    }
  })

  // Gerar batidas automaticamente
  const batidas = await gerarBatidasOP(op, produto)

  res.status(201).json({ op, batidas })
}))

// Cancelar OP
ordensRouter.patch('/:id/cancelar', asyncHandler(async (req, res) => {
  const op = await prisma.ordemProducao.update({
    where: { id: req.params.id },
    data: { status: 'CANCELADA' }
  })
  res.json(op)
}))

// Detalhes da OP
ordensRouter.get('/:id', asyncHandler(async (req, res) => {
  const op = await prisma.ordemProducao.findUnique({
    where: { id: req.params.id },
    include: {
      produto: { include: { receita: { include: { ingredientes: { include: { ingrediente: true } } } } } },
      batidas: {
        include: { consumos: true, sobras: true, perdas: true, custo: true },
        orderBy: { numero_batida: 'asc' }
      }
    }
  })

  if (!op) throw new AppError('OP não encontrada', 404)
  res.json(op)
}))
