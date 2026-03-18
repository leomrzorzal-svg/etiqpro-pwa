import React, { useState, useEffect } from 'react'
import { useApp } from '../App'
import { getOperadores, salvarOperador } from '../lib/db'
import { conectarImpressora, impressoraConectada, nomeImpressora } from '../lib/bluetooth'

export default function PaginaConfig() {
  const { showToast, printer, setPrinter } = useApp()
  const [operadores, setOperadores] = useState([])
  const [drawer, setDrawer]   = useState(false)
  const [conectando, setConectando] = useState(false)
  const [form, setForm] = useState({ nome: '', pin: '' })
  const [salvando, setSalvando] = useState(false)

  useEffect(() => {
    getOperadores().then(setOperadores)
  }, [])

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

  async function handleSalvarOp() {
    if (!form.nome.trim()) return showToast('Nome é obrigatório', 'erro')
    setSalvando(true)
    try {
      await salvarOperador(form)
      showToast('✓ Operador salvo!', 'sucesso')
      setDrawer(false)
      setForm({ nome: '', pin: '' })
      const ops = await getOperadores()
      setOperadores(ops)
    } catch(err) {
      showToast('Erro: ' + err.message, 'erro')
    } finally { setSalvando(false) }
  }

  return (
    <div>
      <h2 style={{fontSize:18, fontWeight:800, marginBottom:16}}>Configurações</h2>

      {/* Impressora */}
      <div className="card" style={{marginBottom:16}}>
        <div className="card-title" style={{marginBottom:12}}>🖨️ Impressora Bluetooth</div>
        <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12}}>
          <div>
            <div style={{fontWeight:600}}>{nomeImpressora() || 'Nenhuma pareada'}</div>
            <div style={{fontSize:12, color: printer ? 'var(--verde)' : 'var(--vermelho)'}}>
              {printer ? '● Conectada' : '● Desconectada'}
            </div>
          </div>
          <button className="btn btn-outline btn-sm" onClick={handleConectar} disabled={conectando}>
            {conectando ? 'Conectando...' : (printer ? 'Reconectar' : 'Conectar')}
          </button>
        </div>
        <div style={{fontSize:12, color:'var(--cinza3)', background:'var(--cinza1)', padding:'8px 12px', borderRadius:8}}>
          ℹ️ Web Bluetooth funciona apenas no Chrome para Android. Certifique-se que o Bluetooth do dispositivo está ativado e a impressora está ligada.
        </div>
      </div>

      {/* Operadores */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">👤 Operadores</div>
          <button className="btn btn-primary btn-sm" onClick={() => { setForm({nome:'',pin:''}); setDrawer(true) }}>+ Novo</button>
        </div>
        {operadores.length === 0 && (
          <p style={{color:'var(--cinza3)', fontSize:13}}>Nenhum operador cadastrado</p>
        )}
        {operadores.map(op => (
          <div key={op.id} className="list-item">
            <div className="list-item-info">
              <h4>{op.nome}</h4>
              <p>PIN: {op.pin ? '••••' : 'Sem PIN'} · {op.nivel_acesso || 'Operador'}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Informações do sistema */}
      <div className="card" style={{marginTop:16}}>
        <div className="card-title" style={{marginBottom:10}}>ℹ️ Sobre o etiqPRO</div>
        <div style={{fontSize:13, color:'var(--cinza3)', lineHeight:1.7}}>
          <div>Versão: <strong>2.0.0 PWA</strong></div>
          <div>Banco: <strong>Supabase (nuvem)</strong></div>
          <div>Impressora: <strong>WKDY-80D ESC/POS</strong></div>
          <div>Etiqueta: <strong>10cm × 5cm</strong></div>
        </div>
      </div>

      {drawer && (
        <div className="overlay" onClick={() => setDrawer(false)}>
          <div className="drawer" onClick={e => e.stopPropagation()}>
            <div className="drawer-handle" />
            <h3 style={{fontWeight:800, marginBottom:16}}>Novo operador</h3>
            <div className="form-group">
              <label className="form-label">Nome *</label>
              <input className="form-input" value={form.nome} onChange={e => setForm(f=>({...f,nome:e.target.value}))} placeholder="Nome do operador" />
            </div>
            <div className="form-group">
              <label className="form-label">PIN (opcional)</label>
              <input className="form-input" type="number" value={form.pin} onChange={e => setForm(f=>({...f,pin:e.target.value}))} placeholder="Ex: 1234" maxLength={6} />
            </div>
            <div style={{display:'flex', gap:10}}>
              <button className="btn btn-primary" onClick={handleSalvarOp} disabled={salvando}>
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
