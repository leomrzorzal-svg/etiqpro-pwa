import { Router } from 'express'
import { prisma } from '../../database/client'
import { asyncHandler } from '../../middleware/asyncHandler'

export const balancaRouter = Router()

// Histórico de pesagens de uma batida
balancaRouter.get('/batida/:batida_id', asyncHandler(async (req, res) => {
  const pesagens = await prisma.pesagemBalanca.findMany({
    where: { batida_id: req.params.batida_id },
    orderBy: { timestamp: 'desc' }
  })
  res.json(pesagens)
}))

// Status da balança (via Socket.IO, mas endpoint REST para diagnóstico)
balancaRouter.get('/status', asyncHandler(async (_req, res) => {
  res.json({ modo: 'verifique_via_websocket', porta: process.env.BALANCA_PORTA || 'N/A' })
}))
