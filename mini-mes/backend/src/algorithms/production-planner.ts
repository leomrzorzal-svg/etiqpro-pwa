/**
 * Algoritmo de Planejamento Automático de Produção
 * Mini MES - La Miguelita Salgados
 *
 * Objetivos:
 * - Reduzir trocas de máquina
 * - Reduzir tempo de setup
 * - Balancear carga entre máquinas
 * - Evitar gargalos
 */

import { TipoProducao, TipoMaquina, PrioridadePedido } from '@prisma/client'
import { prisma } from '../database/client'
import dayjs from 'dayjs'

// =============================================
// CONSTANTES DE CAPACIDADE
// =============================================

const CAPACIDADE_MAQUINA: Record<TipoMaquina, { capacidade_turno: number; tempo_setup_min: number }> = {
  USIFOOD_1:  { capacidade_turno: 4000, tempo_setup_min: 15 },
  USIFOOD_2:  { capacidade_turno: 4000, tempo_setup_min: 15 },
  MCI:        { capacidade_turno: 2500, tempo_setup_min: 20 },
  MESA_1:     { capacidade_turno: 600,  tempo_setup_min: 5  },
  MESA_2:     { capacidade_turno: 600,  tempo_setup_min: 5  },
  MESA_3:     { capacidade_turno: 600,  tempo_setup_min: 5  },
}

const PRIORIDADE_PESO: Record<PrioridadePedido, number> = {
  URGENTE: 4,
  ALTA:    3,
  MEDIA:   2,
  BAIXA:   1,
}

export interface ItemPlanejamento {
  produto_id: string
  produto_nome: string
  tipo_producao: TipoProducao
  maquinas_permitidas: TipoMaquina[]
  quantidade: number
  prioridade: PrioridadePedido
  tempo_medio_min: number
  lote_ideal: number
  lote_maximo_batida: number
  pedido_ref?: string
}

export interface SlotMaquina {
  maquina: TipoMaquina
  data: string
  turno: 'MANHA' | 'TARDE' | 'NOITE'
  capacidade_usada: number
  capacidade_total: number
  itens: ItemAgendado[]
}

export interface ItemAgendado {
  produto_id: string
  produto_nome: string
  quantidade: number
  horario_inicio: string
  horario_fim: string
  num_batidas: number
  prioridade: PrioridadePedido
}

export interface PlanoSemanalGerado {
  semana_inicio: string
  semana_fim: string
  agenda: SlotMaquina[]
  metricas: {
    total_produtos: number
    total_unidades: number
    ocupacao_media_pct: number
    trocas_maquina: number
    produtos_nao_alocados: string[]
  }
}

// =============================================
// ALGORITMO PRINCIPAL
// =============================================

export async function gerarPlanoSemanal(
  semanaInicio: Date,
  itens: ItemPlanejamento[]
): Promise<PlanoSemanalGerado> {
  const dias = Array.from({ length: 5 }, (_, i) => dayjs(semanaInicio).add(i, 'day'))
  const turnos: ('MANHA' | 'TARDE' | 'NOITE')[] = ['MANHA', 'TARDE']

  // Inicializar slots
  const slots: SlotMaquina[] = []
  for (const dia of dias) {
    for (const turno of turnos) {
      for (const [maquina, cap] of Object.entries(CAPACIDADE_MAQUINA)) {
        slots.push({
          maquina: maquina as TipoMaquina,
          data: dia.format('YYYY-MM-DD'),
          turno,
          capacidade_usada: 0,
          capacidade_total: cap.capacidade_turno,
          itens: []
        })
      }
    }
  }

  // PASSO 1: Ordenar itens por score de prioridade
  const itensOrdenados = ordenarPorPrioridade(itens)

  // PASSO 2: Agrupar por tipo de produção para minimizar setups
  const grupoAssados = itensOrdenados.filter(i => i.tipo_producao === 'ASSADO')
  const grupoFritos  = itensOrdenados.filter(i => i.tipo_producao === 'FRITO')
  const grupoManuais = itensOrdenados.filter(i => i.tipo_producao === 'MANUAL')

  const naoAlocados: string[] = []

  // PASSO 3: Alocar assados nas Usifoods (balanceando)
  for (const item of grupoAssados) {
    const alocado = alocarItem(item, slots, ['USIFOOD_1', 'USIFOOD_2'])
    if (!alocado) naoAlocados.push(item.produto_nome)
  }

  // PASSO 4: Alocar fritos na MCI
  for (const item of grupoFritos) {
    const alocado = alocarItem(item, slots, ['MCI'])
    if (!alocado) naoAlocados.push(item.produto_nome)
  }

  // PASSO 5: Alocar manuais nas mesas
  for (const item of grupoManuais) {
    const alocado = alocarItem(item, slots, ['MESA_1', 'MESA_2', 'MESA_3'])
    if (!alocado) naoAlocados.push(item.produto_nome)
  }

  // Calcular métricas
  const slotsUsados = slots.filter(s => s.itens.length > 0)
  const ocupacaoMedia = slotsUsados.reduce((acc, s) => acc + (s.capacidade_usada / s.capacidade_total), 0) / Math.max(slotsUsados.length, 1) * 100
  const trocas = calcularTrocasMaquina(slots)

  return {
    semana_inicio: dayjs(semanaInicio).format('YYYY-MM-DD'),
    semana_fim: dayjs(semanaInicio).add(4, 'day').format('YYYY-MM-DD'),
    agenda: slots.filter(s => s.itens.length > 0),
    metricas: {
      total_produtos: itens.length,
      total_unidades: itens.reduce((acc, i) => acc + i.quantidade, 0),
      ocupacao_media_pct: Math.round(ocupacaoMedia),
      trocas_maquina: trocas,
      produtos_nao_alocados: naoAlocados
    }
  }
}

