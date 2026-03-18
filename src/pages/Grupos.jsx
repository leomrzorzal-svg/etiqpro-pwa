import { useState, useEffect } from 'react'
import { getGrupos, salvarGrupo, deletarGrupo } from '../lib/db.js'
import { useToast } from '../App.jsx'

const CORES = ['#e53935','#f4a11d','#1a6b3c','#1976d2','#7b1fa2','#e67e00','#00838f','#558b2f','#6d4c41','#37474f']

export default function Grupos() {
  const toast = useToast()
  const [grupos, setGrupos] = useState([])
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({nome:'',cor:'#e67e00'})
  const [saving, setSaving] = useState(false)

  const carregar = async () => { try { setGrupos(await getGrupos()) } catch { toast('Erro','err') } }
  useEffect(() => { carregar() }, [])

  const abrir = (g=null) => { setForm(g?{id:g.id,nome:g.nome,cor:g.cor}:{nome:'',cor:'#e67e00'}); setModal(true) }

  const salvar = async () => {
    if (!form.nome.trim()) { toast('Nome obrigatório','err'); return }
    setSaving(true)
    try { await salvarGrupo(form); toast('Salvo!','ok'); setModal(false); await carregar() }
    catch(e) { toast('Erro: '+e.message,'err') }
    finally { setSaving(false) }
  }

  const deletar = async (id) => {
    if (!confirm('Deletar grupo?')) return
    try { await deletarGrupo(id); toast('Deletado','info'); await carregar() }
    catch { toast('Não é possível deletar grupo com produtos','err') }
  }

  return (
    <>
      <div className="panel">
        <div className="panel-header"><h3>📁 Grupos de Produtos</h3><button className="btn btn-p btn-sm" onClick={()=>abrir()}>+ Novo Grupo</button></div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Grupo</th><th>Cor</th><th>Ações</th></tr></thead>
            <tbody>
              {grupos.map(g => (
                <tr key={g.id}>
                  <td><strong>{g.nome}</strong></td>
                  <td><div style={{width:24,height:24,borderRadius:'50%',background:g.cor}} /></td>
                  <td><div style={{display:'flex',gap:6}}><button className="bti ed" onClick={()=>abrir(g)}>Editar</button><button className="bti dl" onClick={()=>deletar(g.id)}>Deletar</button></div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {modal && (
        <div className="modal-ov open" onClick={e=>e.target.className.includes('modal-ov')&&setModal(false)}>
          <div className="modal">
            <div className="modal-hd"><h3>{form.id?'Editar':'Novo'} Grupo</h3><button className="modal-cl" onClick={()=>setModal(false)}>×</button></div>
            <div className="modal-bd">
              <div className="fg" style={{marginBottom:16}}><label>Nome *</label><input value={form.nome} onChange={e=>setForm(f=>({...f,nome:e.target.value}))} placeholder="Ex: Carnes" /></div>
              <div className="fg">
                <label>Cor</label>
                <div style={{display:'flex',gap:8,flexWrap:'wrap',marginBottom:8}}>
                  {CORES.map(c => <div key={c} onClick={()=>setForm(f=>({...f,cor:c}))} style={{width:32,height:32,borderRadius:'50%',background:c,cursor:'pointer',border:form.cor===c?'3px solid #1a1a2e':'2px solid #fff',boxShadow:'0 0 0 2px '+c}} />)}
                </div>
                <input type="color" value={form.cor} onChange={e=>setForm(f=>({...f,cor:e.target.value}))} style={{width:60,height:36,border:'none',borderRadius:8,cursor:'pointer'}} />
              </div>
            </div>
            <div className="modal-ft">
              <button className="btn btn-o" onClick={()=>setModal(false)}>Cancelar</button>
              <button className="btn btn-p" onClick={salvar} disabled={saving}>{saving?'Salvando...':'Salvar'}</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
