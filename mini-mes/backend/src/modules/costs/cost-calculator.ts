import { prisma } from '../../database/client'
import { logger } from '../../utils/logger'

/**
 * Calcula o custo real de uma batida após seu fechamento.
 * Fluxo: fechar batida → obter consumo real → consultar preços → calcular custo
 */
export async function calcularCustoBatida(batida_id: string): Promise<void> {
  const batida = await prisma.batida.findUnique({
    where: { id: batida_id },
    include: {
      consumos: { include: { ingrediente: true } },
      perdas: { include: { batida: { include: { ordem: { include: { produto: true } } } } } }
    }
  })

  if (!batida) {
    logger.error(`Batida ${batida_id} não encontrada para cálculo de custo`)
    return
  }

  let custoIngredientes = 0
  const detalhes = []

  for (const consumo of batida.consumos) {
    const preco = consumo.ingrediente.custo_unitario
    const custo = consumo.quantidade_real * preco

    custoIngredientes += custo
    detalhes.push({
      ingrediente_id: consumo.ingrediente_id,
      ingrediente_nome: consumo.ingrediente.nome,
      quantidade: consumo.quantidade_real,
      preco_unitario: preco,
      custo_total: custo
    })
  }

  // Calcular custo das perdas
  let custoPerdas = 0
  for (const perda of batida.perdas) {
    // Estimativa: perdas têm custo proporcional ao custo médio dos ingredientes
    const custoMedioKg = custoIngredientes / Math.max(batida.consumos.reduce((acc, c) => acc + c.quantidade_real, 0), 1)
    custoPerdas += perda.quantidade * custoMedioKg
  }

  const custoTotal = custoIngredientes + custoPerdas
  const quantidadeProduzida = batida.quantidade_produzida || 1
  const custoUnitario = custoTotal / quantidadeProduzida

  await prisma.custoBatida.upsert({
    where: { batida_id },
    create: {
      batida_id,
      custo_total: custoTotal,
      custo_unitario: custoUnitario,
      custo_perdas: custoPerdas,
      custo_ingredientes: custoIngredientes,
      detalhes: { createMany: { data: detalhes } }
    },
    update: {
      custo_total: custoTotal,
      custo_unitario: custoUnitario,
      custo_perdas: custoPerdas,
      custo_ingredientes: custoIngredientes
    }
  })

  logger.info(`Custo calculado para batida ${batida_id}: R$ ${custoTotal.toFixed(2)} (unit: R$ ${custoUnitario.toFixed(4)})`)
}
