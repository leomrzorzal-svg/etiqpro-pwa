import React, { useState } from 'react'
import { useApp } from '../App'

const vazio = { id: null, nome: '', grp: '', vDias: '', ingr: '', conserv: '', obs: '', ativo: true }

const CONSERV_PRESETS = [
  { label: '🧊 Refrigerado 0-5°C', value: 'Refrigerado 0-5°C' },
  { label: '❄️ Congelado -18°C', value: 'Congelado -18°C' },
  { label: '🌡️ Temp. Ambiente', value: 'Temperatura Ambiente' },
  { label: '🔥 Quente >65°C', value: 'Manter quente >65°C' },
]

export default function PgProdutos() {
  const { data, updateData, showToast } = useApp()
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState(vazio)
  const [busca, setBusca] = useState('')
  const [gFilter, setGFilter] = useState('')

  let lista = data.prods
  if (busca) lista = lista.filter(p => p.nome.toLowerCase().includes(busca.toLowerCase()))
  if (gFilter) lista = lista.filter(p => p.grp == gFilter)

  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }

  function abrirNovo() { setForm(vazio); setModal(true) }
  function abrirEditar(p) { setForm({ ...p }); setModal(true) }

  function salvar() {
    if (!form.nome.trim()) return showToast('Nome é obrigatório', 'erro')
    if (!form.grp) return showToast('Selecione um grupo', 'erro')
    if (!form.vDias || +form.vDias <= 0) return showToast('Dias de validade inválido', 'erro')
    updateData(d => {
      const prods = form.id
        ? d.prods.map(p => p.id === form.id ? { ...form, vDias: +form.vDias } : p)
        : [...d.prods, { ...form, id: Date.now(), vDias: +form.vDias, ativo: true }]
      return { ...d, prods }
    })
    showToast('✓ Produto salvo!', 'ok')
    setModal(false)
  }

  function toggleAtivo(p) {
    updateData(d => ({ ...d, prods: d.prods.map(x => x.id === p.id ? { ...x, ativo: !x.ativo } : x) }))
  }

  function excluir(p) {
    if (!confirm(`Excluir "${p.nome}" permanentemente?`)) return
    updateData(d => ({ ...d, prods: d.prods.filter(x => x.id !== p.id) }))
    showToast('Produto excluído', 'ok')
  }

  return (
    <div>
      <div className="panel">
        <div className="panel-hd">
          <h3>📦 Produtos Cadastrados</h3>
          <div style={{display:'flex',gap:10,alignItems:'center',flexWrap:'wrap'}}>
            <input placeholder="🔍 Buscar..." value={busca} onChange={e => setBusca(e.target.value)}
              style={{padding:'7px 12px',border:'2px solid #e0e3ea',borderRadius:8,fontSize:13,outline:'none',fontFamily:'inherit',width:180}} />
            <button className="btn btn-p" onClick={abrirNovo}>+ Novo Produto</button>
          </div>
        </div>
        <div className="panel-bd" style={{paddingBottom:0}}>
          <div className="ftabs">
            <button className={`ftab${gFilter===''?' active':''}`} onClick={() => setGFilter('')}>Todos</button>
            {data.grps.map(g => (
              <button key={g.id} className={`ftab${gFilter==g.id?' active':''}`} onClick={() => setGFilter(g.id)}>{g.nome}</button>
            ))}
          </div>
        </div>
        <div className="panel-bd" style={{padding:0}}>
          {lista.length === 0 ? (
            <div className="empty"><div className="ei">📦</div><p>Nenhum produto encontrado</p></div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead><tr><th>Produto</th><th>Grupo</th><th>Validade</th><th>Conservação</th><th>Status</th><th></th></tr></thead>
                <tbody>
                  {lista.map(p => {
                    const grp = data.grps.find(g => g.id == p.grp)
                    return (
                      <tr key={p.id} style={{opacity: p.ativo ? 1 : 0.55}}>
                        <td>
                          <strong>{p.nome}</strong>
                          {p.ingr && <div style={{fontSize:11,color:'#e67e00',marginTop:1}}>{p.ingr.substring(0,60)}{p.ingr.length>60?'...':''}</div>}
                          {p.obs && <div style={{fontSize:11,color:'var(--t2)',marginTop:1}}>{p.obs}</div>}
                        </td>
                        <td>{grp && <span className="badge" style={{background:grp.cor+'22',color:grp.cor}}>{grp.nome}</span>}</td>
                        <td><span className="badge b-ok">{p.vDias} dias</span></td>
                        <td style={{fontSize:12,color:'#1976d2',fontWeight:600}}>{p.conserv || '—'}</td>
                        <td><span className={`badge ${p.ativo?'b-ok':'b-gy'}`}>{p.ativo?'Ativo':'Inativo'}</span></td>
                        <td>
                          <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
                            <button className="bti ed" onClick={() => abrirEditar(p)}>✏️ Editar</button>
                            <button className="bti" onClick={() => toggleAtivo(p)}>{p.ativo ? 'Desativar' : 'Ativar'}</button>
                            <button className="bti dl" onClick={() => excluir(p)}>🗑️</button>
                          </div>
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

      {modal && (
        <div className="modal-ov" onClick={() => setModal(false)}>
          <div className="modal modal-wide" onClick={e => e.stopPropagation()}>
            <div className="modal-hd">
              <h3>{form.id ? '✏️ Editar Produto' : '+ Novo Produto'}</h3>
              <button className="modal-cl" onClick={() => setModal(false)}>×</button>
            </div>
            <div className="modal-bd">
              <div className="form-grid" style={{marginBottom:14}}>
                <div className="fg" style={{gridColumn:'1/-1'}}>
                  <label>Nome do produto *</label>
                  <input value={form.nome} onChange={e => set('nome', e.target.value)} placeholder="Ex: Frango Grelhado" />
                </div>
                <div className="fg">
                  <label>Grupo *</label>
                  <select value={form.grp} onChange={e => set('grp', +e.target.value)}
                    style={{padding:'10px 14px',border:'2px solid #e0e3ea',borderRadius:10,fontSize:14,fontFamily:'inherit',background:'#fafafa',outline:'none'}}>
                    <option value="">Selecione...</option>
                    {data.grps.map(g => <option key={g.id} value={g.id}>{g.nome}</option>)}
                  </select>
                </div>
                <div className="fg">
                  <label>Dias de validade *</label>
                  <input type="number" min="1" value={form.vDias} onChange={e => set('vDias', e.target.value)} placeholder="Ex: 3" />
                </div>
                <div className="fg" style={{gridColumn:'1/-1'}}>
                  <label>Ingredientes</label>
                  <input value={form.ingr} onChange={e => set('ingr', e.target.value)} placeholder="Lista de ingredientes..." />
                </div>
                <div className="fg" style={{gridColumn:'1/-1'}}>
                  <label>Conservação</label>
                  <div style={{display:'flex',gap:6,flexWrap:'wrap',marginBottom:8}}>
                    {CONSERV_PRESETS.map(c => (
                      <button key={c.value} type="button"
                        onClick={() => set('conserv', form.conserv === c.value ? '' : c.value)}
                        style={{
                          padding:'6px 12px',borderRadius:20,fontSize:12,fontWeight:700,cursor:'pointer',fontFamily:'inherit',
                          border: form.conserv === c.value ? '2px solid var(--p)' : '2px solid var(--g2)',
                          background: form.conserv === c.value ? 'var(--pl)' : '#fff',
                          color: form.conserv === c.value ? 'var(--p)' : 'var(--tx)',
                        }}>
                        {c.label}
                      </button>
                    ))}
                  </div>
                  <input value={form.conserv} onChange={e => set('conserv', e.target.value)} placeholder="Ou digite a instrução de conservação..." />
                </div>
                <div className="fg" style={{gridColumn:'1/-1'}}>
                  <label>Observações</label>
                  <input value={form.obs} onChange={e => set('obs', e.target.value)} placeholder="Obs opcionais..." />
                </div>
              </div>
            </div>
            <div className="modal-ft">
              <button className="btn btn-gy" onClick={() => setModal(false)}>Cancelar</button>
              <button className="btn btn-p" onClick={salvar}>✓ Salvar Produto</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
