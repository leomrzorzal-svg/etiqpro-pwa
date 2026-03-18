'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { IngredientesList } from '@/components/operator/IngredientesList'
import { BalancaWidget } from '@/components/operator/BalancaWidget'
import { FechamentoBatida } from '@/components/operator/FechamentoBatida'
import { InstrucoesProduto } from '@/components/operator/InstrucoesProduto'
import { AssistenteIA } from '@/components/ai/AssistenteIA'
import { useSocket } from '@/hooks/useSocket'
import clsx from 'clsx'

const STATUS_CORES: Record<string, string> = {
  PENDENTE:   'bg-gray-700 text-gray-300',
  INICIADA:   'bg-green-600 text-white animate-pulse',
  PAUSADA:    'bg-yellow-600 text-white',
  FECHADA:    'bg-blue-600 text-white',
  CONFIRMADA: 'bg-purple-600 text-white',
}

export default function TelaBatidaPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const qc = useQueryClient()
  const socket = useSocket()
  const [abaAtiva, setAbaAtiva] = useState<'operacao' | 'ingredientes' | 'instrucoes'>('operacao')
  const [mostrarFechamento, setMostrarFechamento] = useState(false)

  const { data: batida, isLoading } = useQuery({
    queryKey: ['batida', id],
    queryFn: () => api.get(`/batidas/${id}`).then(r => r.data),
    refetchInterval: 10_000
  })

  const iniciarMutation = useMutation({
    mutationFn: () => api.post(`/batidas/${id}/iniciar`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['batida', id] })
  })

  const pausarMutation = useMutation({
    mutationFn: () => api.post(`/batidas/${id}/pausar`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['batida', id] })
  })

  // Escutar eventos da balança em tempo real
  useEffect(() => {
    if (!socket || !id) return
    socket.emit('balanca:iniciar', { batida_id: id, modo: 'ACUMULADO' })
    return () => socket.off('balanca:resultado')
  }, [socket, id])

  if (isLoading || !batida) return <div className="min-h-screen bg-gray-950 flex items-center justify-center">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-400" />
  </div>

  const { ordem, consumos, sobras, perdas } = batida
  const produto = ordem.produto
  const progresso = Math.round((batida.quantidade_produzida / batida.quantidade_meta) * 100)

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header da batida */}
      <div className="bg-gray-900 px-4 py-3 border-b border-gray-800">
        <div className="flex items-center justify-between">
          <button onClick={() => router.back()} className="text-gray-400 hover:text-white">← Voltar</button>
          <span className={clsx('px-3 py-1 rounded-full text-sm font-bold', STATUS_CORES[batida.status])}>
            {batida.status}
          </span>
        </div>

        <div className="mt-2 flex items-center gap-3">
          {produto.foto_url && (
            <img src={produto.foto_url} alt={produto.nome} className="w-14 h-14 rounded-lg object-cover" />
          )}
          <div>
            <h1 className="text-xl font-black text-yellow-400">{produto.nome.toUpperCase()}</h1>
            <p className="text-gray-400 text-sm">
              Batida {batida.numero_batida} de {batida.total_batidas} • OP: {ordem.codigo}
            </p>
          </div>
        </div>
      </div>

      {/* Meta e progresso */}
      <div className="px-4 py-3 bg-gray-900 border-b border-gray-800">
        <div className="flex justify-between items-center mb-2">
          <span className="text-gray-400 text-sm">PRODUZIDO</span>
          <span className="text-2xl font-black text-white">
            {batida.quantidade_produzida}
            <span className="text-gray-500 text-lg"> / {batida.quantidade_meta}</span>
          </span>
        </div>
        <div className="w-full bg-gray-800 rounded-full h-4">
          <div
            className={clsx('h-4 rounded-full transition-all', progresso >= 100 ? 'bg-green-500' : 'bg-yellow-500')}
            style={{ width: `${Math.min(progresso, 100)}%` }}
          />
        </div>
        <div className="flex justify-between mt-1">
          <span className="text-xs text-gray-500">{progresso}% concluído</span>
          <span className="text-xs text-gray-500">{batida.quantidade_meta - batida.quantidade_produzida} restantes</span>
        </div>
      </div>

      {/* Abas */}
      <div className="flex border-b border-gray-800 bg-gray-900">
        {['operacao', 'ingredientes', 'instrucoes'].map(aba => (
          <button
            key={aba}
            onClick={() => setAbaAtiva(aba as any)}
            className={clsx('flex-1 py-3 text-sm font-semibold uppercase tracking-wider',
              abaAtiva === aba ? 'text-yellow-400 border-b-2 border-yellow-400' : 'text-gray-500'
            )}
          >
            {aba === 'operacao' ? 'Operação' : aba === 'ingredientes' ? 'Ingredientes' : 'Instruções'}
          </button>
        ))}
      </div>

      {/* Conteúdo da aba */}
      <div className="p-4">
        {abaAtiva === 'operacao' && (
          <div className="space-y-4">
            <BalancaWidget batidaId={id} meta={batida.quantidade_meta} />

            {/* Botões de ação */}
            <div className="grid grid-cols-2 gap-3 mt-4">
              {batida.status === 'PENDENTE' && (
                <button
                  onClick={() => iniciarMutation.mutate()}
                  disabled={iniciarMutation.isPending}
                  className="col-span-2 bg-green-600 hover:bg-green-500 text-white font-black text-xl py-5 rounded-xl disabled:opacity-50"
                >
                  {iniciarMutation.isPending ? 'Iniciando...' : '▶ INICIAR BATIDA'}
                </button>
              )}

              {batida.status === 'INICIADA' && (
                <>
                  <button
                    onClick={() => pausarMutation.mutate()}
                    className="bg-yellow-600 hover:bg-yellow-500 text-white font-bold py-4 rounded-xl text-lg"
                  >
                    ⏸ PAUSAR
                  </button>
                  <button
                    onClick={() => setMostrarFechamento(true)}
                    className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-xl text-lg"
                  >
                    ✓ FECHAR
                  </button>
                </>
              )}

              {batida.status === 'PAUSADA' && (
                <>
                  <button
                    onClick={() => iniciarMutation.mutate()}
                    className="bg-green-600 hover:bg-green-500 text-white font-bold py-4 rounded-xl text-lg"
                  >
                    ▶ RETOMAR
                  </button>
                  <button
                    onClick={() => setMostrarFechamento(true)}
                    className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-xl text-lg"
                  >
                    ✓ FECHAR
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {abaAtiva === 'ingredientes' && (
          <IngredientesList consumos={consumos} status={batida.status} />
        )}

        {abaAtiva === 'instrucoes' && (
          <InstrucoesProduto instrucoes={produto.instrucoes || []} />
        )}
      </div>

      {/* Modal de fechamento */}
      {mostrarFechamento && (
        <FechamentoBatida
          batidaId={id}
          consumosPrevisto={consumos}
          metaUnidades={batida.quantidade_meta}
          onClose={() => setMostrarFechamento(false)}
          onSuccess={() => { setMostrarFechamento(false); router.back() }}
        />
      )}

      {/* Assistente IA com contexto da batida */}
      <AssistenteIA contexto={{ batida_id: id, produto_id: produto.id }} />
    </div>
  )
}
