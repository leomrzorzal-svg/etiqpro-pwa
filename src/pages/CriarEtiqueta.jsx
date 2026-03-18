import { useState, useEffect } from 'react'
import { getProdutos, addEtiqueta } from '../lib/db'
import { imprimirEtiqueta, impressoraConectada } from '../lib/bluetooth'
import { addToQueue } from '../lib/offlineQueue'
import { addDays, format } from 'date-fns'

const CORES_GRUPO = {
  'Carnes':     '#E53935', 'Aves':       '#FB8C00', 'Peixes':    '#1E88E5',
  'Laticínios': '#8E24AA', 'Vegetais':   '#43A047', 'Massas':    '#F4511E',
  'Molhos':     '#00ACC1', 'Sobremesas': '#D81B60', 'Outros':    '#757575',
}

export default function CriarEtiqueta({ operador }) {
  const [produtos, setProdutos]       = useState([])
  const [produtoId, setProdutoId]     = useState('')
  const [operadorNome, setOperadorNome] = useState(operador?.nome || '')
  const [qtd, setQtd]                 = useState(1)
  const [status, setStatus]           = useState(null) // null | 'imprimindo' | 'ok' | 'erro'

  useEffect(() => { getProdutos().then(setProdutos) }, [])

  const produto = produtos.find(p => p.id === produtoId)

  const hoje = new Date()
  const dataAbertura = format(hoje, 'dd/MM/yyyy')
  const dataValidade = produto
    ? format(addDays(hoje, produto.dias_validade), 'dd/MM/yyyy')
    : '—'

  async function imprimir() {
    if (!produto) return
    setStatus('imprimindo')
    try {
      const numero = Date.now()
      const payload = {
        produto_id:     produto.id,
        operador:       operadorNome,
        data_abertura:  format(hoje, 'yyyy-MM-dd'),
        data_validade:  format(addDays(hoje, produto.dias_validade), 'yyyy-MM-dd'),
        quantidade:     qtd,
        status:         'ativa',
        numero,
      }

      // Salvar no banco (ou fila offline)
      if (navigator.onLine) {
        for (let i = 0; i < qtd; i++) await addEtiqueta({ ...payload, numero: numero + i })
      } else {
        for (let i = 0; i < qtd; i++) addToQueue({ type: 'addEtiqueta', payload: { ...payload, numero: numero + i } })
      }

      // Imprimir via Bluetooth se conectada
      if (impressoraConectada()) {
        for (let i = 0; i < qtd; i++) {
          await imprimirEtiqueta({
            produto:      produto.nome,
            grupo:        produto.grupo,
            operador:     operadorNome,
            abertura:     dataAbertura,
            validade:     dataValidade,
            ingredientes: produto.ingredientes,
            conservacao:  produto.conservacao,
            numero:       numero + i,
          })
        }
      }

      setStatus('ok')
      setTimeout(() => setStatus(null), 2500)
    } catch (e) {
      console.error(e)
      setStatus('erro')
      setTimeout(() => setStatus(null), 3000)
    }
  }

  return (
    <div style={{ maxWidth:480, margin:'0 auto', display:'flex', flexDirection:'column', gap:16 }}>
      <h2 style={{ margin:0, color:'#1A1208' }}>🏷️ Nova Etiqueta</h2>

      {/* Seleção de produto */}
      <select value={produtoId} onChange={e => setProdutoId(e.target.value)} style={selectStyle}>
        <option value="">Selecione o produto...</option>
        {produtos.map(p => (
          <option key={p.id} value={p.id}>{p.nome} ({p.grupo})</option>
        ))}
      </select>

      {/* Preview da etiqueta */}
      {produto && (
        <div style={{
          border:`2px solid ${CORES_GRUPO[produto.grupo] || '#E67E00'}`,
          borderRadius:8, overflow:'hidden', background:'#fff',
          boxShadow:'0 2px 8px rgba(0,0,0,0.1)'
        }}>
          {/* Barra topo laranja */}
          <div style={{ height:4, background:'#E67E00' }} />
          <div style={{ padding:'12px 14px', display:'flex', flexDirection:'column', gap:4 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <span style={{ fontSize:10, fontWeight:'bold', color:'#E67E00' }}>etiqPRO</span>
              <span style={{ fontSize:10, color:'#999' }}>#{Date.now().toString().slice(-6)}</span>
            </div>
            <div style={{ fontSize:18, fontWeight:'bold', color:'#1A1208' }}>{produto.nome}</div>
            <div style={{ fontSize:11, color: CORES_GRUPO[produto.grupo] || '#E67E00', fontWeight:'bold' }}>{produto.grupo}</div>
            <div style={{ display:'flex', gap:16, marginTop:4, background:'#f5f6fa', borderRadius:4, padding:'6px 8px' }}>
              <div>
                <div style={{ fontSize:9, fontWeight:'bold', color:'#999', textTransform:'uppercase' }}>Abertura</div>
                <div style={{ fontSize:14, fontWeight:'bold', color:'#1A1208' }}>{dataAbertura}</div>
              </div>
              <div>
                <div style={{ fontSize:9, fontWeight:'bold', color:'#999', textTransform:'uppercase' }}>Validade</div>
                <div style={{ fontSize:14, fontWeight:'bold', color:'#E53935' }}>{dataValidade}</div>
              </div>
            </div>
            {produto.ingredientes && (
              <div style={{ borderLeft:'3px solid #E67E00', paddingLeft:8, marginTop:4 }}>
                <div style={{ fontSize:9, fontWeight:'bold', color:'#E67E00' }}>INGREDIENTES</div>
                <div style={{ fontSize:10, color:'#555' }}>{produto.ingredientes}</div>
              </div>
            )}
            {produto.conservacao && (
              <div style={{ fontSize:10, color:'#555', marginTop:2 }}>🌡️ {produto.conservacao}</div>
            )}
            <div style={{ display:'flex', justifyContent:'space-between', marginTop:4, fontSize:9, color:'#999' }}>
              <span>👤 {operadorNome}</span>
              <span>{format(hoje, 'dd/MM HH:mm')}</span>
            </div>
          </div>
        </div>
      )}

      {/* Operador */}
      <input
        placeholder="Operador"
        value={operadorNome}
        onChange={e => setOperadorNome(e.target.value)}
        style={inputStyle}
      />

      {/* Quantidade */}
      <div style={{ display:'flex', alignItems:'center', gap:12 }}>
        <label style={{ fontWeight:'bold', color:'#555', flex:1 }}>Quantidade</label>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <button onClick={() => setQtd(q => Math.max(1, q-1))} style={btnQtdStyle}>−</button>
          <span style={{ fontSize:20, fontWeight:'bold', minWidth:32, textAlign:'center' }}>{qtd}</span>
          <button onClick={() => setQtd(q => Math.min(20, q+1))} style={btnQtdStyle}>+</button>
        </div>
      </div>

      {/* Botão imprimir */}
      <button
        onClick={imprimir}
        disabled={!produto || status === 'imprimindo'}
        style={{
          ...btnStyle,
          background: status === 'ok' ? '#43A047' : status === 'erro' ? '#E53935' : '#E67E00',
          opacity: !produto ? 0.5 : 1,
        }}>
        {status === 'imprimindo' ? '⏳ Imprimindo...'
         : status === 'ok'      ? '✓ Etiqueta salva!'
         : status === 'erro'    ? '✗ Erro — tente novamente'
         : impressoraConectada() ? `🖨️ Imprimir ${qtd > 1 ? `(${qtd})` : ''}` : `💾 Salvar ${qtd > 1 ? `(${qtd})` : ''}`}
      </button>

      {!navigator.onLine && (
        <p style={{ color:'#FB8C00', fontSize:12, textAlign:'center', margin:0 }}>
          ⚠️ Sem internet — etiqueta será salva offline e sincronizada depois
        </p>
      )}
    </div>
  )
}

const selectStyle = { padding:'12px 14px', borderRadius:8, border:'1px solid #ddd', fontSize:15, background:'#fff', width:'100%' }
const inputStyle  = { padding:'12px 14px', borderRadius:8, border:'1px solid #ddd', fontSize:15, width:'100%', boxSizing:'border-box' }
const btnStyle    = { padding:16, borderRadius:8, border:'none', color:'#fff', fontSize:16, fontWeight:'bold', cursor:'pointer', transition:'background 0.3s' }
const btnQtdStyle = { width:36, height:36, borderRadius:8, border:'1px solid #ddd', background:'#fff', fontSize:20, cursor:'pointer', fontWeight:'bold' }
