import React, { useState } from 'react'
import { useApp } from '../App'

export default function PgGrupos() {
  const { data, updateData, showToast } = useApp()
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({ id:null, nome:'', cor:'#e67e00' })

  function salvar() {
    if (!form.nome.trim()) return showToast('Nome é obrigatório', 'erro')
    updateData(d => {
      const grps = form.id
        ? d.grps.map(g => g.id === form.id ? form : g)
        : [...d.grps, { ...form, id: Date.now() }]
      return { ...d, grps }
    })
    showToast('✓ Grupo salvo!', 'ok')
    setModal(false)
  }

  function excluir(g) {
    const emUso = data.prods.some(p => p.ativo && p.grp == g.id)
    if (emUso) return showToast('Grupo em uso por produtos!', 'erro')
    if (!confirm(`Remover "${g.nome}"?`)) return
    updateData(d => ({ ...d, grps: d.grps.filter(x => x.id !== g.id) }))
    showToast('Grupo removido', 'ok')
  }

  return (
    <div className="panel">
      <div className="panel-hd">
        <h3>🗂️ Grupos de Produtos</h3>
        <button className="btn btn-p" onClick={() => { setForm({id:null,nome:'',cor:'#e67e00'}); setModal(true) }}>+ Novo Grupo</button>
      </div>
      <div className="panel-bd" style={{padding:0}}>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Cor</th><th>Nome</th><th>Produtos</th><th></th></tr></thead>
            <tbody>
              {data.grps.map(g => (
                <tr key={g.id}>
                  <td><div style={{width:32,height:32,borderRadius:8,background:g.cor}} /></td>
                  <td style={{fontWeight:700}}>{g.nome}</td>
                  <td><span className="badge b-ok">{data.prods.filter(p=>p.ativo&&p.grp==g.id).length} produtos</span></td>
                  <td>
                    <div style={{display:'flex',gap:6}}>
                      <button className="btn btn-sm btn-gy" onClick={() => { setForm({...g}); setModal(true) }}>✏️ Editar</button>
                      <button className="btn btn-sm" style={{background:'#ffebee',color:'#e53935',border:'none'}} onClick={() => excluir(g)}>🗑️</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {modal && (
        <div className="modal-ov" onClick={() => setModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-hd">
              <h3>{form.id ? 'Editar Grupo' : 'Novo Grupo'}</h3>
              <button className="modal-cl" onClick={() => setModal(false)}>×</button>
            </div>
            <div className="modal-bd">
              <div className="fg" style={{marginBottom:14}}>
                <label>Nome do grupo *</label>
                <input value={form.nome} onChange={e => setForm(f=>({...f,nome:e.target.value}))} placeholder="Ex: Carnes" />
              </div>
              <div className="fg">
                <label>Cor</label>
                <input type="color" value={form.cor} onChange={e => setForm(f=>({...f,cor:e.target.value}))}
                  style={{height:44,padding:2,borderRadius:10,border:'2px solid #e0e3ea',cursor:'pointer',width:80}} />
              </div>
            </div>
            <div className="modal-ft">
              <button className="btn btn-gy" onClick={() => setModal(false)}>Cancelar</button>
              <button className="btn btn-p" onClick={salvar}>✓ Salvar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
