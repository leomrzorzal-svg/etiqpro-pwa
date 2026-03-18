import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../../database/client'
import { asyncHandler } from '../../middleware/asyncHandler'

export const ingredientesRouter = Router()

ingredientesRouter.get('/', asyncHandler(async (req, res) => {
  const ingredientes = await prisma.ingrediente.findMany({
    where: { ativo: true },
    orderBy: { nome: 'asc' }
  })
  res.json(ingredientes)
}))

ingredientesRouter.post('/', asyncHandler(async (req, res) => {
  const schema = z.object({
    nome: z.string().min(2),
    unidade_medida: z.enum(['KG', 'GRAMAS', 'LITROS', 'ML', 'UNIDADE', 'CAIXA']),
    custo_unitario: z.number().positive(),
    fornecedor: z.string().optional(),
    codigo_erp: z.string().optional(),
    estoque_minimo: z.number().default(0)
  })
  const dados = schema.parse(req.body)
  const ingrediente = await prisma.ingrediente.create({ data: dados as any })
  res.status(201).json(ingrediente)
}))

ingredientesRouter.put('/:id', asyncHandler(async (req, res) => {
  const ingrediente = await prisma.ingrediente.update({
    where: { id: req.params.id },
    data: req.body
  })
  res.json(ingrediente)
}))
