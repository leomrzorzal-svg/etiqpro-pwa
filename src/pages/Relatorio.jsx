import { useState, useEffect } from 'react'
import { getDescartes, getVencimentosProximos, getRelatorioDesperdicioGrupo } from '../lib/db'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { format, subDays, startOfDay } from 'date-fns'

const CORES = ['#E53935','#FB8C00','#43A047','#1E88E5','#8E24AA','#F4511E','#00ACC1']

export default function Relatorio() {
  const [aba, setAba]               = useState('desperdicio')
  const [grafico, setGrafico]       = useState([])
  const [vencimentos, setVencimentos] = useState([])
  const [periodo, setPeriodo]       = useState(7)
  const [loading, setLoading]       = useState(false)

  async function carregar() {
    setLoading(true)
    const fim   = new Date().toISOString()
    const inicio = subDays(new Date(), periodo).toISOString()

    const [grupos, venc] = await Promise.all([
      getRelatorioDesperdicioGrupo(inicio, fim),
      getVencimentosProximos(2),
    ])
    setGrafico(grupos)
    setVencimentos(venc)
    setLoading(false)
  }

  useEffect(() => { carregar() }, [periodo])

  const totalDescartes = grafico.reduce((s, g) => s + g.total, 0)

  return (
    <div style={{ maxWidth:480, margin:'0 auto' }}>
      <h2 style={{ margin:'0 0 12px', color:'#1A1208' }}>📊 Relatórios</h2>

      {/* Abas */}
      <div style={{ display:'flex', gap:8, marginBottom:16 }}>
        {[['desperdicio','📦 Desperdício'], ['vencimentos','⚠️ Vencimentos']].map(([id, label]) => (
          <button key={id} onClick={() => setAba(id)}
            style={{ flex:1, padding:10, borderRadius:8, border:'none', fontSize:13, fontWeight:'bold', cursor:'pointer',
                     background: aba===id ? '#E67E00' : '#eee', color: aba===id ? '#fff' : '#555' }}>
            {label}
          </button>
        ))}
      </div>

      {aba === 'desperdicio' && (
        <>
          {/* Filtro período */}
          <div style={{ display:'flex', gap:8, marginBottom:16 }}>
            {[7,15,30].map(d => (
              <button key={d} onClick={() => setPeriodo(d)}
                style={{ flex:1, padding:'6px', borderRadius:8, border:'none', fontSize:12, cursor:'pointer',
                         background: periodo===d ? '#1A1208' : '#eee', color: periodo===d ? '#fff' : '#555' }}>
                {d} dias
              </button>
            ))}
          </div>

          {/* Card total */}
          <div style={{ background:'#1A1208', borderRadius:8, padding:'14px 16px', marginBottom:16, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <span style={{ color:'#aaa', fontSize:13 }}>Total descartado ({periodo} dias)</span>
            <span style={{ color:'#E67E00', fontSize:28, fontWeight:'bold' }}>{totalDescartes}</span>
          </div>

          {loading ? (
            <div style={{ textAlign:'center', color:'#999', padding:32 }}>Carregando...</div>
          ) : grafico.length === 0 ? (
            <div style={{ textAlign:'center', color:'#999', padding:32 }}>Nenhum descarte no período</div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={grafico} margin={{ top:4, right:8, left:-20, bottom:4 }}>
                  <XAxis dataKey="grupo" tick={{ fontSize:11 }} />
                  <YAxis tick={{ fontSize:11 }} allowDecimals={false} />
                  <Tooltip formatter={(v) => [v, 'Descartes']} />
                  <Bar dataKey="total" radius={[4,4,0,0]}>
                    {grafico.map((_, i) => <Cell key={i} fill={CORES[i % CORES.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>

              <div style={{ display:'flex', flexDirection:'column', gap:8, marginTop:12 }}>
                {grafico.map((g, i) => (
                  <div key={g.grupo} style={{ background:'#fff', borderRadius:8, padding:'10px 14px',
                                              display:'flex', justifyContent:'space-between', alignItems:'center',
                                              borderLeft:`4px solid ${CORES[i % CORES.length]}` }}>
                    <span style={{ fontWeight:'bold', fontSize:14 }}>{g.grupo}</span>
                    <span style={{ color:CORES[i % CORES.length], fontWeight:'bold', fontSize:18 }}>{g.total}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}

      {aba === 'vencimentos' && (
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {vencimentos.length === 0 ? (
            <div style={{ textAlign:'center', color:'#43A047', padding:40, fontSize:15 }}>
              ✅ Nenhum vencimento próximo
            </div>
          ) : vencimentos.map(et => (
            <div key={et.id} style={{ background:'#FFF3E0', border:'1px solid #FB8C00', borderRadius:8, padding:'12px 14px' }}>
              <div style={{ fontWeight:'bold', fontSize:15 }}>{et.produto?.nome}</div>
              <div style={{ fontSize:12, color:'#E65100', marginTop:4 }}>
                ⏰ Vence em: {format(new Date(et.data_validade+'T12:00:00'), 'dd/MM/yyyy')}
              </div>
              <div style={{ fontSize:11, color:'#999', marginTop:2 }}>👤 {et.operador}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
