'use client'

import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

interface ConsumoPrevisto {
  ingrediente_id: string
  ingrediente: { nome: string; unidade_medida: string }
  quantidade_prev: number
  unidade: string
}

interface Props {
  batidaId: string
  consumosPrevisto: ConsumoPrevisto[]
  metaUnidades: number
  onClose: () => void
  onSuccess: () => void
}

export function FechamentoBatida({ batidaId, consumosPrevisto, metaUnidades, onClose, onSuccess }: Props) {
  const qc = useQueryClient()
  const [quantidadeProduzida, setQuantidadeProduzida] = useState(metaUnidades)
  const [pesoTotalKg, setPesoTotalKg] = useState<number | ''>('')
  const [observacoes, setObservacoes] = useState('')
  const [consumos, setConsumos] = useState(
    consumosPrevisto.map(c => ({ ...c, quantidade_real: c.quantidade_prev }))
  )
  const [sobras, setSobras] = useState([
    { tipo: 'massa', quantidade: 0, unidade: 'KG', destino: '' },
    { tipo: 'recheio', quantidade: 0, unidade: 'KG', destino: '' },
  ])
  const [perdas, setPerdas] = useState([
    { tipo: 'massa', quantidade: 0, unidade: 'KG', motivo: '' },
    { tipo: 'recheio', quantidade: 0, unidade: 'KG', motivo: '' },
    { tipo: 'processo', quantidade: 0, unidade: 'UNIDADE', motivo: '' },
  ])

  const fecharMutation = useMutation({
    mutationFn: () => api.post(`/batidas/${batidaId}/fechar`, {
      quantidade_produzida: quantidadeProduzida,
      peso_total_kg: pesoTotalKg || undefined,
      observacoes,
      consumos: consumos.map(c => ({
        ingrediente_id: c.ingrediente_id,
        quantidade_real: c.quantidade_real,
        unidade: c.unidade
      })),
      sobras: sobras.filter(s => s.quantidade > 0),
      perdas: perdas.filter(p => p.quantidade > 0),
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['batida', batidaId] })
      onSuccess()
    }
  })

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/70">
      <div className="w-full bg-gray-900 rounded-t-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-gray-900 border-b border-gray-800 p-4 flex justify-between items-center">
          <h2 className="text-lg font-black text-white">FECHAR BATIDA</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white">✕</button>
        </div>

        <div className="p-4 space-y-6">
          {/* Quantidade produzida */}
          <section>
            <h3 className="text-yellow-400 font-bold mb-3 text-sm uppercase">Quantidade Produzida</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-400 block mb-1">Unidades produzidas *</label>
                <input
                  type="number"
                  value={quantidadeProduzida}
                  onChange={e => setQuantidadeProduzida(parseInt(e.target.value) || 0)}
                  className="w-full bg-gray-800 text-white text-xl font-bold rounded-lg px-3 py-3 border border-gray-700 focus:border-yellow-500 outline-none"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">Peso total (kg)</label>
                <input
                  type="number"
                  step="0.01"
                  value={pesoTotalKg}
                  onChange={e => setPesoTotalKg(parseFloat(e.target.value) || '')}
                  className="w-full bg-gray-800 text-white text-xl font-bold rounded-lg px-3 py-3 border border-gray-700 focus:border-yellow-500 outline-none"
                />
              </div>
            </div>
          </section>

          {/* Consumo real de ingredientes */}
          <section>
            <h3 className="text-yellow-400 font-bold mb-3 text-sm uppercase">Consumo Real de Ingredientes</h3>
            <div className="space-y-2">
              {consumos.map((c, i) => (
                <div key={c.ingrediente_id} className="flex items-center gap-3 bg-gray-800 rounded-lg p-3">
                  <div className="flex-1">
                    <p className="text-white text-sm font-medium">{c.ingrediente.nome}</p>
                    <p className="text-gray-500 text-xs">Previsto: {c.quantidade_prev.toFixed(2)} {c.unidade}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      step="0.01"
                      value={c.quantidade_real}
                      onChange={e => {
                        const novo = [...consumos]
                        novo[i] = { ...novo[i], quantidade_real: parseFloat(e.target.value) || 0 }
                        setConsumos(novo)
                      }}
                      className="w-24 bg-gray-700 text-white rounded-lg px-2 py-1 text-center border border-gray-600 focus:border-yellow-500 outline-none"
                    />
                    <span className="text-xs text-gray-500">{c.unidade}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Sobras */}
          <section>
            <h3 className="text-yellow-400 font-bold mb-3 text-sm uppercase">Sobras</h3>
            <div className="space-y-2">
              {sobras.map((s, i) => (
                <div key={s.tipo} className="flex items-center gap-3 bg-gray-800 rounded-lg p-3">
                  <span className="text-gray-300 text-sm capitalize flex-1">{s.tipo}</span>
                  <input
                    type="number"
                    step="0.01"
                    value={s.quantidade || ''}
                    placeholder="0.00"
                    onChange={e => {
                      const novo = [...sobras]
                      novo[i] = { ...novo[i], quantidade: parseFloat(e.target.value) || 0 }
                      setSobras(novo)
                    }}
                    className="w-24 bg-gray-700 text-white rounded-lg px-2 py-1 text-center border border-gray-600 outline-none"
                  />
                  <span className="text-xs text-gray-500">{s.unidade}</span>
                </div>
              ))}
            </div>
          </section>

          {/* Perdas */}
          <section>
            <h3 className="text-red-400 font-bold mb-3 text-sm uppercase">Perdas</h3>
            <div className="space-y-2">
              {perdas.map((p, i) => (
                <div key={p.tipo} className="flex items-center gap-3 bg-gray-800 rounded-lg p-3">
                  <span className="text-gray-300 text-sm capitalize flex-1">{p.tipo}</span>
                  <input
                    type="number"
                    step="0.01"
                    value={p.quantidade || ''}
                    placeholder="0.00"
                    onChange={e => {
                      const novo = [...perdas]
                      novo[i] = { ...novo[i], quantidade: parseFloat(e.target.value) || 0 }
                      setPerdas(novo)
                    }}
                    className="w-24 bg-gray-700 text-white rounded-lg px-2 py-1 text-center border border-gray-600 outline-none"
                  />
                  <span className="text-xs text-gray-500">{p.unidade}</span>
                </div>
              ))}
            </div>
          </section>

          {/* Observações */}
          <section>
            <label className="text-gray-400 text-sm block mb-2">Observações</label>
            <textarea
              value={observacoes}
              onChange={e => setObservacoes(e.target.value)}
              rows={3}
              placeholder="Alguma observação sobre essa batida..."
              className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 border border-gray-700 focus:border-yellow-500 outline-none resize-none text-sm"
            />
          </section>

          {/* Botão fechar */}
          <button
            onClick={() => fecharMutation.mutate()}
            disabled={fecharMutation.isPending}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black text-xl py-5 rounded-xl disabled:opacity-50"
          >
            {fecharMutation.isPending ? 'Fechando...' : '✓ CONFIRMAR FECHAMENTO'}
          </button>
        </div>
      </div>
    </div>
  )
}
