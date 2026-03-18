import { Router } from 'express'
import { prisma } from '../../database/client'
import { asyncHandler } from '../../middleware/asyncHandler'
import { calcularCustoBatida } from './cost-calculator'

export const custosRouter = Router()

// Custo de uma batida específica
custosRouter.get('/batida/:batida_id', asyncHandler(async (req, res) => {
  const custo = await prisma.custoBatida.findUnique({
    where: { batida_id: req.params.batida_id },
    include: { detalhes: true }
  })
  res.json(custo)
}))

// Recalcular custo manualmente
custosRouter.post('/batida/:batida_id/recalcular', asyncHandler(async (req, res) => {
  await calcularCustoBatida(req.params.batida_id)
  const custo = await prisma.custoBatida.findUnique({
    where: { batida_id: req.params.batida_id },
    include: { detalhes: true }
  })
  res.json(custo)
}))

// Custo por produto (período)
custosRouter.get('/produto/:produto_id', asyncHandler(async (req, res) => {
  const { inicio, fim } = req.query as any

  const custos = await prisma.custoBatida.findMany({
    where: {
      batida: {
        ordem: { produto_id: req.params.produto_id },
        fechada_em: {
          gte: inicio ? new Date(inicio) : undefined,
          lte: fim ? new Date(fim) : undefined
        }
      }
    },
    include: { batida: { select: { numero_batida: true, quantidade_produzida: true, fechada_em: true } } },
    orderBy: { calculado_em: 'desc' }
  })

  const media = custos.length > 0
    ? custos.reduce((acc, c) => acc + c.custo_unitario, 0) / custos.length
    : 0

  res.json({ custos, custo_unitario_medio: media })
}))
