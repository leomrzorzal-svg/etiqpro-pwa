import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../App'
import { getProdutos, getOperadores, criarEtiqueta } from '../lib/db'
import { imprimirEtiqueta, impressoraConectada, conectarImpressora } from '../lib/bluetooth'
import { format, addDays } from 'date-fns'

export default function PaginaCriarEtiqueta() {
  const { showToast, setPrinter } = useApp()
  const navigate = useNavigate()

  const [produtos, setProdutos]   = useState([])
  const [operadores, setOperadores] = useState([])
  const [loading, setLoading]     = useState(true)
  const [salvando, setSalvando]   = useState(false)
  const [conectando, setConectando] = useState(false)

  const [form, setForm] = useState({
    produto_id: '',
    operador: '',
    dataAbertura: format(new Date(), 'dd/MM/yyyy'),
    dataValidade: '',
    ingredientes: '',
    conservacao: '',
    obs: ''
  })

  const [produtoSel, setProdutoSel] = useState(null)

  useEffect(() => {
    Promise.all([getProdutos(), getOperadores()]).then(([p, o]) => {
      setProdutos(p)
      setOperadores(o)
      setLoading(false)
    })
  }, [])

  function onProdutoChange(id) {
    const p = produtos.find(x => x.id === id)
    setProdutoSel(p || null)
    const validade = p?.dias_validade
      ? format(addDays(new Date(), p.dias_validade), 'dd/MM/yyyy')
      : ''
    setForm(f => ({
      ...f,
      produto_id: id,
      dataValidade: validade,
      ingredientes: p?.ingredientes || '',
      conservacao: p?.conservacao || ''
    }))
  }

  function set(campo, val) {
    setForm(f => ({ ...f, [campo]: val }))
  }

  async function handleConectar() {
    setConectando(true)
    const res = await conectarImpressora()
    setConectando(false)
    if (res.ok) {
      setPrinter(true)
      showToast(`✓ ${res.nome} conectada!`, 'sucesso')
    } else {
      showToast('Erro: ' + res.erro, 'erro')
    }
  }

  async function handleImprimir() {
    if (!form.produto_id) return showToast('Selecione um produto', 'erro')
    if (!form.operador)   return showToast('Informe o operador', 'erro')

    setSalvando(true)
    try {
      // Salvar no banco
      const etiq = await criarEtiqueta({
        produto_id:    form.produto_id,
        operador:      form.operador,
        data_abertura: form.dataAbertura,
        data_validade: form.dataValidade,
        ingredientes:  form.ingredientes,
        conservacao:   form.conservacao,
        obs:           form.obs
      })

      // Imprimir se conectada
      if (impressoraConectada()) {
        await imprimirEtiqueta({
          produto:       produtoSel?.nome || '',
          grupo:         produtoSel?.grupo || '',
          dataAbertura:  form.dataAbertura,
          dataValidade:  form.dataValidade,
          ingredientes:  form.ingredientes,
          conservacao:   form.conservacao,
          operador:      form.operador,
          numeroEtiqueta: etiq.numero
        })
        showToast('✓ Etiqueta impressa!', 'sucesso')
      } else {
        showToast('✓ Etiqueta salva (impressora não conectada)', '')
      }

      navigate('/')
    } catch (err) {
      showToast('Erro ao salvar: ' + err.message, 'erro')
    } finally {
      setSalvando(false)
    }
  }

  if (loading) return <div className="spinner" />

  const hoje = format(new Date(), 'dd/MM/yyyy HH:mm')

  return (
    <div>
      <h2 style={{fontSize:18, fontWeight:800, marginBottom:16}}>Nova Etiqueta</h2>

      {/* Preview etiqueta */}
      {produtoSel && (
        <div className="etiqueta-preview" style={{marginBottom:16}}>
          <div className="ep-logo">etiqPRO #{produtoSel?.numero || '—'}</div>
          <div className="ep-produto">{produtoSel?.nome}</div>
          <div className="ep-grupo">{produtoSel?.grupo}</div>
          <div className="ep-datas">
            <div className="ep-data-item">
              <label>ABERTURA</label>
              <span>{form.dataAbertura}</span>
            </div>
            <div className="ep-data-item">
              <label>VALIDADE</label>
              <span className="ep-validade-vence">{form.dataValidade || '—'}</span>
            </div>
          </div>
          {form.ingredientes && (
            <div className="ep-ingredientes">
              <strong>Ingredientes:</strong> {form.ingredientes.substring(0,100)}
            </div>
          )}
          <div className="ep-rodape">
            <span>{form.operador || 'Operador'}</span>
            <span>{hoje}</span>
          </div>
        </div>
      )}

      {/* Formulário */}
      <div className="card">
        <div className="form-group">
          <label className="form-label">Produto *</label>
          <select className="form-select" value={form.produto_id} onChange={e => onProdutoChange(e.target.value)}>
            <option value="">Selecione o produto...</option>
            {produtos.map(p => (
              <option key={p.id} value={p.id}>{p.nome} — {p.grupo}</option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">Operador *</label>
          {operadores.length > 0 ? (
            <select className="form-select" value={form.operador} onChange={e => set('operador', e.target.value)}>
              <option value="">Selecione...</option>
              {operadores.map(o => (
                <option key={o.id} value={o.nome}>{o.nome}</option>
              ))}
            </select>
          ) : (
            <input className="form-input" placeholder="Nome do operador" value={form.operador} onChange={e => set('operador', e.target.value)} />
          )}
        </div>

        <div style={{display:'flex', gap:12}}>
          <div className="form-group" style={{flex:1}}>
            <label className="form-label">Data abertura</label>
            <input className="form-input" value={form.dataAbertura} onChange={e => set('dataAbertura', e.target.value)} />
          </div>
          <div className="form-group" style={{flex:1}}>
            <label className="form-label">Data validade</label>
            <input className="form-input" value={form.dataValidade} onChange={e => set('dataValidade', e.target.value)} placeholder="dd/mm/aaaa" />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Ingredientes</label>
          <textarea className="form-textarea" value={form.ingredientes} onChange={e => set('ingredientes', e.target.value)} placeholder="Lista de ingredientes..." />
        </div>

        <div className="form-group">
          <label className="form-label">Conservação</label>
          <input className="form-input" value={form.conservacao} onChange={e => set('conservacao', e.target.value)} placeholder="Ex: Manter refrigerado" />
        </div>
      </div>

      {/* Ações */}
      <div style={{display:'flex', flexDirection:'column', gap:10}}>
        {!impressoraConectada() && (
          <button className="btn btn-outline" onClick={handleConectar} disabled={conectando}>
            🔵 {conectando ? 'Conectando...' : 'Conectar Impressora Bluetooth'}
          </button>
        )}
        <button className="btn btn-primary" onClick={handleImprimir} disabled={salvando}>
          {salvando ? 'Salvando...' : (impressoraConectada() ? '🖨️ Salvar e Imprimir' : '💾 Salvar Etiqueta')}
        </button>
      </div>
    </div>
  )
}