// Ordenar itens por: prioridade > volume > tipo_producao
function ordenarPorPrioridade(itens: ItemPlanejamento[]): ItemPlanejamento[] {
  return [...itens].sort((a, b) => {
    const prioA = PRIORIDADE_PESO[a.prioridade]
    const prioB = PRIORIDADE_PESO[b.prioridade]
    if (prioB !== prioA) return prioB - prioA
    return b.quantidade - a.quantidade // maior volume primeiro
  })
}

// Alocar um item no melhor slot disponível
function alocarItem(
  item: ItemPlanejamento,
  slots: SlotMaquina[],
  maquinasPreferidas: TipoMaquina[]
): boolean {
  const capacidadeNecessaria = item.quantidade

  // Buscar slot com menor ocupação que ainda caiba o item
  const slotsDisponiveis = slots
    .filter(s =>
      maquinasPreferidas.includes(s.maquina) &&
      (s.capacidade_total - s.capacidade_usada) >= Math.min(capacidadeNecessaria, item.lote_maximo_batida)
    )
    .sort((a, b) => {
      // Preferir slot do mesmo dia com mesmo tipo de produto (evitar troca)
      const ultimoMesmoTipo = a.itens.length > 0 && b.itens.length > 0 ? 0 : -1
      const ocupacaoA = a.capacidade_usada / a.capacidade_total
      const ocupacaoB = b.capacidade_usada / b.capacidade_total
      return ultimoMesmoTipo || ocupacaoA - ocupacaoB
    })

  if (slotsDisponiveis.length === 0) return false

  const slot = slotsDisponiveis[0]
  const quantidadeAlocada = Math.min(capacidadeNecessaria, slot.capacidade_total - slot.capacidade_usada)
  const numBatidas = Math.ceil(quantidadeAlocada / item.lote_maximo_batida)

  const minutosUsados = slot.itens.reduce((acc, i) => acc + calcularTempo(i.quantidade, item.tempo_medio_min, item.lote_ideal), 0)
  const horarioInicio = calcularHorario(slot.turno, minutosUsados)
  const duracao = calcularTempo(quantidadeAlocada, item.tempo_medio_min, item.lote_ideal)

  slot.itens.push({
    produto_id: item.produto_id,
    produto_nome: item.produto_nome,
    quantidade: quantidadeAlocada,
    horario_inicio: horarioInicio,
    horario_fim: adicionarMinutos(horarioInicio, duracao),
    num_batidas: numBatidas,
    prioridade: item.prioridade
  })

  slot.capacidade_usada += quantidadeAlocada
  return true
}

function calcularTempo(quantidade: number, tempoMedioMin: number, loteIdeal: number): number {
  const batidas = Math.ceil(quantidade / loteIdeal)
  return batidas * tempoMedioMin
}

function calcularHorario(turno: string, offsetMinutos: number): string {
  const inicios: Record<string, number> = { MANHA: 6 * 60, TARDE: 14 * 60, NOITE: 22 * 60 }
  const totalMinutos = (inicios[turno] || 0) + offsetMinutos
  const h = Math.floor(totalMinutos / 60) % 24
  const m = totalMinutos % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

function adicionarMinutos(hora: string, minutos: number): string {
  const [h, m] = hora.split(':').map(Number)
  const total = h * 60 + m + minutos
  const nh = Math.floor(total / 60) % 24
  const nm = total % 60
  return `${String(nh).padStart(2, '0')}:${String(nm).padStart(2, '0')}`
}

function calcularTrocasMaquina(slots: SlotMaquina[]): number {
  let trocas = 0
  for (const slot of slots) {
    for (let i = 1; i < slot.itens.length; i++) {
      if (slot.itens[i].produto_id !== slot.itens[i - 1].produto_id) trocas++
    }
  }
  return trocas
}

// =============================================
// GERADOR DE BATIDAS
// =============================================

export async function gerarBatidasOP(op: any, produto: any) {
  const loteMax = op.lote_maximo_batida || produto.lote_maximo_batida
  const totalBatidas = Math.ceil(op.quantidade_planejada / loteMax)

  const batidas = []
  let quantidadeRestante = op.quantidade_planejada

  for (let i = 1; i <= totalBatidas; i++) {
    const meta = Math.min(loteMax, quantidadeRestante)
    quantidadeRestante -= meta

    // Calcular consumo previsto por ingrediente (proporcional ao lote)
    const fator = meta / produto.lote_ideal
    const consumos = produto.receita?.ingredientes?.map((ri: any) => ({
      ingrediente_id: ri.ingrediente_id,
      quantidade_prev: ri.quantidade * fator,
      quantidade_real: 0,
      unidade: ri.unidade,
      diferenca: 0
    })) || []

    const batida = await prisma.batida.create({
      data: {
        ordem_id: op.id,
        numero_batida: i,
        total_batidas: totalBatidas,
        quantidade_meta: meta,
        status: 'PENDENTE',
        consumos: { createMany: { data: consumos } }
      }
    })

    batidas.push(batida)
  }

  return batidas
}
