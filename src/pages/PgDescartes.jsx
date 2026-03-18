import React, { useState } from 'react'
import { useApp, fd } from '../App'

function parsePeso(str) {
  if (!str) return 0
  return parseFloat(str.replace(/[^\d.,]/g, '').replace(',', '.')) || 0
}

function gerarPdfDescartes(lista, filtros) {
  const w = window.open('', '_blank')
  if (!w) return
  const totalPeso = lista.reduce((s, h) => s + parsePeso(h.descPeso), 0)
  const rows = lista.map(h => `<tr>
    <td><b>${h.num}</b></td>
    <td><b>${h.prod}</b><br><small style="color:#888">${h.grp}</small></td>
    <td>${h.baixadaEm ? new Date(h.baixadaEm).toLocaleString('pt-BR') : '—'}</td>
    <td>${h.baixadaPor || '—'}</td>
    <td style="color:#7b1fa2;font-weight:700">${h.descPeso || '—'}</td>
    <td style="max-width:200px;font-size:11px">${h.descMotivo || '—'}</td>
  </tr>`).join('')
  const filtroHtml = Object.entries(filtros).filter(([,v]) => v).map(([k,v]) => `<span style="background:#f3e5f5;color:#7b1fa2;padding:2px 8px;border-radius:10px;font-size:11px;margin-right:6px"><b>${k}:</b> ${v}</span>`).join('')
  w.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Relatório Descartes etiqPRO</title>
<style>body{font-family:Arial,sans-serif;font-size:12px;padding:20px;color:#222}
h1{font-size:18px;color:#7b1fa2;margin-bottom:4px}
.sub{font-size:12px;color:#888;margin-bottom:16px}
table{width:100%;border-collapse:collapse;margin-top:12px}
th{background:#f3e5f5;padding:8px 10px;text-align:left;font-size:10px;text-transform:uppercase;border-bottom:2px solid #ddd;color:#7b1fa2}
td{padding:7px 10px;border-bottom:1px solid #eee;font-size:11px;vertical-align:top}
.total{margin-top:16px;padding:12px 16px;background:#f3e5f5;border-radius:8px;border-left:4px solid #7b1fa2}
@media print{body{padding:8px}}</style></head><body>
<h1>🗑️ Relatório de Descartes — etiqPRO</h1>
<div class="sub">Gerado em ${new Date().toLocaleString('pt-BR')} &nbsp;|&nbsp; ${lista.length} descarte${lista.length!==1?'s':''}</div>
${filtroHtml ? `<div style="margin-bottom:12px">${filtroHtml}</div>` : ''}
<table><thead><tr><th>#</th><th>Produto</th><th>Data Descarte</th><th>Operador</th><th>Peso Descartado</th><th>Motivo</th></tr></thead><tbody>${rows}</tbody></table>
<div class="total"><b style="color:#7b1fa2">Total: ${lista.length} descarte${lista.length!==1?'s':''}</b> &nbsp;|&nbsp; Peso total descartado: <b style="color:#7b1fa2">${totalPeso.toFixed(3)} KG</b></div>
<script>window.onload=function(){window.print()}<\/script></body></html>`)
  w.document.close()
}

export default function PgDescartes() {
  const { data } = useApp()
  const [fProd, setFProd] = useState('')
  const [fOp, setFOp] = useState('')
  const [fDe, setFDe] = useState('')
  const [fAte, setFAte] = useState('')

  const temFiltro = !!(fProd || fOp || fDe || fAte)

  const lista = data.hist.filter(h => {
    if (h.tipoBaixa !== 'descarte') return false
    if (fProd && !h.prod.toLowerCase().includes(fProd.toLowerCase())) return false
    if (fOp && h.baixadaPor && !h.baixadaPor.toLowerCase().includes(fOp.toLowerCase())) return false
    if (fDe && h.baixadaEm && h.baixadaEm.substring(0,10) < fDe) return false
    if (fAte && h.baixadaEm && h.baixadaEm.substring(0,10) > fAte) return false
    return true
  })

  const totalPeso = lista.reduce((s, h) => s + parsePeso(h.descPeso), 0)

  // Resumo por produto
  const porProd = {}
  lista.forEach(h => {
    if (!porProd[h.prod]) porProd[h.prod] = { count: 0, peso: 0 }
    porProd[h.prod].count++
    porProd[h.prod].peso += parsePeso(h.descPeso)
  })

  function limpar() { setFProd(''); setFOp(''); setFDe(''); setFAte('') }

  return (
    <div>
      <div className="panel" style={{marginBottom:20}}>
        <div className="panel-hd">
          <h3>🔍 Filtros</h3>
          {temFiltro && <button className="btn btn-sm btn-gy" onClick={limpar}>✕ Limpar</button>}
        </div>
        <div className="panel-bd">
          <div className="form-grid">
            <div className="fg">
              <label>Produto</label>
              <input value={fProd} onChange={e => setFProd(e.target.value)} placeholder="Nome do produto..." />
            </div>
            <div className="fg">
              <label>Operador</label>
              <input value={fOp} onChange={e => setFOp(e.target.value)} placeholder="Quem realizou o descarte..." />
            </div>
            <div className="fg">
              <label>Data início</label>
              <input type="date" value={fDe} onChange={e => setFDe(e.target.value)} />
            </div>
            <div className="fg">
              <label>Data fim</label>
              <input type="date" value={fAte} onChange={e => setFAte(e.target.value)} />
            </div>
          </div>
        </div>
      </div>

      {/* Soma bar */}
      <div style={{background:'#f3e5f5',border:'2px solid #ce93d8',borderRadius:12,padding:'14px 20px',marginBottom:20,display:'flex',alignItems:'center',gap:16,flexWrap:'wrap'}}>
        <div style={{fontSize:28}}>🗑️</div>
        <div>
          <h3 style={{fontSize:22,fontWeight:900,color:'#7b1fa2',marginBottom:2}}>{lista.length} descarte{lista.length!==1?'s':''}</h3>
          <p style={{fontSize:13,color:'#7b1fa2'}}>Peso total descartado: <b>{totalPeso.toFixed(3)} KG</b></p>
        </div>
        {lista.length > 0 && (
          <button className="btn btn-sm" style={{marginLeft:'auto',background:'#7b1fa2',color:'#fff',border:'none'}}
            onClick={() => gerarPdfDescartes(lista, {Produto:fProd,Operador:fOp,'Data início':fDe,'Data fim':fAte})}>
            🖨️ Gerar Relatório PDF
          </button>
        )}
      </div>

      {/* Resumo do Período */}
      {lista.length > 0 && (
        <div style={{background:'#f3e5f5',borderRadius:10,borderLeft:'4px solid #7b1fa2',padding:'14px 20px',marginBottom:20}}>
          <div style={{fontSize:13,fontWeight:700,color:'#7b1fa2',marginBottom:10}}>Resumo do Período</div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(140px,1fr))',gap:10}}>
            {Object.entries(porProd).map(([prod, info]) => (
              <div key={prod} style={{background:'#fff',borderRadius:8,padding:'10px 14px'}}>
                <div style={{fontSize:12,fontWeight:800,color:'#333',marginBottom:4}}>{prod}</div>
                <div style={{fontSize:18,fontWeight:900,color:'#7b1fa2'}}>{info.count} descarte{info.count!==1?'s':''}</div>
                <div style={{fontSize:10,color:'var(--t2)',marginTop:2}}>Peso: {info.peso.toFixed(3)} KG</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="panel">
        <div className="panel-hd"><h3>📋 Lista de Descartes</h3></div>
        <div className="panel-bd" style={{padding:0}}>
          {lista.length === 0 ? (
            <div className="empty"><div className="ei">✅</div><p>Nenhum descarte encontrado</p></div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Nº</th>
                    <th>Produto</th>
                    <th>Data Descarte</th>
                    <th>Operador</th>
                    <th>Peso Descartado</th>
                    <th>Motivo</th>
                  </tr>
                </thead>
                <tbody>
                  {lista.map(h => (
                    <tr key={h.id}>
                      <td><span style={{fontWeight:700,color:'#7b1fa2',fontSize:11}}>{h.num}</span></td>
                      <td>
                        <strong>{h.prod}</strong>
                        <div style={{fontSize:11,color:'var(--t2)'}}>{h.grp}</div>
                      </td>
                      <td style={{fontSize:12,whiteSpace:'nowrap'}}>
                        {h.baixadaEm ? new Date(h.baixadaEm).toLocaleString('pt-BR') : '—'}
                      </td>
                      <td>{h.baixadaPor || '—'}</td>
                      <td><strong style={{color:'#7b1fa2'}}>{h.descPeso || '—'}</strong></td>
                      <td style={{fontSize:12,color:'var(--t2)',maxWidth:240}}>{h.descMotivo || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
