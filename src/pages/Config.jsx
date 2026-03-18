import { useState, useEffect } from 'react'
import { conectarImpressora, desconectarImpressora, impressoraConectada } from '../lib/bluetooth'
import { getOperadores, addOperador } from '../lib/db'
import { syncQueue, getQueue } from '../lib/offlineQueue'
import * as db from '../lib/db'

export default function Config({ operador, onLogout, onImpressoraChange }) {
  const [btStatus, setBtStatus]     = useState(impressoraConectada() ? 'conectada' : 'desconectada')
  const [operadores, setOperadores] = useState([])
  const [novoOp, setNovoOp]         = useState({ nome:'', pin:'', nivel:'operador' })
  const [filaQtd, setFilaQtd]       = useState(getQueue().length)
  const [syncMsg, setSyncMsg]       = useState('')

  useEffect(() => { getOperadores().then(setOperadores) }, [])

  async function conectar() {
    setBtStatus('conectando')
    const r = await conectarImpressora()
    const status = r.ok ? 'conectada' : 'desconectada'
    setBtStatus(status)
    onImpressoraChange?.(r.ok)
  }

  async function desconectar() {
    await desconectarImpressora()
    setBtStatus('desconectada')
    onImpressoraChange?.(false)
  }

  async function salvarOperador() {
    if (!novoOp.nome || !novoOp.pin) return
    await addOperador(novoOp)
    setOperadores(await getOperadores())
    setNovoOp({ nome:'', pin:'', nivel:'operador' })
  }

  async function sincronizar() {
    const qtd = await syncQueue(db)
    setFilaQtd(getQueue().length)
    setSyncMsg(qtd > 0 ? `✓ ${qtd} item(s) sincronizado(s)` : 'Nada para sincronizar')
    setTimeout(() => setSyncMsg(''), 3000)
  }

  return (
    <div style={{ maxWidth:480, margin:'0 auto', display:'flex', flexDirection:'column', gap:20 }}>
      <h2 style={{ margin:0, color:'#1A1208' }}>⚙️ Configurações</h2>

      {/* Impressora Bluetooth */}
      <section style={cardStyle}>
        <h3 style={h3Style}>🖨️ Impressora Bluetooth</h3>
        <p style={{ fontSize:12, color:'#999', margin:'0 0 12px' }}>WKDY-80D — use o Chrome no tablet</p>
        <div style={{ display:'flex', gap:8, alignItems:'center', marginBottom:12 }}>
          <div style={{ width:10, height:10, borderRadius:'50%',
            background: btStatus==='conectada' ? '#43A047' : btStatus==='conectando' ? '#FB8C00' : '#E53935' }} />
          <span style={{ fontSize:14, color:'#555', textTransform:'capitalize' }}>{btStatus}</span>
        </div>
        {btStatus !== 'conectada' ? (
          <button onClick={conectar} disabled={btStatus==='conectando'} style={btnLaranja}>
            {btStatus==='conectando' ? '🔍 Procurando...' : '🔗 Conectar Impressora'}
          </button>
        ) : (
          <button onClick={desconectar} style={{ ...btnLaranja, background:'#eee', color:'#555' }}>
            Desconectar
          </button>
        )}
      </section>

      {/* Fila offline */}
      <section style={cardStyle}>
        <h3 style={h3Style}>📶 Sincronização Offline</h3>
        <p style={{ fontSize:13, color:'#555', margin:'0 0 12px' }}>
          {filaQtd > 0 ? `${filaQtd} item(s) aguardando sincronização` : 'Tudo sincronizado ✓'}
        </p>
        {syncMsg && <p style={{ color:'#43A047', fontSize:13, margin:'0 0 8px' }}>{syncMsg}</p>}
        <button onClick={sincronizar} style={btnLaranja}>🔄 Sincronizar agora</button>
      </section>

      {/* Operadores */}
      <section style={cardStyle}>
        <h3 style={h3Style}>👤 Operadores</h3>
        <div style={{ display:'flex', flexDirection:'column', gap:8, marginBottom:12 }}>
          {operadores.map(op => (
            <div key={op.id} style={{ display:'flex', justifyContent:'space-between', padding:'8px 0', borderBottom:'1px solid #f0f0f0' }}>
              <span style={{ fontWeight:'bold' }}>{op.nome}</span>
              <span style={{ color:'#999', fontSize:12 }}>{op.nivel} · PIN: {'•'.repeat(op.pin?.length||4)}</span>
            </div>
          ))}
        </div>
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          <input placeholder="Nome" value={novoOp.nome} onChange={e => setNovoOp({...novoOp, nome:e.target.value})} style={inputStyle} />
          <input placeholder="PIN (4-6 dígitos)" type="password" inputMode="numeric" maxLength={6}
            value={novoOp.pin} onChange={e => setNovoOp({...novoOp, pin:e.target.value})} style={inputStyle} />
          <button onClick={salvarOperador} style={btnLaranja}>+ Adicionar Operador</button>
        </div>
      </section>

      {/* Logout */}
      <section style={cardStyle}>
        <h3 style={h3Style}>👤 Sessão</h3>
        <p style={{ fontSize:13, color:'#555', margin:'0 0 12px' }}>Logado como: <strong>{operador?.nome}</strong></p>
        <button onClick={onLogout} style={{ ...btnLaranja, background:'#eee', color:'#555' }}>Sair</button>
      </section>
    </div>
  )
}

const cardStyle  = { background:'#fff', borderRadius:8, padding:'14px 16px', boxShadow:'0 1px 4px rgba(0,0,0,0.08)' }
const h3Style    = { margin:'0 0 12px', fontSize:15, color:'#1A1208' }
const inputStyle = { padding:'10px 12px', borderRadius:8, border:'1px solid #ddd', fontSize:14, width:'100%', boxSizing:'border-box' }
const btnLaranja = { padding:'12px', borderRadius:8, border:'none', background:'#E67E00', color:'#fff', fontSize:14, fontWeight:'bold', cursor:'pointer', width:'100%' }
