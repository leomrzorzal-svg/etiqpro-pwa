import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../../database/client'
import { calcularCustoBatida } from '../costs/cost-calculator'
import { asyncHandler } from '../../middleware/asyncHandler'
import { AppError } from '../../utils/AppError'
import { io } from '../../server'

export const batidasRouter = Router()

// Iniciar batida
batidasRouter.post('/:id/iniciar', asyncHandler(async (req, res) => {
  const batida = await prisma.batida.findUnique({ where: { id: req.params.id } })
  if (!batida) throw new AppError('Batida não encontrada', 404)
  if (batida.status !== 'PENDENTE') throw new AppError('Batida não pode ser iniciada', 400)

  const atualizada = await prisma.batida.update({
    where: { id: req.params.id },
    data: {
      status: 'INICIADA',
      iniciada_em: new Date(),
      operador_id: (req as any).user?.id
    },
    include: {
      ordem: { include: { produto: { include: { receita: { include: { ingredientes: { include: { ingrediente: true } } } } } } } }
    }
  })

  // Atualizar status da OP
  await prisma.ordemProducao.update({
    where: { id: batida.ordem_id },
    data: { status: 'EM_ANDAMENTO' }
  })

  // Emitir evento em tempo real
  io.emit('batida:iniciada', { batida_id: req.params.id, ordem_id: batida.ordem_id })

  res.json(atualizada)
}))

// Pausar batida
batidasRouter.post('/:id/pausar', asyncHandler(async (req, res) => {
  const atualizada = await prisma.batida.update({
    where: { id: req.params.id },
    data: { status: 'PAUSADA' }
  })
  io.emit('batida:pausada', { batida_id: req.params.id })
  res.json(atualizada)
}))

// Fechar batida com consumos, sobras e perdas
batidasRouter.post('/:id/fechar', asyncHandler(async (req, res) => {
  const schema = z.object({
    quantidade_produzida: z.number().int().nonnegative(),
    consumos: z.array(z.object({
      ingrediente_id: z.string().uuid(),
      quantidade_real: z.number().nonneg(),
      unidade: z.enum(['KG', 'GRAMAS', 'LITROS', 'ML', 'UNIDADE', 'CAIXA'])
    })),
    sobras: z.array(z.object({
      tipo: z.string(),
      quantidade: z.number().nonneg(),
      unidade: z.enum(['KG', 'GRAMAS', 'LITROS', 'ML', 'UNIDADE', 'CAIXA']),
      destino: z.string().optional()
    })).default([]),
    perdas: z.array(z.object({
      tipo: z.string(),
      quantidade: z.number().nonneg(),
      unidade: z.enum(['KG', 'GRAMAS', 'LITROS', 'ML', 'UNIDADE', 'CAIXA']),
      motivo: z.string().optional()
    })).default([]),
    peso_total_kg: z.number().optional(),
    observacoes: z.string().optional()
  })

  const dados = schema.parse(req.body)
  const batida = await prisma.batida.findUnique({
    where: { id: req.params.id },
    include: { consumos: true }
  })

  if (!batida) throw new AppError('Batida não encontrada', 404)
  if (!['INICIADA', 'PAUSADA'].includes(batida.status)) {
    throw new AppError('Batida não pode ser fechada neste estado', 400)
  }

  // Transação: fechar batida + registrar consumos/sobras/perdas
  const resultado = await prisma.$transaction(async (tx) => {
    // Atualizar consumos com quantidade real
    for (const consumo of dados.consumos) {
      await tx.consumoBatida.updateMany({
        where: { batida_id: req.params.id, ingrediente_id: consumo.ingrediente_id },
        data: {
          quantidade_real: consumo.quantidade_real,
          diferenca: consumo.quantidade_real // será calculada após buscar previsto
        }
      })
    }

    // Registrar sobras
    if (dados.sobras.length > 0) {
      await tx.sobraBatida.createMany({
        data: dados.sobras.map(s => ({ batida_id: req.params.id, ...s }))
      })
    }

    // Registrar perdas
    if (dados.perdas.length > 0) {
      await tx.perdaBatida.createMany({
        data: dados.perdas.map(p => ({ batida_id: req.params.id, ...p }))
      })
    }

    // Fechar a batida
    return await tx.batida.update({
      where: { id: req.params.id },
      data: {
        status: 'FECHADA',
        fechada_em: new Date(),
        quantidade_produzida: dados.quantidade_produzida,
        peso_total_kg: dados.peso_total_kg,
        observacoes: dados.observacoes
      }
    })
  })

  // Calcular custo em background
  calcularCustoBatida(req.params.id).catch(err =>
    console.error('Erro ao calcular custo da batida:', err)
  )

  io.emit('batida:fechada', { batida_id: req.params.id, ordem_id: batida.ordem_id })
  res.json(resultado)
}))

// Confirmar batida (supervisora)
batidasRouter.post('/:id/confirmar', asyncHandler(async (req, res) => {
  const batida = await prisma.batida.findUnique({ where: { id: req.params.id } })
  if (!batida) throw new AppError('Batida não encontrada', 404)
  if (batida.status !== 'FECHADA') throw new AppError('Batida deve estar fechada para confirmar', 400)

  const confirmada = await prisma.batida.update({
    where: { id: req.params.id },
    data: {
      status: 'CONFIRMADA',
      confirmada_em: new Date(),
      confirmada_por: (req as any).user?.nome
    }
  })

  // Verificar se todas as batidas da OP estão confirmadas
  const todasConfirmadas = await prisma.batida.count({
    where: { ordem_id: batida.ordem_id, status: { not: 'CONFIRMADA' } }
  })

  if (todasConfirmadas === 0) {
    const totalProduzido = await prisma.batida.aggregate({
      where: { ordem_id: batida.ordem_id },
      _sum: { quantidade_produzida: true }
    })

    await prisma.ordemProducao.update({
      where: { id: batida.ordem_id },
      data: {
        status: 'CONCLUIDA',
        quantidade_realizada: totalProduzido._sum.quantidade_produzida || 0
      }
    })
  }

  io.emit('batida:confirmada', { batida_id: req.params.id, ordem_id: batida.ordem_id })
  res.json(confirmada)
}))

// Detalhes da batida
batidasRouter.get('/:id', asyncHandler(async (req, res) => {
  const batida = await prisma.batida.findUnique({
    where: { id: req.params.id },
    include: {
      ordem: {
        include: {
          produto: {
            include: {
              receita: { include: { ingredientes: { include: { ingrediente: true } } } },
              instrucoes: { orderBy: { ordem: 'asc' } }
            }
          }
        }
      },
      consumos: { include: { ingrediente: true } },
      sobras: true,
      perdas: true,
      pesagens: { orderBy: { timestamp: 'desc' } },
      custo: { include: { detalhes: true } }
    }
  })

  if (!batida) throw new AppError('Batida não encontrada', 404)
  res.json(batida)
}))
