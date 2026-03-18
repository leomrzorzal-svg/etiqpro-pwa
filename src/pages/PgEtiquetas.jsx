import React, { useState } from 'react'
import { useApp, fd, du, formatPesoKg } from '../App'

const TABS = [
  ['todas', 'Todas'],
  ['ativas', 'Ativas'],
  ['vencendo', 'Vencendo'],
  ['vencidas', 'Vencidas'],
  ['baixadas', 'Baixadas'],
  ['descartadas', 'Descartadas'],
]

export default function PgEtiquetas() {
  const { data, updateData, showToast } = useApp()
  const [tab, setTab] = useState('todas')
  const [busca, setBusca] = useState('')

  // Modal baixa
  const [modalBaixa, setModalBaixa] = useState(null)
  const [tipoSel, setTipoSel] = useState(null)
  const [baixaOp, setBaixaOp] = useState('')
  const [descMotivo, setDescMotivo] = useState('')
  const [descPeso, setDescPeso] = useState('')
  const [erros, setErros] = useState({})

  // Modal ver / editar
  const [modalVer, setModalVer] = useState(null)
  const [modalEdit, setModalEdit] = useState(null)
  const [editPeso, setEditPeso] = useState('')
  const [editDescPeso, setEditDescPeso] = useState('')
  const [editDescMotivo, setEditDescMotivo] = useState('')

  const role = data.usuario?.role || 'operador'

  // Build filtered list
  let lista = [...data.hist].sort((a, b) => new Date(b.at) - new Date(a.at))
  if (tab === 'ativas')        lista = lista.filter(h => !h.baixada && (!h.val || du(h.val) >= 0))
  else if (tab === 'vencendo') lista = lista.filter(h => !h.baixada && h.val && du(h.val) >= 0 && du(h.val) <= 2)
  else if (tab === 'vencidas') lista = lista.filter(h => !h.baixada && h.val && du(h.val) < 0)
  else if (tab === 'baixadas') lista = lista.filter(h => h.baixada)
  else if (tab === 'descartadas') lista = lista.filter(h => h.tipoBaixa === 'descarte')

  if (busca) {
    const q = busca.toLowerCase()
    lista = lista.filter(h =>
      (h.num && h.num.toLowerCase().includes(q)) ||
      (h.prod && h.prod.toLowerCase().includes(q)) ||
      (h.op && h.op.toLowerCase().includes(q)) ||
      (h.grp && h.grp.toLowerCase().includes(q)) ||
      (h.peso && h.peso.toLowerCase().includes(q))
    )
  }

  const countVencendo = data.hist.filter(h => !h.baixada && h.val && du(h.val) >= 0 && du(h.val) <= 2).length

  function abrirBaixa(h) {
    setModalBaixa(h)
    setTipoSel(null)
    setBaixaOp('')
    setDescMotivo('')
    setDescPeso('')
    setErros({})
  }

  function confirmarBaixa() {
    const errs = {}
    if (!tipoSel) errs.tipo = true
    if (!baixaOp.trim()) errs.op = true
    if (tipoSel === 'descarte') {
      if (!descMotivo.trim()) errs.motivo = true
      if (!descPeso.trim()) errs.peso = true
    }
    if (Object.keys(errs).length) { setErros(errs); return }

    const now = new Date().toISOString()
    updateData(d => ({
      ...d,
      hist: d.hist.map(h => h.id === modalBaixa.id ? {
        ...h,
        baixada: true,
        baixadaEm: now,
        baixadaPor: baixaOp.trim(),
        tipoBaixa: tipoSel,
        descMotivo: tipoSel === 'descarte' ? descMotivo.trim() : null,
        descPeso: tipoSel === 'descarte' ? formatPesoKg(descPeso) : null,
      } : h)
    }))
    showToast(`✓ Etiqueta ${modalBaixa.num} baixada!`, 'ok')
    setModalBaixa(null)
  }

  function abrirEditar(h) {
    setModalEdit(h)
    const pesoNum = h.peso ? parseFloat(h.peso.replace(/[^\d.,]/g, '').replace(',', '.')) : ''
    setEditPeso(isNaN(pesoNum) ? '' : String(pesoNum))
    if (h.tipoBaixa === 'descarte') {
      const dPesoNum = h.descPeso ? parseFloat(h.descPeso.replace(/[^\d.,]/g, '').replace(',', '.')) : ''
      setEditDescPeso(isNaN(dPesoNum) ? '' : String(dPesoNum))
      setEditDescMotivo(h.descMotivo || '')
    } else {
      setEditDescPeso('')
      setEditDescMotivo('')
    }
  }

  function salvarEdicao() {
    updateData(d => ({
      ...d,
      hist: d.hist.map(h => h.id === modalEdit.id ? {
        ...h,
        peso: editPeso ? formatPesoKg(editPeso) : '',
        descPeso: h.tipoBaixa === 'descarte' ? (editDescPeso ? formatPesoKg(editDescPeso) : h.descPeso) : h.descPeso,
        descMotivo: h.tipoBaixa === 'descarte' ? editDescMotivo.trim() : h.descMotivo,
      } : h)
    }))
    showToast('✓ Etiqueta atualizada!', 'ok')
    setModalEdit(null)
  }

  function deletar(h) {
    if (!window.confirm(`Deletar PERMANENTEMENTE a etiqueta ${h.num} (${h.prod})?\n\nEsta ação não pode ser desfeita e a etiqueta será removida de todos os relatórios.`)) return
    updateData(d => ({ ...d, hist: d.hist.filter(x => x.id !== h.id) }))
    showToast(`🗑️ Etiqueta ${h.num} deletada`, 'ok')
    setModalVer(null)
  }

  return (
    <div>
      {countVencendo > 0 && (
        <div style={{background:'#fff3e0',border:'2px solid #fb8c00',borderRadius:12,padding:'12px 16px',marginBottom:16,display:'flex',alignItems:'center',gap:10,flexWrap:'wrap'}}>
          <span style={{fontSize:20}}>⚠️</span>
          <div style={{flex:1,minWidth:200}}>
            <b style={{color:'#e65100'}}>{countVencendo} etiqueta{countVencendo>1?'s':''} vencendo em até 2 dias!</b>
            <span style={{fontSize:12,color:'#bf360c',marginLeft:8}}>Verifique e faça a baixa se necessário.</span>
          </div>
          <button className="btn btn-sm" style={{background:'#fb8c00',color:'#fff',border:'none'}} onClick={() => setTab('vencendo')}>Ver →</button>
        </div>
      )}

      <div className="panel">
        <div className="panel-hd">
          <h3>📋 Etiquetas em Uso</h3>
          <input placeholder="🔍 Buscar..." value={busca} onChange={e => setBusca(e.target.value)}
            style={{padding:'7px 12px',border:'2px solid #e0e3ea',borderRadius:8,fontSize:13,outline:'none',fontFamily:'inherit',width:200}} />
        </div>
        <div className="panel-bd">
          <div className="ftabs">
            {TABS.map(([k, l]) => (
              <button key={k} className={`ftab${tab===k?' active':''}`} onClick={() => setTab(k)}>{l}</button>
            ))}
          </div>

          {lista.length === 0 ? (
            <div className="empty"><div className="ei">📋</div><p>Nenhuma etiqueta encontrada</p></div>
          ) : (
            <div className="etv-grid">
              {lista.map(h => (
                <EtvCard key={h.id} h={h} role={role}
                  onBaixa={abrirBaixa}
                  onVer={setModalVer}
                  onEditar={abrirEditar}
                  onDeletar={deletar} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal Baixa */}
      {modalBaixa && (
        <div className="modal-ov" onClick={() => setModalBaixa(null)}>
          <div className="modal modal-wide" onClick={e => e.stopPropagation()}>
            <div className="modal-hd">
              <h3>Dar Baixa — {modalBaixa.num}</h3>
              <button className="modal-cl" onClick={() => setModalBaixa(null)}>×</button>
            </div>
            <div className="modal-bd">
              <p style={{marginBottom:16,color:'#6b7280',fontSize:13}}>{modalBaixa.prod} | Operador: {modalBaixa.op}</p>

              {erros.tipo && <p style={{color:'var(--dn)',fontSize:12,marginBottom:8}}>⚠️ Selecione o tipo de baixa</p>}
              <div style={{display:'flex',gap:12,marginBottom:16}}>
                <button
                  className={`baixa-tipo-btn${tipoSel==='uso'?' uso-sel':''}`}
                  onClick={() => { setTipoSel('uso'); setErros(e => ({...e, tipo: false})) }}>
                  <div className="icn">✅</div>
                  <div className="lbl">Uso</div>
                  <div className="sub">Produto utilizado normalmente</div>
                </button>
                <button
                  className={`baixa-tipo-btn${tipoSel==='descarte'?' desc-sel':''}`}
                  onClick={() => { setTipoSel('descarte'); setErros(e => ({...e, tipo: false})) }}>
                  <div className="icn">🗑️</div>
                  <div className="lbl">Descarte</div>
                  <div className="sub">Produto descartado / perdido</div>
                </button>
              </div>

              <div className="fg" style={{marginBottom:12}}>
                <label>Quem está realizando a baixa *</label>
                <input
                  value={baixaOp}
                  onChange={e => { setBaixaOp(e.target.value); setErros(x => ({...x, op: false})) }}
                  placeholder="Nome do responsável"
                  style={{border: erros.op ? '2px solid var(--dn)' : ''}} />
                {erros.op && <span style={{color:'var(--dn)',fontSize:11}}>Campo obrigatório</span>}
              </div>

              {tipoSel === 'descarte' && (
                <>
                  <div className="fg" style={{marginBottom:12}}>
                    <label>Motivo do descarte *</label>
                    <textarea
                      value={descMotivo}
                      onChange={e => { setDescMotivo(e.target.value); setErros(x => ({...x, motivo: false})) }}
                      placeholder="Descreva o motivo do descarte..."
                      rows={3}
                      style={{border: erros.motivo ? '2px solid var(--dn)' : '', resize:'vertical'}} />
                    {erros.motivo && <span style={{color:'var(--dn)',fontSize:11}}>Campo obrigatório</span>}
                  </div>
                  <div className="fg">
                    <label>Peso descartado *</label>
                    <div style={{display:'flex',alignItems:'center',gap:8}}>
                      <input
                        type="number" step="0.001" min="0"
                        value={descPeso}
                        onChange={e => { setDescPeso(e.target.value); setErros(x => ({...x, peso: false})) }}
                        placeholder="0.000"
                        style={{flex:1, border: erros.peso ? '2px solid var(--dn)' : ''}} />
                      <span style={{fontWeight:700,color:'#6b7280',fontSize:13}}>KG</span>
                    </div>
                    {erros.peso && <span style={{color:'var(--dn)',fontSize:11}}>Campo obrigatório</span>}
                  </div>
                </>
              )}
            </div>
            <div className="modal-ft">
              <button className="btn btn-gy" onClick={() => setModalBaixa(null)}>Cancelar</button>
              <button
                className="btn"
                style={{background: tipoSel==='descarte'?'#7b1fa2':'var(--p)', color:'#fff'}}
                onClick={confirmarBaixa}>
                {tipoSel === 'descarte' ? '🗑️ Registrar Descarte' : tipoSel === 'uso' ? '✅ Confirmar Uso' : 'Confirmar Baixa'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Ver */}
      {modalVer && (
        <ModalVer h={modalVer} role={role}
          onClose={() => setModalVer(null)}
          onBaixa={h => { setModalVer(null); abrirBaixa(h) }}
          onEditar={h => { setModalVer(null); abrirEditar(h) }}
          onDeletar={deletar} />
      )}

      {/* Modal Editar (admin) */}
      {modalEdit && (
        <div className="modal-ov" onClick={() => setModalEdit(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-hd">
              <h3>✏️ Editar — {modalEdit.num}</h3>
              <button className="modal-cl" onClick={() => setModalEdit(null)}>×</button>
            </div>
            <div className="modal-bd">
              <p style={{marginBottom:16,fontSize:13,color:'#6b7280'}}>{modalEdit.prod}</p>
              <div className="fg" style={{marginBottom:12}}>
                <label>Peso da etiqueta</label>
                <div style={{display:'flex',alignItems:'center',gap:8}}>
                  <input type="number" step="0.001" min="0" value={editPeso}
                    onChange={e => setEditPeso(e.target.value)} placeholder="0.000" style={{flex:1}} />
                  <span style={{fontWeight:700,color:'#6b7280',fontSize:13}}>KG</span>
                </div>
              </div>
              {modalEdit.tipoBaixa === 'descarte' && (
                <>
                  <div className="fg" style={{marginBottom:12}}>
                    <label>Peso descartado</label>
                    <div style={{display:'flex',alignItems:'center',gap:8}}>
                      <input type="number" step="0.001" min="0" value={editDescPeso}
                        onChange={e => setEditDescPeso(e.target.value)} placeholder="0.000" style={{flex:1}} />
                      <span style={{fontWeight:700,color:'#6b7280',fontSize:13}}>KG</span>
                    </div>
                  </div>
                  <div className="fg">
                    <label>Motivo do descarte</label>
                    <textarea value={editDescMotivo} onChange={e => setEditDescMotivo(e.target.value)}
                      rows={3} style={{resize:'vertical'}} />
                  </div>
                </>
              )}
            </div>
            <div className="modal-ft">
              <button className="btn btn-gy" onClick={() => setModalEdit(null)}>Cancelar</button>
              <button className="btn btn-p" onClick={salvarEdicao}>✓ Salvar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function EtvCard({ h, role, onBaixa, onVer, onEditar, onDeletar }) {
  const d = du(h.val)
  const vencida = h.val && d < 0
  const vencendo = !vencida && h.val && d >= 0 && d <= 2
  const isDesc = h.tipoBaixa === 'descarte'

  let cls = 'etv-card'
  if (h.baixada) cls += isDesc ? ' descartada' : ' baixada'
  else if (vencida) cls += ' vencida'
  else if (vencendo) cls += ' vencendo'

  let statusBadge
  if (h.baixada) {
    statusBadge = isDesc
      ? <span className="badge b-desc">Descartada</span>
      : <span className="badge b-baixa">Baixa / Uso</span>
  } else if (vencida) {
    statusBadge = <span className="badge b-dn">Vencida</span>
  } else if (vencendo) {
    statusBadge = <span className="badge b-wn">Vence em {d}d</span>
  } else {
    statusBadge = <span className="badge b-ok">Ativa</span>
  }

  return (
    <div className={cls}>
      <div className="etv-header">
        <span className="etv-num">{h.num}</span>
        {statusBadge}
      </div>
      <div className="etv-body">
        <div className="etv-prod">{h.prod}</div>
        <div className="etv-grp" style={{color: h.grpCor || '#999'}}>{h.grp}</div>
        <div className="etv-datas">
          <div className="etv-d"><label>Abertura</label><span>{fd(h.manip)}</span></div>
          <div className="etv-d"><label>Validade</label><span className={vencida ? 'etv-val-v' : ''}>{fd(h.val)}</span></div>
        </div>
        {h.ingr && (
          <div className="etv-ingr">
            <b>Ingredientes: </b>{h.ingr}
          </div>
        )}
        {h.peso && <div className="etv-peso">⚖ Peso: <b>{h.peso}</b></div>}
        {h.obs && <div className="etv-obs">{h.obs}</div>}
        <div className="etv-foot">
          <span className="etv-op">👤 {h.op}</span>
          <span className="etv-qty">{new Date(h.at).toLocaleString('pt-BR')}</span>
        </div>
        {h.baixada && (
          <div style={{fontSize:10,color:isDesc?'#7b1fa2':'var(--p)',marginTop:5,padding:'5px 8px',background:isDesc?'#f3e5f5':'#e8f5ee',borderRadius:6}}>
            {isDesc ? '🗑️ Descartado' : '✅ Dado baixa / uso'} em {new Date(h.baixadaEm).toLocaleString('pt-BR')} por <b>{h.baixadaPor}</b>
            {isDesc && h.descMotivo && <><br /><i style={{fontSize:9}}>Motivo: {h.descMotivo}</i></>}
            {isDesc && h.descPeso && <><br /><b style={{fontSize:10}}>Peso descartado: {h.descPeso}</b></>}
          </div>
        )}
      </div>
      <div className="etv-actions">
        {!h.baixada && <button className="bti baixa" onClick={() => onBaixa(h)}>✅ Dar Baixa</button>}
        <button className="bti ed" onClick={() => onVer(h)}>📷 Ver</button>
        {role === 'admin' && <button className="bti ed" onClick={() => onEditar(h)}>✏️ Editar</button>}
        {role === 'admin' && <button className="bti dl" onClick={() => onDeletar(h)}>🗑️ Deletar</button>}
      </div>
      {h.baixada && (
        <div className={`etv-stamp ${isDesc ? 'desc' : 'uso'}`}>
          {isDesc ? 'DESCARTADA' : 'BAIXADA'}
        </div>
      )}
    </div>
  )
}

function ModalVer({ h, role, onClose, onBaixa, onEditar, onDeletar }) {
  const d = du(h.val)
  const vencida = h.val && d < 0
  const isDesc = h.tipoBaixa === 'descarte'

  return (
    <div className="modal-ov" onClick={onClose}>
      <div className="modal modal-wide" onClick={e => e.stopPropagation()}>
        <div className="modal-hd">
          <h3>{h.num} — {h.prod}</h3>
          <button className="modal-cl" onClick={onClose}>×</button>
        </div>
        <div className="modal-bd">
          <div style={{border:`3px solid ${h.grpCor||'#e67e00'}`,borderRadius:14,padding:20,fontFamily:'Arial,sans-serif',background:'#fafffe'}}>
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:10}}>
              <span style={{fontWeight:900,fontSize:14,color:h.grpCor||'#e67e00'}}>etiqPRO</span>
              <span style={{fontSize:12,color:'#aaa'}}>{h.num}</span>
            </div>
            <div style={{fontSize:26,fontWeight:900,marginBottom:4}}>{h.prod}</div>
            <div style={{fontSize:13,fontWeight:700,color:h.grpCor||'#999',marginBottom:14}}>{h.grp}</div>
            <div style={{display:'grid',gridTemplateColumns:`1fr 1fr${h.peso?' 1fr':''}`,gap:12,background:'#f5f6fa',borderRadius:10,padding:12,marginBottom:12}}>
              <div>
                <div style={{fontSize:10,fontWeight:800,color:'#888',textTransform:'uppercase',marginBottom:3}}>Abertura</div>
                <div style={{fontSize:20,fontWeight:900}}>{fd(h.manip)}</div>
              </div>
              <div>
                <div style={{fontSize:10,fontWeight:800,color:'#888',textTransform:'uppercase',marginBottom:3}}>Validade</div>
                <div style={{fontSize:20,fontWeight:900,color:vencida?'var(--dn)':'var(--tx)'}}>{fd(h.val)}</div>
              </div>
              {h.peso && (
                <div>
                  <div style={{fontSize:10,fontWeight:800,color:'#888',textTransform:'uppercase',marginBottom:3}}>Peso</div>
                  <div style={{fontSize:20,fontWeight:900}}>{h.peso}</div>
                </div>
              )}
            </div>
            {h.ingr && <div style={{fontSize:12,background:'#fff8f0',borderLeft:'3px solid #e67e00',padding:'8px 12px',borderRadius:5,marginBottom:8}}><b style={{color:'#e67e00',fontSize:11,textTransform:'uppercase'}}>Ingredientes:</b> {h.ingr}</div>}
            {h.obs && <div style={{fontSize:12,color:'#888',fontStyle:'italic',marginBottom:8}}>{h.obs}</div>}
            <div style={{display:'flex',justifyContent:'space-between',borderTop:'1px solid #ddd',paddingTop:10,fontSize:12,color:'#666'}}>
              <span><b>Operador:</b> {h.op}</span>
              <span>{new Date(h.at).toLocaleString('pt-BR')}</span>
            </div>
            {h.baixada && (
              <div style={{marginTop:10,padding:'10px 14px',background:isDesc?'#f3e5f5':'#e8f5ee',borderRadius:8,fontSize:12,color:isDesc?'#7b1fa2':'var(--p)'}}>
                <b>{isDesc ? '🗑️ Descartada' : '✅ Baixada / Uso'}</b> em {new Date(h.baixadaEm).toLocaleString('pt-BR')} por <b>{h.baixadaPor}</b>
                {isDesc && h.descMotivo && <><br />Motivo: <i>{h.descMotivo}</i></>}
                {isDesc && h.descPeso && <><br />Peso descartado: <b>{h.descPeso}</b></>}
              </div>
            )}
          </div>
        </div>
        <div className="modal-ft">
          {!h.baixada && <button className="btn btn-p" onClick={() => onBaixa(h)}>✅ Dar Baixa</button>}
          {role === 'admin' && <button className="btn" style={{background:'#1976d2',color:'#fff'}} onClick={() => onEditar(h)}>✏️ Editar</button>}
          {role === 'admin' && <button className="btn btn-dn" onClick={() => onDeletar(h)}>🗑️ Deletar</button>}
          <button className="btn btn-o" onClick={onClose}>Fechar</button>
        </div>
      </div>
    </div>
  )
}
