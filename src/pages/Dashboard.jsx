import { useState, useEffect } from 'react'
import { getDashboardStats, getEtiquetas, formatData, diasRestantes } from '../lib/db.js'
import { useToast } from '../App.jsx'

export default function Dashboard() {
  const toast = useToast()
  const [stats, setStats] = useState(null)
  const [vencendo, setVenc] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([getDashboardStats(), getEtiquetas({status:'ativa',limit:100})])
      .then(([s, etqs]) => {
        setStats(s)
        setVenc(etqs.filter(e => { const d = diasRestantes(e.data_validade); return d >= 0 && d <= 2 }))
      }).catch(() => toast('Erro ao carregar', 'err'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="empty"><div className="ei">⏳</div><p>Carregando...</p></div>

  return (
    <>
      <div className="cards-row">
        {[
          ['🏷️','ci-o',stats.ativas,'Etiquetas Ativas'],
          ['⚠️','ci-r',stats.vencendo,'Vencem em 2 dias'],
          ['🗑️','ci-p',stats.totalDescartes,'Total Descartes'],
          ['⚖️','ci-b',stats.pesoDescartado.toFixed(2)+' KG','Peso Descartado'],
          ['📅','ci-g',stats.ultimos7dias,'Impressas (7d)'],
        ].map(([icon,cor,val,label]) => (
          <div key={label} className="card">
            <div className={`card-icon ${cor}`}>{icon}</div>
            <div><h3>{val}</h3><p>{label}</p></div>
          </div>
        ))}
      </div>
      <div className="panel">
        <div className="panel-header"><h3>⚠️ Vencendo em até 2 dias</h3></div>
        {vencendo.length === 0 ? (
          <div className="panel-body" style={{textAlign:'center',color:'#2e7d32',padding:30}}>
            <div style={{fontSize:40,marginBottom:10}}>✅</div>
            <strong>Tudo em dia!</strong>
            <p style={{color:'#888',fontSize:13,marginTop:4}}>Nenhuma etiqueta vencendo nos próximos 2 dias.</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Produto</th><th>Número</th><th>Validade</th><th>Situação</th><th>Operador</th></tr></thead>
              <tbody>
                {vencendo.map(e => {
                  const d = diasRestantes(e.data_validade)
                  return (
                    <tr key={e.id}>
                      <td><strong>{e.produto_nome}</strong></td>
                      <td><code style={{fontSize:11}}>{e.numero}</code></td>
                      <td>{formatData(e.data_validade)}</td>
                      <td><span className="badge b-wn">{d===0?'Vence hoje':'Vence amanhã'}</span></td>
                      <td>{e.operador}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  )
}
