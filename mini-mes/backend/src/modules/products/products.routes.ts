import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../../database/client'
import { asyncHandler } from '../../middleware/asyncHandler'
import { AppError } from '../../utils/AppError'

export const produtosRouter = Router()

produtosRouter.get('/', asyncHandler(async (req, res) => {
  const produtos = await prisma.produto.findMany({
    where: { ativo: true },
    include: { receita: { include: { ingredientes: { include: { ingrediente: true } } } } },
    orderBy: { nome: 'asc' }
  })
  res.json(produtos)
}))

produtosRouter.get('/:id', asyncHandler(async (req, res) => {
  const produto = await prisma.produto.findUnique({
    where: { id: req.params.id },
    include: {
      receita: { include: { ingredientes: { include: { ingrediente: true } } } },
      instrucoes: { orderBy: { ordem: 'asc' } }
    }
  })
  if (!produto) throw new AppError('Produto não encontrado', 404)
  res.json(produto)
}))

produtosRouter.post('/', asyncHandler(async (req, res) => {
  const schema = z.object({
    nome: z.string().min(2),
    categoria: z.string(),
    tipo_producao: z.enum(['ASSADO', 'FRITO', 'MANUAL']),
    maquina_permitida: z.array(z.enum(['USIFOOD_1', 'USIFOOD_2', 'MCI', 'MESA_1', 'MESA_2', 'MESA_3'])),
    peso_unitario_g: z.number().positive(),
    unidades_por_caixa: z.number().int().positive(),
    peso_caixa_padrao_kg: z.number().positive(),
    tolerancia_peso_pct: z.number().default(5.0),
    lote_ideal: z.number().int().positive(),
    lote_maximo_batida: z.number().int().positive(),
    tempo_medio_min: z.number().positive(),
    foto_url: z.string().url().optional(),
    codigo_erp: z.string().optional()
  })

  const dados = schema.parse(req.body)
  const produto = await prisma.produto.create({ data: dados as any })
  res.status(201).json(produto)
}))

produtosRouter.put('/:id', asyncHandler(async (req, res) => {
  const produto = await prisma.produto.update({
    where: { id: req.params.id },
    data: req.body
  })
  res.json(produto)
}))

produtosRouter.delete('/:id', asyncHandler(async (req, res) => {
  await prisma.produto.update({
    where: { id: req.params.id },
    data: { ativo: false }
  })
  res.status(204).send()
}))
