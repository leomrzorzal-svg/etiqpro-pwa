import { useState, useEffect, useCallback } from 'react'
import { getEtiquetas, darBaixaEtiqueta, editarEtiqueta, formatData, diasRestantes } from '../lib/db.js'
import { useAuth, useToast } from '../App.jsx'

export default function GestaoEtiquetas() {
  const { user } = useAuth(); const toast = useToast()
  const [tab, setTab] = useState('ativas')
  const [etiquetas, setEtiq] = useState([])
  const [loading, setLoading] = useState(true)
  const [buscaProd, setBuscaProd] = useState('')
  const [buscaOp, setBuscaOp] = useState('')
  const [baixaModal, setBaixaModal] = useState(null)
  const [editModal, setEditModal] = useState(null)

  const carregar = useCallback(async () => {
    setLoading(true)
    try {
      const filtro = {}
      if (tab === 'ativas') filtro.status = 'ativa'
      else if (tab === 'uso') filtro.status = 'uso'
      else if (tab === 'descarte') filtro.status = 'descarte'
      if (buscaProd) filtro.produto = buscaProd
      if (buscaOp) filtro.operador = buscaOp
      setEtiq(await getEtiquetas(filtro))
    } catch { toast('Erro ao carregar etiquetas', 'err') }
    finally { setLoading(false) }
  }, [tab, buscaProd, buscaOp])

  useEffect(() => { carregar() }, [carregar])

  const cls = (e) => {
    if (e.status==='descarte') return 'descartada'
    if (e.status==='uso') return 'uso'
    const d = diasRestantes(e.data_validade)
    if (d < 0) return 'vencida'
    if (d <= 1) return 'vencendo'
    return ''
  }

  const badge = (e) => {
    if (e.status==='descarte') return <span className="badge b-desc">Descartada</span>
    if (e.status==='uso') return <span className="badge b-uso">Em Uso</span>
    const d = diasRestantes(e.data_validade)
    if (d < 0) return <span className="badge b-dn">Vencida há {Math.abs(d)}d</span>
    if (d === 0) return <span className="badge b-wn">Vence hoje</span>
    if (d === 1) return <span className="badge b-wn">Vence amanhã</span>
    return <span className="badge b-ok">Válida · {d}d</span>
  }

  return (
    <>
      <div className="panel" style={{marginBottom:16}}>
        <div className="panel-body" style={{paddingTop:16,paddingBottom:16}}>
          <div className="ftabs">
            {[['ativas','Ativas'],['uso','Em Uso'],['descarte','Descartadas'],['todas','Todas']].map(([v,l]) => (
              <div key={v} className={`ftab ${tab===v?'active':''}`} onClick={()=>setTab(v)}>{l}</div>
            ))}
          </div>
          <div className="form-grid">
            <div className="fg"><input value={buscaProd} onChange={e=>setBuscaProd(e.target.value)} placeholder="🔍 Produto..." /></div>
            <div className="fg"><input value={buscaOp} onChange={e=>setBuscaOp(e.target.value)} placeholder="👤 Operador..." /></div>
          </div>
        </div>
      </div>
      {loading ? <div className="empty"><div className="ei">⏳</div><p>Carregando...</p></div>
      : etiquetas.length === 0 ? <div className="empty"><div className="ei">🏷️</div><p>Nenhuma etiqueta encontrada</p></div>
      : etiquetas.map(e => (
        <div key={e.id} className={`etv-card ${cls(e)}`}>
          <div className="etv-info">
            <div className="etv-num">{e.numero}</div>
            <div className="etv-nome">{e.produto_nome}</div>
            <div className="etv-grp" style={{color:e.grupo_cor}}>{e.grupo_nome}</div>
            <div className="etv-datas">
              <div className="etv-data">Abertura: <b>{formatData(e.data_manipulacao)}</b></div>
              <div className="etv-data">Validade: <b>{formatData(e.data_validade)}</b></div>
              <div className="etv-data">Op: <b>{e.operador}</b></div>
            </div>
            {e.status==='descarte' && e.descarte_motivo && (
              <div style={{fontSize:11,color:'#7b1fa2',marginTop:4}}>🗑️ {e.descarte_motivo} {e.descarte_peso_kg?'· '+e.descarte_peso_kg+' KG':''}</div>
            )}
          </div>
          <div className="etv-actions">
            {badge(e)}
            {e.status==='ativa' && <button className="bti baixa" onClick={()=>setBaixaModal(e)}>Dar Baixa</button>}
            {user.role==='admin' && e.status!=='descarte' && <button className="bti ed" onClick={()=>setEditModal(e)}>Editar</button>}
          </div>
        </div>
      ))}
      {baixaModal && <ModalBaixa etq={baixaModal} user={user} onClose={()=>setBaixaModal(null)} onDone={()=>{setBaixaModal(null);carregar();toast('Baixa registrada!','ok')}} />}
      {editModal && <ModalEdit etq={editModal} onClose={()=>setEditModal(null)} onDone={()=>{setEditModal(null);carregar();toast('Atualizado!','ok')}} />}
    </>
  )
}

