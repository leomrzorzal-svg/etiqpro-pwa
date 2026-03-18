import React, { useState, useEffect } from 'react'
import { useApp } from '../App'
import { getProdutos, salvarProduto, deletarProduto } from '../lib/db'

const GRUPOS = ['Carnes','Aves','Peixes','Laticínios','Vegetais','Massas','Molhos','Sobremesas','Bebidas','Outros']

const produtoVazio = { nome:'', grupo:'', dias_validade:'', ingredientes:'', conservacao:'' }

export default function PaginaProdutos() {
  const { showToast } = useApp()
  const [produtos, setProdutos] = useState([])
  const [loading, setLoading]   = useState(true)
  const [drawer, setDrawer]     = useState(false)
  const [form, setForm]         = useState(produtoVazio)
  const [salvando, setSalvando] = useState(false)
  const [busca, setBusca]       = useState('')

  async function carregar() {
    setLoading(true)
    setProdutos(await getProdutos())
    setLoading(false)
  }

  useEffect(() => { carregar() }, [])

  function abrirNovo()    { setForm(produtoVazio); setDrawer(true) }
  function abrirEditar(p) { setForm(p);            setDrawer(true) }
  function set(k, v)      { setForm(f => ({...f, [k]: v})) }

  async function handleSalvar() {
    if (!form.nome.trim()) return showToast('Nome é obrigatório', 'erro')
    setSalvando(true)
    try {
      await salvarProduto(form)
      showToast('✓ Produto salvo!', 'sucesso')
      setDrawer(false)
      carregar()
    } catch(err) {
      showToast('Erro: ' + err.message, 'erro')
    } finally { setSalvando(false) }
  }

  async function handleDeletar(p) {
    if (!confirm(`Remover "${p.nome}"?`)) return
    try {
      await deletarProduto(p.id)
      showToast('Removido', 'sucesso')
      carregar()
    } catch(err) {
      showToast('Erro: ' + err.message, 'erro')
    }
  }

  const filtrados = produtos.filter(p =>
    p.nome.toLowerCase().includes(busca.toLowerCase()) ||
    p.grupo?.toLowerCase().includes(busca.toLowerCase())
  )

  return (
    <div>
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16}}>
        <h2 style={{fontSize:18, fontWeight:800}}>Produtos</h2>
        <button className="btn btn-primary btn-sm" onClick={abrirNovo}>+ Novo</button>
      </div>

      <input
        className="form-input"
        placeholder="🔍 Buscar produto ou grupo..."
        value={busca}
        onChange={e => setBusca(e.target.value)}
        style={{marginBottom:16}}
      />

      {loading && <div className="spinner" />}

      {!loading && filtrados.length === 0 && (
        <div style={{textAlign:'center', padding:'40px 0', color:'var(--cinza3)'}}>
          <div style={{fontSize:40, marginBottom:8}}>📦</div>
          <p>{busca ? 'Nenhum produto encontrado' : 'Cadastre o primeiro produto'}</p>
        </div>
      )}

      {filtrados.map(p => (
        <div key={p.id} className="card">
          <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
            <div style={{flex:1}} onClick={() => abrirEditar(p)} style={{cursor:'pointer',flex:1}}>
              <div style={{fontWeight:700}}>{p.nome}</div>
              <div style={{fontSize:12, color:'var(--cinza3)', marginTop:2}}>
                {p.grupo}{p.dias_validade ? ` · ${p.dias_validade} dias` : ''}
              </div>
            </div>
            <div style={{display:'flex', gap:8}}>
              <button className="btn btn-ghost btn-sm" onClick={() => abrirEditar(p)}>✏️</button>
              <button className="btn btn-ghost btn-sm" onClick={() => handleDeletar(p)}>🗑️</button>
            </div>
          </div>
        </div>
      ))}

      {drawer && (
        <div className="overlay" onClick={() => setDrawer(false)}>
          <div className="drawer" onClick={e => e.stopPropagation()}>
            <div className="drawer-handle" />
            <h3 style={{fontWeight:800, marginBottom:16}}>{form.id ? 'Editar produto' : 'Novo produto'}</h3>

            <div className="form-group">
              <label className="form-label">Nome *</label>
              <input className="form-input" value={form.nome} onChange={e => set('nome', e.target.value)} placeholder="Ex: Frango Grelhado" />
            </div>

            <div className="form-group">
              <label className="form-label">Grupo</label>
              <select className="form-select" value={form.grupo} onChange={e => set('grupo', e.target.value)}>
                <option value="">Selecione...</option>
                {GRUPOS.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Dias de validade</label>
              <input className="form-input" type="number" value={form.dias_validade} onChange={e => set('dias_validade', e.target.value)} placeholder="Ex: 3" />
            </div>

            <div className="form-group">
              <label className="form-label">Ingredientes</label>
              <textarea className="form-textarea" value={form.ingredientes} onChange={e => set('ingredientes', e.target.value)} placeholder="Lista de ingredientes..." />
            </div>

            <div className="form-group">
              <label className="form-label">Conservação</label>
              <input className="form-input" value={form.conservacao} onChange={e => set('conservacao', e.target.value)} placeholder="Ex: Manter refrigerado" />
            </div>

            <div style={{display:'flex', gap:10}}>
              <button className="btn btn-primary" onClick={handleSalvar} disabled={salvando}>
                {salvando ? 'Salvando...' : '✓ Salvar'}
              </button>
              <button className="btn btn-ghost" onClick={() => setDrawer(false)} style={{flex:'0 0 auto', width:'auto', padding:'14px 20px'}}>Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
