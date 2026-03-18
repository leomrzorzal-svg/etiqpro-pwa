import React, { useState, useEffect } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { getResumoDescartes, getEtiquetas } from '../lib/db'
import { format, subDays } from 'date-fns'
import { ptBR } from 'date-fns/locale'

const CORES = ['#E67E00','#C62828','#1565C0','#2E7D32','#C46C00','#6A1B9A']

export default function PaginaRelatorios() {
  const [resumo, setResumo]     = useState(null)
  const [vencendo, setVencendo] = useState([])
  const [loading, setLoading]   = useState(true)
  const [periodo, setPeriodo]   = useState(30)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      getResumoDescartes(periodo),
      getEtiquetas({ status: 'ativa', limit: 100 })
    ]).then(([res, etqs]) => {
      setResumo(res)
      // Filtrar vencendo em 2 dias
      const limite = format(subDays(new Date(), -2), 'yyyy-MM-dd')
      const hoje   = format(new Date(), 'yyyy-MM-dd')
      setVencendo(etqs.filter(e => e.data_validade >= hoje && e.data_validade <= limite))
      setLoading(false)
    })
  }, [periodo])

  if (loading) return <div className="spinner" />

  return (
    <div>
      <h2 style={{fontSize:18, fontWeight:800, marginBottom:16}}>Relatórios</h2>

      {/* Selector período */}
      <div style={{display:'flex', gap:8, marginBottom:16}}>
        {[7,15,30,60].map(d => (
          <button key={d} onClick={() => setPeriodo(d)} style={{
            padding:'6px 14px', borderRadius:20, border:'2px solid',
            borderColor: periodo===d ? 'var(--laranja)' : 'var(--cinza2)',
            background: periodo===d ? 'var(--laranja)' : 'transparent',
            color: periodo===d ? '#fff' : 'var(--texto)',
            fontWeight:600, fontSize:12, cursor:'pointer'
          }}>{d} dias</button>
        ))}
      </div>

      {/* Cards resumo */}
      <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:16}}>
        <div className="card" style={{textAlign:'center', padding:'14px 8px'}}>
          <div style={{fontSize:36, fontWeight:900, color:'var(--vermelho)'}}>{resumo?.total || 0}</div>
          <div style={{fontSize:11, color:'var(--cinza3)', fontWeight:600, textTransform:'uppercase'}}>Descartes</div>
        </div>
        <div className="card" style={{textAlign:'center', padding:'14px 8px'}}>
          <div style={{fontSize:36, fontWeight:900, color:'var(--amarelo)'}}>{vencendo.length}</div>
          <div style={{fontSize:11, color:'var(--cinza3)', fontWeight:600, textTransform:'uppercase'}}>Vencendo hoje/amanhã</div>
        </div>
      </div>

      {/* Alertas de vencimento */}
      {vencendo.length > 0 && (
        <div className="card" style={{borderLeft:'4px solid var(--amarelo)', marginBottom:16}}>
          <div className="card-title" style={{color:'var(--amarelo)', marginBottom:10}}>⚠️ Atenção — Produtos vencendo em breve</div>
          {vencendo.map(e => (
            <div key={e.id} className="list-item">
              <div className="list-item-info">
                <h4>{e.produto?.nome}</h4>
                <p>Validade: {e.data_validade} · Op: {e.operador}</p>
              </div>
              <span className="badge badge-alerta">Urgente</span>
            </div>
          ))}
        </div>
      )}

      {/* Gráfico por produto */}
      {resumo?.porProduto?.length > 0 && (
        <div className="card" style={{marginBottom:16}}>
          <div className="card-title" style={{marginBottom:12}}>📦 Descartes por produto</div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={resumo.porProduto.slice(0,6)} layout="vertical" margin={{left:0,right:20}}>
              <XAxis type="number" tick={{fontSize:10}} />
              <YAxis type="category" dataKey="nome" tick={{fontSize:10}} width={90} />
              <Tooltip />
              <Bar dataKey="qtd" radius={[0,4,4,0]}>
                {resumo.porProduto.slice(0,6).map((_, i) => (
                  <Cell key={i} fill={CORES[i % CORES.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Gráfico por dia */}
      {resumo?.porDia?.length > 0 && (
        <div className="card">
          <div className="card-title" style={{marginBottom:12}}>📅 Descartes por dia</div>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={resumo.porDia} margin={{left:-20,right:10}}>
              <XAxis dataKey="dia" tick={{fontSize:9}} tickFormatter={d => d.slice(5)} />
              <YAxis tick={{fontSize:9}} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="qtd" fill="#E67E00" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {resumo?.total === 0 && (
        <div style={{textAlign:'center', padding:'40px 0', color:'var(--cinza3)'}}>
          <div style={{fontSize:40, marginBottom:8}}>📊</div>
          <p>Nenhum descarte nos últimos {periodo} dias</p>
        </div>
      )}
    </div>
  )
}
