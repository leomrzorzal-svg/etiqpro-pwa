import React, { useState } from 'react'
import { useApp, fd, du } from '../App'

export default function PgDashboard() {
  const { data } = useApp()
  const today = new Date().toISOString().slice(0, 10)

  // Drill-down state: { titulo, icone, cor, items }
  const [detalhe, setDetalhe] = useState(null)

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

  function abrirDetalhe(titulo, icone, cor, items) {
    setDetalhe({ titulo, icone, cor, items })
  }

  // ── Tela de detalhe (drill-down) ──────────────────────────────────────────
  if (detalhe) {
    return (
      <div>
        <button
          onClick={() => setDetalhe(null)}
          style={{
            display:'inline-flex', alignItems:'center', gap:8, padding:'10px 20px',
            background:'#fff', border:'2px solid #e0e3ea', borderRadius:12,
            cursor:'pointer', fontSize:14, fontWeight:700, color:'#6b7280',
            fontFamily:'inherit', marginBottom:20, transition:'all .15s'
          }}
          onMouseOver={e => { e.currentTarget.style.borderColor = '#e67e00'; e.currentTarget.style.color = '#e67e00' }}
          onMouseOut={e => { e.currentTarget.style.borderColor = '#e0e3ea'; e.currentTarget.style.color = '#6b7280' }}
        >
          ← Voltar ao Dashboard
        </button>

        <div className="panel">
          <div className="panel-hd">
            <h3>{detalhe.icone} {detalhe.titulo} <span style={{fontWeight:400,fontSize:14,color:'#6b7280'}}>({detalhe.items.length})</span></h3>
          </div>
          <div className="panel-bd">
            {detalhe.items.length === 0 ? (
              <div className="empty"><div className="ei">✅</div><p>Nenhuma etiqueta nesta categoria</p></div>
            ) : (
              <div className="etv-grid">
                {detalhe.items.map(h => (
                  <DetalheCard key={h.id} h={h} corDestaque={detalhe.cor} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  // ── Dashboard principal ───────────────────────────────────────────────────
  return (
    <div>
      <div className="cards-row">
        <div className="card" style={{cursor:'pointer',transition:'transform .15s,box-shadow .15s'}}
          onClick={() => abrirDetalhe('Etiquetas Hoje', '🏷️', '#2e7d32', etiquetasHoje)}
          onMouseOver={e => { e.currentTarget.style.transform='translateY(-3px)'; e.currentTarget.style.boxShadow='0 8px 24px rgba(0,0,0,.13)' }}
          onMouseOut={e => { e.currentTarget.style.transform=''; e.currentTarget.style.boxShadow='' }}>
          <div className="card-icon" style={{background:'#e8f5e9'}}>🏷️</div>
          <div><h3 style={{color:'#2e7d32'}}>{etiquetasHoje.length}</h3><p>Etiquetas hoje</p></div>
        </div>
        <div className="card" style={{cursor:'pointer',transition:'transform .15s,box-shadow .15s'}}
          onClick={() => abrirDetalhe('Próximas a Vencer', '⏰', '#fb8c00', proxVencer)}
          onMouseOver={e => { e.currentTarget.style.transform='translateY(-3px)'; e.currentTarget.style.boxShadow='0 8px 24px rgba(0,0,0,.13)' }}
          onMouseOut={e => { e.currentTarget.style.transform=''; e.currentTarget.style.boxShadow='' }}>
          <div className="card-icon" style={{background:'#fff3e0'}}>⏰</div>
          <div><h3 style={{color:'#fb8c00'}}>{proxVencer.length}</h3><p>Próximas vencer</p></div>
        </div>
        <div className="card" style={{cursor:'pointer',transition:'transform .15s,box-shadow .15s'}}
          onClick={() => abrirDetalhe('Vencidas', '⚠️', '#e53935', vencidas)}
          onMouseOver={e => { e.currentTarget.style.transform='translateY(-3px)'; e.currentTarget.style.boxShadow='0 8px 24px rgba(0,0,0,.13)' }}
          onMouseOut={e => { e.currentTarget.style.transform=''; e.currentTarget.style.boxShadow='' }}>
          <div className="card-icon" style={{background:'#ffebee'}}>⚠️</div>
          <div><h3 style={{color:'#e53935'}}>{vencidas.length}</h3><p>Vencidas</p></div>
        </div>
        <div className="card" style={{cursor:'pointer',transition:'transform .15s,box-shadow .15s'}}
          onClick={() => abrirDetalhe('Descartes', '🗑️', '#7b1fa2', descartes)}
          onMouseOver={e => { e.currentTarget.style.transform='translateY(-3px)'; e.currentTarget.style.boxShadow='0 8px 24px rgba(0,0,0,.13)' }}
          onMouseOut={e => { e.currentTarget.style.transform=''; e.currentTarget.style.boxShadow='' }}>
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
                  <div key={e.nome}
                    onClick={() => abrirDetalhe(`Estoque: ${e.nome}`, '📦', cor, e.items)}
                    style={{background:'#fafafa',borderRadius:12,padding:'14px 16px',border:'1px solid var(--g2)',cursor:'pointer',transition:'all .15s'}}
                    onMouseOver={ev => { ev.currentTarget.style.borderColor=cor; ev.currentTarget.style.transform='translateY(-2px)'; ev.currentTarget.style.boxShadow='0 6px 20px rgba(0,0,0,.1)' }}
                    onMouseOut={ev => { ev.currentTarget.style.borderColor='var(--g2)'; ev.currentTarget.style.transform=''; ev.currentTarget.style.boxShadow='' }}>
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
          <div className="panel-hd" style={{cursor:'pointer'}} onClick={() => abrirDetalhe('Próximas ao Vencimento', '⏰', '#fb8c00', proxVencer)}>
            <h3>⏰ Próximas ao Vencimento</h3>
            {proxVencer.length > 0 && <span style={{fontSize:12,color:'#fb8c00',fontWeight:700}}>Ver todas →</span>}
          </div>
          <div className="panel-bd" style={{padding:0}}>
            {proxVencer.length === 0 ? (
              <div className="empty"><p>Nenhuma próxima ao vencimento ✅</p></div>
            ) : proxVencer.slice(0, 6).map(h => {
              const d = du(h.val)
              return (
                <div key={h.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'9px 16px',borderBottom:'1px solid var(--g2)'}}>
                  <div>
                    <strong style={{fontSize:13}}>{h.prod}</strong>
                    <div style={{fontSize:11,color:'var(--t2)'}}>{h.num} — {h.op} — {fd(h.manip)}</div>
                  </div>
                  <span className="badge b-wn">{d === 0 ? 'Hoje' : `${d}d`}</span>
                </div>
              )
            })}
            {proxVencer.length > 6 && (
              <div style={{textAlign:'center',padding:'10px',cursor:'pointer',color:'#fb8c00',fontWeight:700,fontSize:13}}
                onClick={() => abrirDetalhe('Próximas ao Vencimento', '⏰', '#fb8c00', proxVencer)}>
                Ver todas as {proxVencer.length} etiquetas →
              </div>
            )}
          </div>
        </div>

        <div className="panel">
          <div className="panel-hd" style={{cursor:'pointer'}} onClick={() => abrirDetalhe('Impressões de Hoje', '🏷️', '#2e7d32', etiquetasHoje)}>
            <h3>🏷️ Impressões de Hoje</h3>
            {etiquetasHoje.length > 0 && <span style={{fontSize:12,color:'#2e7d32',fontWeight:700}}>Ver todas →</span>}
          </div>
          <div className="panel-bd" style={{padding:0}}>
            {etiquetasHoje.length === 0 ? (
              <div className="empty"><p>Nenhuma impressão hoje</p></div>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Produto</th><th>Grupo</th><th>Validade</th><th>Operador</th></tr></thead>
                  <tbody>
                    {etiquetasHoje.slice(0, 8).map(h => (
                      <tr key={h.id}>
                        <td style={{fontWeight:600}}>{h.prod}</td>
                        <td><span style={{fontSize:11,fontWeight:700,color:h.grpCor||'#999'}}>{h.grp}</span></td>
                        <td>{fd(h.val)}</td>
                        <td>{h.op}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {etiquetasHoje.length > 8 && (
                  <div style={{textAlign:'center',padding:'10px',cursor:'pointer',color:'#2e7d32',fontWeight:700,fontSize:13}}
                    onClick={() => abrirDetalhe('Impressões de Hoje', '🏷️', '#2e7d32', etiquetasHoje)}>
                    Ver todas as {etiquetasHoje.length} etiquetas →
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function DetalheCard({ h, corDestaque }) {
  const d = du(h.val)
  const vencida  = h.val && d < 0
  const vencendo = !vencida && h.val && d >= 0 && d <= 2
  const isDesc   = h.tipoBaixa === 'descarte'

  let statusBadge
  if (h.baixada)     statusBadge = isDesc ? <span className="badge b-desc">Descartada</span> : <span className="badge b-baixa">Baixa / Uso</span>
  else if (vencida)  statusBadge = <span className="badge b-dn">Vencida</span>
  else if (vencendo) statusBadge = <span className="badge b-wn">Vence em {d}d</span>
  else               statusBadge = <span className="badge b-ok">Ativa</span>

  let cls = 'etv-card'
  if (h.baixada) cls += isDesc ? ' descartada' : ' baixada'
  else if (vencida)  cls += ' vencida'
  else if (vencendo) cls += ' vencendo'

  return (
    <div className={cls}>
      <div className="etv-header">
        <span className="etv-num">{h.num}</span>
        {statusBadge}
      </div>
      <div className="etv-body">
        <div className="etv-prod">{h.prod}</div>
        <div className="etv-grp" style={{color:h.grpCor||'#999'}}>{h.grp}</div>
        <div className="etv-datas">
          <div className="etv-d"><label>Abertura</label><span>{fd(h.manip)}</span></div>
          <div className="etv-d"><label>Validade</label><span className={vencida?'etv-val-v':''}>{fd(h.val)}</span></div>
        </div>
        {h.peso && <div className="etv-peso">Peso: <b>{h.peso}</b></div>}
        <div className="etv-foot">
          <span className="etv-op">Operador: {h.op}</span>
          <span className="etv-qty">{new Date(h.at).toLocaleString('pt-BR')}</span>
        </div>
        {h.baixada && (
          <div style={{fontSize:10,color:isDesc?'#7b1fa2':'var(--p)',marginTop:5,padding:'5px 8px',background:isDesc?'#f3e5f5':'#e8f5ee',borderRadius:6}}>
            {isDesc?'Descartado':'Baixa / uso'} em {new Date(h.baixadaEm).toLocaleString('pt-BR')} por <b>{h.baixadaPor}</b>
            {isDesc && h.descMotivo && <><br /><i style={{fontSize:9}}>Motivo: {h.descMotivo}</i></>}
          </div>
        )}
      </div>
    </div>
  )
}
