'use client'

import { useState, useRef, useEffect } from 'react'
import { useMutation } from '@tanstack/react-query'
import { api } from '@/lib/api'
import clsx from 'clsx'

interface Props {
  contexto?: { batida_id?: string; produto_id?: string }
}

interface Mensagem {
  tipo: 'user' | 'ia'
  texto: string
}

const PERGUNTAS_RAPIDAS = [
  'Qual o peso da coxinha?',
  'Quantas unidades por caixa?',
  'Temperatura da fritura?',
  'Procedimento de higiene das mãos',
  'Como fazer esfirra?',
]

export function AssistenteIA({ contexto }: Props) {
  const [aberto, setAberto] = useState(false)
  const [mensagem, setMensagem] = useState('')
  const [historico, setHistorico] = useState<Mensagem[]>([])
  const scrollRef = useRef<HTMLDivElement>(null)

  const chatMutation = useMutation({
    mutationFn: (texto: string) =>
      api.post('/ia/chat', { mensagem: texto, contexto }).then(r => r.data),
    onSuccess: (data, variavel) => {
      setHistorico(prev => [
        ...prev,
        { tipo: 'user', texto: variavel },
        { tipo: 'ia', texto: data.resposta }
      ])
      setMensagem('')
    }
  })

  const enviar = (texto: string) => {
    if (!texto.trim() || chatMutation.isPending) return
    chatMutation.mutate(texto)
  }

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [historico])

  return (
    <>
      {/* Botão flutuante */}
      <button
        onClick={() => setAberto(true)}
        className="fixed bottom-6 right-6 w-16 h-16 bg-yellow-500 hover:bg-yellow-400 rounded-full shadow-2xl flex items-center justify-center text-2xl z-40 transition-transform hover:scale-110"
        title="Assistente IA"
      >
        🤖
      </button>

      {/* Painel do assistente */}
      {aberto && (
        <div className="fixed inset-0 z-50 flex items-end justify-end p-4">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/60" onClick={() => setAberto(false)} />

          <div className="relative w-full max-w-sm bg-gray-900 rounded-2xl shadow-2xl border border-gray-700 flex flex-col h-[70vh]">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-800">
              <div className="flex items-center gap-2">
                <span className="text-2xl">🤖</span>
                <div>
                  <h3 className="font-bold text-white">Assistente de Produção</h3>
                  <p className="text-xs text-green-400">Online</p>
                </div>
              </div>
              <button onClick={() => setAberto(false)} className="text-gray-500 hover:text-white text-xl">✕</button>
            </div>

            {/* Histórico */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {historico.length === 0 && (
                <div>
                  <p className="text-gray-500 text-sm text-center mb-4">Olá! Como posso ajudar?</p>
                  <div className="space-y-2">
                    {PERGUNTAS_RAPIDAS.map(q => (
                      <button
                        key={q}
                        onClick={() => enviar(q)}
                        className="w-full text-left text-sm bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg px-3 py-2 transition-colors"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {historico.map((msg, i) => (
                <div key={i} className={clsx('flex', msg.tipo === 'user' ? 'justify-end' : 'justify-start')}>
                  <div className={clsx(
                    'max-w-[85%] rounded-2xl px-4 py-2 text-sm',
                    msg.tipo === 'user'
                      ? 'bg-yellow-500 text-black font-medium'
                      : 'bg-gray-800 text-white'
                  )}>
                    {msg.texto}
                  </div>
                </div>
              ))}

              {chatMutation.isPending && (
                <div className="flex justify-start">
                  <div className="bg-gray-800 rounded-2xl px-4 py-2">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}
              <div ref={scrollRef} />
            </div>

            {/* Input */}
            <div className="p-3 border-t border-gray-800">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={mensagem}
                  onChange={e => setMensagem(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && enviar(mensagem)}
                  placeholder="Pergunte algo..."
                  className="flex-1 bg-gray-800 text-white rounded-xl px-4 py-2 text-sm border border-gray-700 focus:border-yellow-500 outline-none"
                />
                <button
                  onClick={() => enviar(mensagem)}
                  disabled={!mensagem.trim() || chatMutation.isPending}
                  className="bg-yellow-500 hover:bg-yellow-400 text-black font-bold px-4 rounded-xl disabled:opacity-40"
                >
                  →
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
