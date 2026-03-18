'use client'

import { useState, useEffect } from 'react'
import { useSocket } from '@/hooks/useSocket'
import clsx from 'clsx'

interface Props {
  batidaId: string
  meta: number
}

export function BalancaWidget({ batidaId, meta }: Props) {
  const socket = useSocket()
  const [pesoAtual, setPesoAtual] = useState<number | null>(null)
  const [resultado, setResultado] = useState<any>(null)
  const [modo, setModo] = useState<'POR_CAIXA' | 'ACUMULADO'>('ACUMULADO')
  const [conectada, setConectada] = useState(false)
  const [pesoManual, setPesoManual] = useState('')

  useEffect(() => {
    if (!socket) return

    socket.on('balanca:status', ({ conectada: c }: any) => setConectada(c))
    socket.on('balanca:leitura', ({ peso_kg }: any) => setPesoAtual(peso_kg))
    socket.on('balanca:resultado', (data: any) => setResultado(data))

    return () => {
      socket.off('balanca:status')
      socket.off('balanca:leitura')
      socket.off('balanca:resultado')
    }
  }, [socket])

  const confirmarPesagem = () => {
    const peso = parseFloat(pesoManual)
    if (isNaN(peso) || peso <= 0) return
    socket?.emit('balanca:pesagem_manual', { batida_id: batidaId, peso_kg: peso, modo })
    setPesoManual('')
  }

  return (
    <div className="bg-gray-900 rounded-xl border border-gray-700 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-800">
        <div className="flex items-center gap-2">
          <div className={clsx('w-2 h-2 rounded-full', conectada ? 'bg-green-400 animate-pulse' : 'bg-red-400')} />
          <span className="text-sm text-gray-300 font-medium">BALANÇA</span>
          <span className="text-xs text-gray-500">{conectada ? 'Conectada' : 'Manual'}</span>
        </div>
        <div className="flex gap-1">
          {(['ACUMULADO', 'POR_CAIXA'] as const).map(m => (
            <button
              key={m}
              onClick={() => setModo(m)}
              className={clsx('text-xs px-2 py-1 rounded', modo === m ? 'bg-yellow-500 text-black font-bold' : 'bg-gray-700 text-gray-400')}
            >
              {m === 'ACUMULADO' ? 'Acumulado' : 'Por Caixa'}
            </button>
          ))}
        </div>
      </div>

      {/* Leitura atual */}
      <div className="p-4">
        {pesoAtual !== null ? (
          <div className="text-center">
            <div className="text-5xl font-black text-green-400">{pesoAtual.toFixed(3)}</div>
            <div className="text-gray-500 text-sm">kg</div>
          </div>
        ) : (
          <div className="flex gap-2 items-center">
            <input
              type="number"
              step="0.001"
              value={pesoManual}
              onChange={e => setPesoManual(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && confirmarPesagem()}
              placeholder="Peso em kg"
              className="flex-1 bg-gray-800 text-white text-xl rounded-lg px-4 py-3 border border-gray-700 focus:border-yellow-500 outline-none text-center"
            />
            <button
              onClick={confirmarPesagem}
              className="bg-yellow-500 hover:bg-yellow-400 text-black font-black px-4 py-3 rounded-lg"
            >
              ✓
            </button>
          </div>
        )}

        {/* Resultado da pesagem */}
        {resultado && (
          <div className={clsx(
            'mt-3 rounded-lg p-3 text-center',
            resultado.dentro_tolerancia ? 'bg-green-900/50 border border-green-700' : 'bg-red-900/50 border border-red-700'
          )}>
            <div className="text-2xl font-black text-white">{resultado.unidades_calc} unidades</div>
            <div className={clsx('text-sm', resultado.dentro_tolerancia ? 'text-green-400' : 'text-red-400')}>
              {resultado.dentro_tolerancia ? '✓ Dentro da tolerância' : '⚠ Fora da tolerância'}
              {' '}({resultado.variacao_pct > 0 ? '+' : ''}{resultado.variacao_pct}%)
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
