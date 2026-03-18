import React, { useState } from 'react'
import { useApp, fd, du } from '../App'

function BarChart({ data: entries, color }) {
  if (!entries.length) return <p style={{color:'var(--t2)',fontSize:13}}>Sem dados</p>
  const max = entries[0][1]
  return (
    <div style={{display:'grid',gap:8}}>
      {entries.map(([label, val]) => (
        <div key={label} style={{display:'grid',gridTemplateColumns:'1fr auto',alignItems:'center',gap:8}}>
          <div>
            <div style={{fontSize:12,fontWeight:700,marginBottom:3,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{label}</div>
            <div style={{background:'var(--g2)',borderRadius:4,height:10,overflow:'hidden'}}>
              <div style={{background:color,height:'100%',borderRadius:4,width:`${Math.round(val/max*100)}%`}} />
            </div>
          </div>
          <span style={{fontSize:13,fontWeight:900,color:color,minWidth:24,textAlign:'right'}}>{val}</span>
        </div>
      ))}
    </div>
  )
}

function gerarPdfRelatorio(lista, filtros) {
  const w = window.open('', '_blank')
  if (!w) return
  const rows = lista.map(h => {
    const d = du(h.val)
    const vencida = h.val && d < 0
    const vencendo = h.val && d >= 0 && d <= 2
    const isDesc = h.tipoBaixa === 'descarte'
    const st = h.baixada
      ? (isDesc ? '<span style="color:#7b1fa2;font-weight:700">Descartada</span>' : '<span style="color:#e67e00;font-weight:700">Baixada/Uso</span>')
      : vencida ? '<span style="color:#e53935;font-weight:700">Vencida</span>'
      : vencendo ? '<span style="color:#fb8c00;font-weight:700">A vencer</span>'
      : '<span style="color:#2e7d32;font-weight:700">Ativa</span>'
    return `<tr><td>${h.num}</td><td><b>${h.prod}</b></td><td style="color:${h.grpCor||'#999'};font-weight:700">${h.grp}</td><td>${fd(h.manip)}</td><td>${fd(h.val)}</td><td>${h.op}</td><td>${h.peso||'-'}</td><td>${st}</td></tr>`
  }).join('')
  const filtroHtml = Object.entries(filtros).filter(([,v]) => v).map(([k,v]) => `<span style="background:#fff3e0;color:#e67e00;padding:2px 8px;border-radius:10px;font-size:11px;margin-right:6px"><b>${k}:</b> ${v}</span>`).join('')
  w.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Relatório etiqPRO</title>
<style>body{font-family:Arial,sans-serif;font-size:12px;padding:20px;color:#222}
h1{font-size:18px;color:#e67e00;margin-bottom:4px}
.sub{font-size:12px;color:#888;margin-bottom:16px}
table{width:100%;border-collapse:collapse;margin-top:12px}
th{background:#f5f6fa;padding:8px 10px;text-align:left;font-size:10px;text-transform:uppercase;border-bottom:2px solid #ddd}
td{padding:7px 10px;border-bottom:1px solid #eee;font-size:11px}
@media print{body{padding:8px}}</style></head><body>
<h1>📊 Relatório de Etiquetas — etiqPRO</h1>
<div class="sub">Gerado em ${new Date().toLocaleString('pt-BR')} &nbsp;|&nbsp; ${lista.length} etiqueta${lista.length!==1?'s':''}</div>
${filtroHtml ? `<div style="margin-bottom:12px">${filtroHtml}</div>` : ''}
<table><thead><tr><th>#</th><th>Produto</th><th>Grupo</th><th>Abertura</th><th>Validade</th><th>Operador</th><th>Peso</th><th>Status</th></tr></thead><tbody>${rows}</tbody></table>
<script>window.onload=function(){window.print()}<\/script></body></html>`)
  w.document.close()
}

export default function PgRelatorios() {
  const { data } = useApp()
  const [fOp, setFOp] = useState('')
  const [fGrp, setFGrp] = useState('')
  const [fDe, setFDe] = useState('')
  const [fAte, setFAte] = useState('')
  const [fStatus, setFStatus] = useState('')

  const temFiltro = !!(fOp || fGrp || fDe || fAte || fStatus)

  const lista = data.hist.filter(h => {
    if (fOp && !h.op.toLowerCase().includes(fOp.toLowerCase())) return false
    if (fGrp && h.grp !== fGrp) return false
    if (fDe && h.at && h.at.substring(0,10) < fDe) return false
    if (fAte && h.at && h.at.substring(0,10) > fAte) return false
    if (fStatus) {
      const d = du(h.val)
      if (fStatus === 'ativas' && (h.baixada || (h.val && d < 0))) return false
      if (fStatus === 'vencendo' && (h.baixada || !h.val || d < 0 || d > 2)) return false
      if (fStatus === 'vencidas' && (h.baixada || !h.val || d >= 0)) return false
      if (fStatus === 'baixadas' && h.tipoBaixa !== 'uso') return false
      if (fStatus === 'descartadas' && h.tipoBaixa !== 'descarte') return false
    }
    return true
  })

  const today = new Date().toISOString().slice(0,10)
  const totalHoje = lista.filter(h => h.at && h.at.startsWith(today)).length
  const totalVencendo = lista.filter(h => !h.baixada && h.val && du(h.val) >= 0 && du(h.val) <= 2).length
  const totalVencidas = lista.filter(h => !h.baixada && h.val && du(h.val) < 0).length

  // Charts
  const porOp = {}
  const porProd = {}
  const porGrp = {}
  lista.forEach(h => {
    porOp[h.op] = (porOp[h.op] || 0) + 1
    porProd[h.prod] = (porProd[h.prod] || 0) + 1
    porGrp[h.grp] = (porGrp[h.grp] || 0) + 1
  })
  const sortTop = (obj, n=8) => Object.entries(obj).sort((a,b) => b[1]-a[1]).slice(0,n)

  function limpar() { setFOp(''); setFGrp(''); setFDe(''); setFAte(''); setFStatus('') }

  return (
    <div>
      <div className="panel" style={{marginBottom:20}}>
        <div className="panel-hd">
          <h3>🔍 Filtros</h3>
          {temFiltro && <button className="btn btn-sm btn-gy" onClick={limpar}>✕ Limpar filtros</button>}
        </div>
        <div className="panel-bd">
          <div className="form-grid">
            <div className="fg">
              <label>Operador</label>
              <input value={fOp} onChange={e => setFOp(e.target.value)} placeholder="Nome do operador..." />
            </div>
            <div className="fg">
              <label>Grupo</label>
              <select value={fGrp} onChange={e => setFGrp(e.target.value)}
                style={{padding:'10px 14px',border:'2px solid var(--g2)',borderRadius:10,fontSize:14,fontFamily:'inherit',background:'#fafafa',outline:'none'}}>
                <option value="">Todos os grupos</option>
                {data.grps.map(g => <option key={g.id} value={g.nome}>{g.nome}</option>)}
              </select>
            </div>
            <div className="fg">
              <label>Data início</label>
              <input type="date" value={fDe} onChange={e => setFDe(e.target.value)} />
            </div>
            <div className="fg">
              <label>Data fim</label>
              <input type="date" value={fAte} onChange={e => setFAte(e.target.value)} />
            </div>
            <div className="fg">
              <label>Status</label>
              <select value={fStatus} onChange={e => setFStatus(e.target.value)}
                style={{padding:'10px 14px',border:'2px solid var(--g2)',borderRadius:10,fontSize:14,fontFamily:'inherit',background:'#fafafa',outline:'none'}}>
                <option value="">Todos</option>
                <option value="ativas">Ativas</option>
                <option value="vencendo">A vencer (2d)</option>
                <option value="vencidas">Vencidas</option>
                <option value="baixadas">Baixadas / Uso</option>
                <option value="descartadas">Descartadas</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="cards-row" style={{marginBottom:20}}>
        <div className="card"><div className="card-icon" style={{background:'#e3f2fd'}}>📊</div><div><h3 style={{color:'#1565c0'}}>{lista.length}</h3><p>{temFiltro ? 'Filtradas' : 'Total'}</p></div></div>
        <div className="card"><div className="card-icon" style={{background:'#e8f5e9'}}>📅</div><div><h3 style={{color:'#2e7d32'}}>{totalHoje}</h3><p>Hoje</p></div></div>
        <div className="card"><div className="card-icon" style={{background:'#fff3e0'}}>⏰</div><div><h3 style={{color:'#fb8c00'}}>{totalVencendo}</h3><p>A vencer</p></div></div>
        <div className="card"><div className="card-icon" style={{background:'#ffebee'}}>⚠️</div><div><h3 style={{color:'#e53935'}}>{totalVencidas}</h3><p>Vencidas</p></div></div>
      </div>

      {temFiltro && lista.length > 0 && (
        <div className="panel" style={{marginBottom:20}}>
          <div className="panel-hd">
            <h3>📋 Resultado do Filtro <span style={{fontSize:13,fontWeight:400,color:'var(--t2)'}}>({lista.length} etiqueta{lista.length!==1?'s':''})</span></h3>
            <button className="btn btn-p btn-sm" onClick={() => gerarPdfRelatorio(lista, {Operador:fOp,Grupo:fGrp,'Data início':fDe,'Data fim':fAte,Status:fStatus})}>
              🖨️ Gerar Relatório PDF
            </button>
          </div>
          <div className="panel-bd" style={{padding:0}}>
            <div className="table-wrap">
              <table>
                <thead><tr><th>#</th><th>Produto</th><th>Grupo</th><th>Abertura</th><th>Validade</th><th>Operador</th><th>Peso</th><th>Status</th></tr></thead>
                <tbody>
                  {lista.slice(0, 20).map(h => {
                    const d = du(h.val)
                    const vencida = h.val && d < 0
                    const vencendo = h.val && d >= 0 && d <= 2
                    const isDesc = h.tipoBaixa === 'descarte'
                    return (
                      <tr key={h.id}>
                        <td><b style={{color:'var(--p)',fontSize:11}}>{h.num}</b></td>
                        <td style={{fontWeight:600}}>{h.prod}</td>
                        <td><span style={{fontSize:11,fontWeight:700,color:h.grpCor||'#999'}}>{h.grp}</span></td>
                        <td>{fd(h.manip)}</td>
                        <td style={{color:vencida?'var(--dn)':vencendo?'var(--wn)':'inherit',fontWeight:(vencida||vencendo)?700:400}}>{fd(h.val)}</td>
                        <td>{h.op}</td>
                        <td style={{fontSize:12}}>{h.peso || '—'}</td>
                        <td>
                          {h.baixada
                            ? (isDesc ? <span className="badge b-desc">Descartada</span> : <span className="badge b-baixa">Uso</span>)
                            : vencida ? <span className="badge b-dn">Vencida</span>
                            : vencendo ? <span className="badge b-wn">{d}d</span>
                            : <span className="badge b-ok">Ativa</span>
                          }
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              {lista.length > 20 && (
                <p style={{color:'var(--t2)',fontSize:13,padding:'12px 16px'}}>
                  ... e mais {lista.length - 20} registros. Clique em <b>Gerar Relatório PDF</b> para ver todos.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(300px,1fr))',gap:20}}>
        <div className="panel">
          <div className="panel-hd"><h3>👷 Por Operador</h3></div>
          <div className="panel-bd">
            <BarChart data={sortTop(porOp)} color="var(--p)" />
          </div>
        </div>
        <div className="panel">
          <div className="panel-hd"><h3>📦 Por Produto</h3></div>
          <div className="panel-bd">
            <BarChart data={sortTop(porProd)} color="#c46c00" />
          </div>
        </div>
        <div className="panel">
          <div className="panel-hd"><h3>🏷️ Por Grupo</h3></div>
          <div className="panel-bd">
            <BarChart data={sortTop(porGrp)} color="#1976d2" />
          </div>
        </div>
      </div>
    </div>
  )
}
