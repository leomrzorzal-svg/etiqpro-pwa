import { Router } from 'express'
import { prisma } from '../../database/client'
import { asyncHandler } from '../../middleware/asyncHandler'
import dayjs from 'dayjs'

export const dashboardRouter = Router()

// Dashboard principal - Produção do dia
dashboardRouter.get('/producao-dia', asyncHandler(async (req, res) => {
  const data = (req.query.data as string) || dayjs().format('YYYY-MM-DD')
  const inicio = new Date(data + 'T00:00:00')
  const fim = new Date(data + 'T23:59:59')

  const ordens = await prisma.ordemProducao.findMany({
    where: { data_planejada: { gte: inicio, lte: fim } },
    include: {
      produto: { select: { nome: true, tipo_producao: true, foto_url: true } },
      batidas: true
    }
  })

  const resumo = ordens.map(op => {
    const batidasConcluidas = op.batidas.filter(b => ['FECHADA', 'CONFIRMADA'].includes(b.status)).length
    const totalProduzido = op.batidas.reduce((acc, b) => acc + b.quantidade_produzida, 0)
    const eficiencia = op.quantidade_planejada > 0
      ? Math.round((totalProduzido / op.quantidade_planejada) * 100)
      : 0

    return {
      op_id: op.id,
      codigo: op.codigo,
      produto: op.produto.nome,
      foto: op.produto.foto_url,
      tipo_producao: op.produto.tipo_producao,
      maquina: op.maquina,
      status: op.status,
      quantidade_planejada: op.quantidade_planejada,
      quantidade_produzida: totalProduzido,
      eficiencia_pct: eficiencia,
      total_batidas: op.batidas.length,
      batidas_concluidas: batidasConcluidas,
      batidas_pendentes: op.batidas.filter(b => b.status === 'PENDENTE').length,
      batida_ativa: op.batidas.find(b => b.status === 'INICIADA') || null
    }
  })

  // Totais por máquina
  const porMaquina = groupBy(resumo, 'maquina')
  const totais = {
    planejado: ordens.reduce((acc, op) => acc + op.quantidade_planejada, 0),
    produzido: resumo.reduce((acc, op) => acc + op.quantidade_produzida, 0),
    ops_total: ordens.length,
    ops_concluidas: ordens.filter(op => op.status === 'CONCLUIDA').length,
    ops_em_andamento: ordens.filter(op => op.status === 'EM_ANDAMENTO').length,
  }

  res.json({ data, resumo, totais, por_maquina: porMaquina })
}))

// Indicadores de produtividade
dashboardRouter.get('/indicadores', asyncHandler(async (req, res) => {
  const dias = parseInt(req.query.dias as string) || 7
  const inicio = dayjs().subtract(dias, 'day').toDate()

  // Produzido vs Planejado por produto
  const porProduto = await prisma.ordemProducao.groupBy({
    by: ['produto_id'],
    where: { data_planejada: { gte: inicio }, status: 'CONCLUIDA' },
    _sum: { quantidade_planejada: true, quantidade_realizada: true }
  })

  // Tempo médio por batida por produto
  const tempoMedioBatida = await prisma.batida.findMany({
    where: {
      status: 'CONFIRMADA',
      iniciada_em: { gte: inicio },
      fechada_em: { not: null }
    },
    select: {
      iniciada_em: true,
      fechada_em: true,
      ordem: { select: { produto: { select: { nome: true } }, maquina: true } }
    }
  })

  // Perdas por produto
  const perdas = await prisma.perdaBatida.groupBy({
    by: ['tipo'],
    where: { batida: { iniciada_em: { gte: inicio } } },
    _sum: { quantidade: true }
  })

  // Custo total período
  const custoTotal = await prisma.custoBatida.aggregate({
    where: { batida: { iniciada_em: { gte: inicio } } },
    _sum: { custo_total: true, custo_perdas: true }
  })

  // Calcular eficiência por máquina
  const ordens = await prisma.ordemProducao.findMany({
    where: { data_planejada: { gte: inicio } },
    select: { maquina: true, quantidade_planejada: true, quantidade_realizada: true, status: true }
  })

  const eficienciaMaquina = Object.entries(groupBy(ordens, 'maquina')).map(([maquina, ops]) => ({
    maquina,
    planejado: ops.reduce((acc: number, op: any) => acc + op.quantidade_planejada, 0),
    realizado: ops.reduce((acc: number, op: any) => acc + op.quantidade_realizada, 0),
    eficiencia_pct: 0
  })).map(e => ({
    ...e,
    eficiencia_pct: e.planejado > 0 ? Math.round((e.realizado / e.planejado) * 100) : 0
  }))

  res.json({
    periodo_dias: dias,
    por_produto: porProduto,
    eficiencia_maquina: eficienciaMaquina,
    ranking_perdas: perdas.sort((a, b) => (b._sum.quantidade || 0) - (a._sum.quantidade || 0)),
    custo_total: custoTotal._sum.custo_total || 0,
    custo_perdas: custoTotal._sum.custo_perdas || 0
  })
}))

// Consumo previsto vs real por período
dashboardRouter.get('/consumo-ingredientes', asyncHandler(async (req, res) => {
  const inicio = dayjs().subtract(7, 'day').toDate()

  const consumos = await prisma.consumoBatida.findMany({
    where: { batida: { status: 'CONFIRMADA', fechada_em: { gte: inicio } } },
    include: { ingrediente: { select: { nome: true, unidade_medida: true, custo_unitario: true } } }
  })

  const agrupado = consumos.reduce((acc: any, c) => {
    const key = c.ingrediente_id
    if (!acc[key]) acc[key] = {
      ingrediente: c.ingrediente.nome,
      unidade: c.ingrediente.unidade_medida,
      custo_unitario: c.ingrediente.custo_unitario,
      previsto: 0,
      real: 0
    }
    acc[key].previsto += c.quantidade_prev
    acc[key].real += c.quantidade_real
    return acc
  }, {})

  const resultado = Object.values(agrupado).map((item: any) => ({
    ...item,
    diferenca: item.real - item.previsto,
    variacao_pct: item.previsto > 0 ? Math.round(((item.real - item.previsto) / item.previsto) * 100) : 0,
    custo_real: item.real * item.custo_unitario
  }))

  res.json(resultado.sort((a: any, b: any) => Math.abs(b.variacao_pct) - Math.abs(a.variacao_pct)))
}))

function groupBy(arr: any[], key: string) {
  return arr.reduce((acc, item) => {
    const k = item[key]
    if (!acc[k]) acc[k] = []
    acc[k].push(item)
    return acc
  }, {} as Record<string, any[]>)
}
