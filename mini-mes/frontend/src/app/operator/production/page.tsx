'use client'

import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import dayjs from 'dayjs'
import { api } from '@/lib/api'
import { OrdemCard } from '@/components/operator/OrdemCard'
import { ResumoTurno } from '@/components/operator/ResumoTurno'
import { AssistenteIA } from '@/components/ai/AssistenteIA'
import { StatusMaquina } from '@/components/operator/StatusMaquina'

export default function ProducaoDiaPage() {
  const hoje = dayjs().format('YYYY-MM-DD')

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['producao-dia', hoje],
    queryFn: () => api.get(`/dashboard/producao-dia?data=${hoje}`).then(r => r.data),
    refetchInterval: 30_000 // atualiza a cada 30s
  })

  if (isLoading) return <TelaCarregando />

  const { resumo = [], totais = {}, por_maquina = {} } = data || {}

  return (
    <div className="min-h-screen bg-gray-950 text-white p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-yellow-400">PRODUÇÃO DO DIA</h1>
          <p className="text-gray-400 text-sm">{dayjs().format('dddd, DD/MM/YYYY')}</p>
        </div>
        <div className="text-right">
          <div className="text-3xl font-black text-green-400">
            {totais.produzido?.toLocaleString() || '0'}
          </div>
          <div className="text-gray-400 text-xs">de {totais.planejado?.toLocaleString()} planejados</div>
        </div>
      </div>

      {/* Resumo rápido */}
      <ResumoTurno totais={totais} />

      {/* Status máquinas */}
      <StatusMaquina porMaquina={por_maquina} />

      {/* Lista de Ordens de Produção */}
      <div className="mt-6 space-y-3">
        <h2 className="text-lg font-semibold text-gray-300 uppercase tracking-wider">Ordens de Produção</h2>

        {resumo.length === 0 ? (
          <div className="text-center py-12 text-gray-600">
            <div className="text-5xl mb-3">🏭</div>
            <p>Nenhuma produção planejada para hoje</p>
          </div>
        ) : (
          resumo.map((op: any) => (
            <OrdemCard key={op.op_id} op={op} onUpdate={refetch} />
          ))
        )}
      </div>

      {/* Assistente IA flutuante */}
      <AssistenteIA />
    </div>
  )
}

function TelaCarregando() {
  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-yellow-400 mx-auto mb-4" />
        <p className="text-gray-400">Carregando produção...</p>
      </div>
    </div>
  )
}
