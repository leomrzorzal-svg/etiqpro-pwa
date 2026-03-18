import { useState, useEffect } from 'react'
import { getProdutos, addProduto, updateProduto, deleteProduto } from '../lib/db'

const GRUPOS = ['Carnes','Aves','Peixes','Laticínios','Vegetais','Massas','Molhos','Sobremesas','Outros']

const VAZIO = { nome:'', grupo:'Outros', dias_validade:3, ingredientes:'', conservacao:'' }

export default function Produtos() {
  const [produtos, setProdutos]   = useState([])
  const [form, setForm]           = useState(null)  // null = fechado, {} = novo/editar
  const [loading, setLoading]     = useState(false)

  async function carregar() { setProdutos(await getProdutos()) }
  useEffect(() => { carregar() }, [])

  function abrirNovo()  { setForm({ ...VAZIO }) }
  function abrirEditar(p) { setForm({ ...p }) }

  async function salvar() {
    if (!form.nome) return
    setLoading(true)
    if (form.id) {
      const { id, ...dados } = form
      await updateProduto(id, dados)
    } else {
      await addProduto(form)
    }
    await carregar()
    setForm(null)
    setLoading(false)
  }

  async function excluir(p) {
    if (!confirm(`Excluir "${p.nome}"?`)) return
    await deleteProduto(p.id)
    carregar()
  }

  return (
    <div style={{ maxWidth:480, margin:'0 auto' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
        <h2 style={{ margin:0, color:'#1A1208' }}>📦 Produtos</h2>
        <button onClick={abrirNovo}
          style={{ padding:'8px 16px', borderRadius:8, border:'none', background:'#E67E00', color:'#fff', fontWeight:'bold', cursor:'pointer' }}>
          + Novo
        </button>
      </div>

      {/* Modal form */}
      {form && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.6)', display:'flex', alignItems:'flex-end', zIndex:999 }}>
          <div style={{ width:'100%', background:'#fff', borderRadius:'16px 16px 0 0', padding:20, maxHeight:'90vh', overflowY:'auto' }}>
            <h3 style={{ margin:'0 0 16px' }}>{form.id ? 'Editar' : 'Novo'} Produto</h3>
            <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
              <input placeholder="Nome do produto *" value={form.nome} onChange={e => setForm({...form, nome:e.target.value})} style={inputStyle} />
              <select value={form.grupo} onChange={e => setForm({...form, grupo:e.target.value})} style={inputStyle}>
                {GRUPOS.map(g => <option key={g}>{g}</option>)}
              </select>
              <div>
                <label style={{ fontSize:13, color:'#555' }}>Dias de validade</label>
                <input type="number" min={1} max={365} value={form.dias_validade}
                  onChange={e => setForm({...form, dias_validade: Number(e.target.value)})}
                  style={{ ...inputStyle, marginTop:4 }} />
              </div>
              <textarea placeholder="Ingredientes (opcional)" value={form.ingredientes}
                onChange={e => setForm({...form, ingredientes:e.target.value})}
                rows={3} style={{ ...inputStyle, resize:'none' }} />
              <input placeholder="Conservação (ex: Refrigerado 0-4°C)" value={form.conservacao}
                onChange={e => setForm({...form, conservacao:e.target.value})} style={inputStyle} />
            </div>
            <div style={{ display:'flex', gap:8, marginTop:16 }}>
              <button onClick={() => setForm(null)} style={{ flex:1, padding:14, borderRadius:8, border:'1px solid #ddd', background:'#fff', fontSize:15, cursor:'pointer' }}>
                Cancelar
              </button>
              <button onClick={salvar} disabled={loading}
                style={{ flex:2, padding:14, borderRadius:8, border:'none', background:'#E67E00', color:'#fff', fontSize:15, fontWeight:'bold', cursor:'pointer' }}>
                {loading ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lista */}
      <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
        {produtos.map(p => (
          <div key={p.id} style={{ background:'#fff', borderRadius:8, padding:'12px 14px',
                                    boxShadow:'0 1px 4px rgba(0,0,0,0.08)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <div>
              <div style={{ fontWeight:'bold', fontSize:14 }}>{p.nome}</div>
              <div style={{ fontSize:11, color:'#999' }}>{p.grupo} · {p.dias_validade} dias</div>
            </div>
            <div style={{ display:'flex', gap:8 }}>
              <button onClick={() => abrirEditar(p)} style={btnSmall}>✏️</button>
              <button onClick={() => excluir(p)} style={{ ...btnSmall, color:'#E53935' }}>🗑️</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

const inputStyle = { padding:'12px 14px', borderRadius:8, border:'1px solid #ddd', fontSize:15, width:'100%', boxSizing:'border-box' }
const btnSmall   = { padding:'6px 10px', borderRadius:6, border:'1px solid #eee', background:'#fff', cursor:'pointer', fontSize:16 }
