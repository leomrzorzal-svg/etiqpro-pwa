import React, { useState } from 'react'
import { useApp, fd, du } from '../App'

export default function PgHistorico() {
  const { data } = useApp()
  const [filtroData, setFiltroData] = useState('')
  const [busca, setBusca] = useState('')

  let lista = [...data.hist].sort((a, b) => new Date(b.at) - new Date(a.at))
  if (filtroData) lista = lista.filter(h => h.at && h.at.startsWith(filtroData))
  if (busca) {
    const q = busca.toLowerCase()
    lista = lista.filter(h =>
      (h.num && h.num.toLowerCase().includes(q)) ||
      (h.prod && h.prod.toLowerCase().includes(q)) ||
      (h.op && h.op.toLowerCase().includes(q)) ||
      (h.grp && h.grp.toLowerCase().includes(q))
    )
  }

  return (
    <div className="panel">
      <div className="panel-hd">
        <h3>🕐 Histórico de Impressões</h3>
        <div style={{display:'flex',gap:10,flexWrap:'wrap',alignItems:'center'}}>
          <input type="date" value={filtroData} onChange={e => setFiltroData(e.target.value)}
            style={{padding:'7px 12px',border:'2px solid #e0e3ea',borderRadius:8,fontSize:13,outline:'none',fontFamily:'inherit'}} />
          {filtroData && <button className="btn btn-sm btn-gy" onClick={() => setFiltroData('')}>Limpar</button>}
          <input placeholder="🔍 Buscar..." value={busca} onChange={e => setBusca(e.target.value)}
            style={{padding:'7px 12px',border:'2px solid #e0e3ea',borderRadius:8,fontSize:13,outline:'none',fontFamily:'inherit',width:180}} />
        </div>
      </div>
      <div className="panel-bd" style={{padding:0}}>
        {lista.length === 0 ? (
          <div className="empty"><div className="ei">🕐</div><p>Nenhum registro encontrado</p></div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Nº</th>
                  <th>Data/Hora</th>
                  <th>Produto</th>
                  <th>Grupo</th>
                  <th>Abertura</th>
                  <th>Validade</th>
                  <th>Peso</th>
                  <th>Operador</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {lista.map(h => {
                  const isDesc = h.tipoBaixa === 'descarte'
                  const vencida = !h.baixada && h.val && du(h.val) < 0
                  return (
                    <tr key={h.id}>
                      <td><span style={{fontWeight:700,color:'#e67e00',fontSize:11}}>{h.num}</span></td>
                      <td style={{fontSize:11,color:'var(--t2)',whiteSpace:'nowrap'}}>
                        {h.at ? new Date(h.at).toLocaleString('pt-BR') : '—'}
                      </td>
                      <td style={{fontWeight:600}}>{h.prod}</td>
                      <td>
                        {h.grp && (
                          <span style={{fontSize:11,fontWeight:700,color:h.grpCor||'#999'}}>{h.grp}</span>
                        )}
                      </td>
                      <td style={{whiteSpace:'nowrap'}}>{fd(h.manip)}</td>
                      <td style={{whiteSpace:'nowrap',color:vencida?'var(--dn)':'inherit',fontWeight:vencida?700:400}}>{fd(h.val)}</td>
                      <td style={{fontSize:12,fontWeight:700,color:'#555'}}>{h.peso || '—'}</td>
                      <td>{h.op}</td>
                      <td>
                        {h.baixada
                          ? (isDesc
                            ? <span className="badge b-desc">🗑️ Descarte</span>
                            : <span className="badge b-baixa">✅ Uso</span>)
                          : vencida
                            ? <span className="badge b-dn">Vencida</span>
                            : <span className="badge b-ok">Ativa</span>
                        }
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
