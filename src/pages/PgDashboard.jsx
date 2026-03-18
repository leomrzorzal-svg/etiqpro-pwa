import React from 'react'
import { useApp, fd, du } from '../App'

export default function PgDashboard() {
  const { data } = useApp()
  const today = new Date().toISOString().slice(0, 10)

  const etiquetasHoje = data.hist.filter(h => h.at && h.at.startsWith(today))
  const proxVencer = data.hist.filter(h => !h.baixada && h.val && du(h.val) >= 0 && du(h.val) <= 2)
  const vencidas = data.hist.filter(h => !h.baixada && h.val && du(h.val) < 0)
  const descartes = data.hist.filter(h => h.tipoBaixa === 'descarte')

  // Estoque por produto (somente ativas)
  const ativas = data.hist.filter(h => !h.baixada)
  const estoque = {}
  ativas.forEach(h => {
    if (!estoque[h.prod]) estoque[h.prod] = { nome: h.prod, grp: h.grp, grpCor: h.grpCor, total: 0, vencendo: 0, vencidas: 0, items: [] }
    estoque[h.prod].total++
    estoque[h.prod].items.push(h)
    const d = du(h.val)
    if (h.val && d < 0) estoque[h.prod].vencidas++
    else if (h.val && d >= 0 && d <= 2) estoque[h.prod].vencendo++
  })
  const estoqueList = Object.values(estoque).sort((a, b) => b.total - a.total)
  const maxTotal = estoqueList.length ? estoqueList[0].total : 1

  return (
    <div>
      <div className="cards-row">
        <div className="card">
          <div className="card-icon" style={{background:'#e8f5e9'}}>🏷️</div>
          <div><h3 style={{color:'#2e7d32'}}>{etiquetasHoje.length}</h3><p>Etiquetas hoje</p></div>
        </div>
        <div className="card">
          <div className="card-icon" style={{background:'#fff3e0'}}>⏰</div>
          <div><h3 style={{color:'#fb8c00'}}>{proxVencer.length}</h3><p>Próximas vencer</p></div>
        </div>
        <div className="card">
          <div className="card-icon" style={{background:'#ffebee'}}>⚠️</div>
          <div><h3 style={{color:'#e53935'}}>{vencidas.length}</h3><p>Vencidas</p></div>
        </div>
        <div className="card">
          <div className="card-icon" style={{background:'#f3e5f5'}}>🗑️</div>
          <div><h3 style={{color:'#7b1fa2'}}>{descartes.length}</h3><p>Descartes</p></div>
        </div>
      </div>

      <div className="panel" style={{marginBottom:20}}>
        <div className="panel-hd"><h3>📦 Estoque por Produto</h3></div>
        <div className="panel-bd">
          {estoqueList.length === 0 ? (
            <div className="empty"><div className="ei">📦</div><p>Nenhuma etiqueta ativa no momento</p></div>
          ) : (
            <div style={{display:'grid',gap:10}}>
              {estoqueList.map(e => {
                const pct = Math.round(e.total / maxTotal * 100)
                const cor = e.grpCor || 'var(--p)'
                const proxVal = e.items.filter(i => i.val && du(i.val) >= 0).sort((a,b) => new Date(a.val) - new Date(b.val))[0]
                const proxLabel = proxVal ? 'Vence ' + fd(proxVal.val) : 'Sem validade'
                return (
                  <div key={e.nome} style={{background:'#fafafa',borderRadius:12,padding:'14px 16px',border:'1px solid var(--g2)'}}>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
                      <div>
                        <div style={{fontWeight:800,fontSize:15}}>{e.nome}</div>
                        <div style={{fontSize:11,color:cor,fontWeight:700}}>{e.grp}</div>
                      </div>
                      <div style={{textAlign:'right'}}>
                        <div style={{fontSize:28,fontWeight:900,color:cor,lineHeight:1}}>{e.total}</div>
                        <div style={{fontSize:11,color:'var(--t2)'}}>etiqueta{e.total>1?'s':''}</div>
                      </div>
                    </div>
                    <div style={{background:'var(--g2)',borderRadius:6,height:8,overflow:'hidden',marginBottom:6}}>
                      <div style={{background:cor,height:'100%',borderRadius:6,width:`${pct}%`}} />
                    </div>
                    <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:4}}>
                      <span style={{fontSize:11,color:'var(--t2)'}}>{proxLabel}</span>
                      <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
                        {e.vencidas > 0 && <span className="badge b-dn" style={{fontSize:11}}>{e.vencidas} vencida{e.vencidas>1?'s':''}</span>}
                        {e.vencendo > 0 && <span className="badge b-wn" style={{fontSize:11}}>{e.vencendo} a vencer</span>}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(340px,1fr))',gap:20}}>
        <div className="panel">
          <div className="panel-hd"><h3>⏰ Próximas ao Vencimento</h3></div>
          <div className="panel-bd" style={{padding:0}}>
            {proxVencer.length === 0 ? (
              <div className="empty"><p>Nenhuma próxima ao vencimento ✅</p></div>
            ) : proxVencer.slice(0, 6).map(h => {
              const d = du(h.val)
              return (
                <div key={h.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'9px 16px',borderBottom:'1px solid var(--g2)'}}>
                  <div>
                    <strong style={{fontSize:13}}>{h.prod}</strong>
                    <div style={{fontSize:11,color:'var(--t2)'}}>{h.op} — {fd(h.manip)}</div>
                  </div>
                  <span className="badge b-wn">{d === 0 ? 'Hoje' : `${d}d`}</span>
                </div>
              )
            })}
          </div>
        </div>

        <div className="panel">
          <div className="panel-hd"><h3>🏷️ Impressões de Hoje</h3></div>
          <div className="panel-bd" style={{padding:0}}>
            {etiquetasHoje.length === 0 ? (
              <div className="empty"><p>Nenhuma impressão hoje</p></div>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Produto</th><th>Grupo</th><th>Validade</th><th>Operador</th></tr></thead>
                  <tbody>
                    {etiquetasHoje.map(h => (
                      <tr key={h.id}>
                        <td style={{fontWeight:600}}>{h.prod}</td>
                        <td><span style={{fontSize:11,fontWeight:700,color:h.grpCor||'#999'}}>{h.grp}</span></td>
                        <td>{fd(h.val)}</td>
                        <td>{h.op}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