function ModalBaixa({ etq, user, onClose, onDone }) {
  const [tipo, setTipo] = useState(''); const [op, setOp] = useState(user.nome)
  const [motivo, setMotivo] = useState(''); const [peso, setPeso] = useState('')
  const [loading, setLoading] = useState(false); const toast = useToast()
  const confirmar = async () => {
    if (!tipo) { toast('Selecione o tipo de baixa','err'); return }
    if (!op.trim()) { toast('Informe o operador','err'); return }
    if (tipo==='descarte' && !motivo.trim()) { toast('Informe o motivo','err'); return }
    setLoading(true)
    try { await darBaixaEtiqueta(etq.id, tipo, op.trim(), motivo, peso?parseFloat(peso.replace(',','.')):null); onDone() }
    catch(e) { toast('Erro: '+e.message,'err') }
    finally { setLoading(false) }
  }
  return (
    <div className="modal-ov open" onClick={e=>e.target.className.includes('modal-ov')&&onClose()}>
      <div className="modal">
        <div className="modal-hd"><h3>Dar Baixa — {etq.produto_nome}</h3><button className="modal-cl" onClick={onClose}>×</button></div>
        <div className="modal-bd">
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:16}}>
            {[['uso','✅ Uso','Produto utilizado'],['descarte','🗑️ Descarte','Produto perdido']].map(([v,t,s])=>(
              <div key={v} onClick={()=>setTipo(v)} style={{border:`2px solid ${tipo===v?'#e67e00':'#e0e3ea'}`,borderRadius:12,padding:'14px 12px',cursor:'pointer',textAlign:'center',background:tipo===v?'#fff3e0':'#fafafa'}}>
                <div style={{fontSize:20,marginBottom:4}}>{t.split(' ')[0]}</div>
                <div style={{fontWeight:700,fontSize:13}}>{t.split(' ').slice(1).join(' ')}</div>
                <div style={{fontSize:11,color:'#888'}}>{s}</div>
              </div>
            ))}
          </div>
          <div className="fg" style={{marginBottom:12}}><label>Operador *</label><input value={op} onChange={e=>setOp(e.target.value)} /></div>
          {tipo==='descarte' && <>
            <div className="fg" style={{marginBottom:12}}><label>Motivo *</label><input value={motivo} onChange={e=>setMotivo(e.target.value)} placeholder="Ex: Vencido..." /></div>
            <div className="fg"><label>Peso (KG)</label><input value={peso} onChange={e=>setPeso(e.target.value)} placeholder="0.500" /></div>
          </>}
        </div>
        <div className="modal-ft">
          <button className="btn btn-o" onClick={onClose}>Cancelar</button>
          <button className="btn btn-p" onClick={confirmar} disabled={loading}>{loading?'Salvando...':'Confirmar'}</button>
        </div>
      </div>
    </div>
  )
}

function ModalEdit({ etq, onClose, onDone }) {
  const [validade, setVal] = useState(etq.data_validade||'')
  const [conserv, setC] = useState(etq.conservacao||'')
  const [obs, setO] = useState(etq.obs||'')
  const [loading, setLoading] = useState(false); const toast = useToast()
  const salvar = async () => {
    setLoading(true)
    try { await editarEtiqueta(etq.id, {data_validade:validade||null,conservacao:conserv,obs}); onDone() }
    catch(e) { toast('Erro: '+e.message,'err') }
    finally { setLoading(false) }
  }
  return (
    <div className="modal-ov open" onClick={e=>e.target.className.includes('modal-ov')&&onClose()}>
      <div className="modal">
        <div className="modal-hd"><h3>Editar — {etq.produto_nome}</h3><button className="modal-cl" onClick={onClose}>×</button></div>
        <div className="modal-bd">
          <div className="fg" style={{marginBottom:12}}><label>Validade</label><input type="date" value={validade} onChange={e=>setVal(e.target.value)} /></div>
          <div className="fg" style={{marginBottom:12}}><label>Conservação</label><input value={conserv} onChange={e=>setC(e.target.value)} /></div>
          <div className="fg"><label>Observação</label><input value={obs} onChange={e=>setO(e.target.value)} /></div>
        </div>
        <div className="modal-ft">
          <button className="btn btn-o" onClick={onClose}>Cancelar</button>
          <button className="btn btn-p" onClick={salvar} disabled={loading}>{loading?'Salvando...':'Salvar'}</button>
        </div>
      </div>
    </div>
  )
}
