import { useState, useEffect } from 'react'
import { bluetoothDisponivel, impressoraConectada, conectarImpressora, desconectarImpressora, nomeImpressora } from '../lib/print.js'
import { useToast } from '../App.jsx'

export default function PrintBar() {
  const toast = useToast()
  const [conectado, setConectado] = useState(false)
  const [nome, setNome] = useState('')
  const [loading, setLoading] = useState(false)
  const btOk = bluetoothDisponivel()

  useEffect(() => {
    const t = setInterval(() => {
      const c = impressoraConectada()
      setConectado(c)
      if (c) setNome(nomeImpressora() || 'Impressora')
    }, 2000)
    return () => clearInterval(t)
  }, [])

  const conectar = async () => {
    setLoading(true)
    try {
      const n = await conectarImpressora()
      setConectado(true); setNome(n)
      toast('✅ ' + n + ' conectada!', 'ok')
    } catch (e) {
      if (e.name !== 'NotFoundError') toast('Erro: ' + e.message, 'err')
    } finally { setLoading(false) }
  }

  const desconectar = async () => {
    await desconectarImpressora()
    setConectado(false); setNome('')
    toast('Impressora desconectada', 'info')
  }

  if (!btOk) return <div title="Use Chrome Android" style={{fontSize:18}}>🖨️</div>

  return (
    <div style={{display:'flex', alignItems:'center', gap:8}}>
      <div style={{width:10,height:10,borderRadius:'50%',background:conectado?'#2e7d32':'#ccc',flexShrink:0}} />
      {conectado ? (
        <>
          <span style={{fontSize:12,fontWeight:700,color:'#2e7d32',maxWidth:120,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{nome}</span>
          <button className="btn btn-sm" style={{background:'#ffebee',color:'#e53935',border:'none'}} onClick={desconectar}>Desconectar</button>
        </>
      ) : (
        <button className="btn btn-bt btn-sm" onClick={conectar} disabled={loading}>
          {loading ? '⏳ Conectando...' : '🔵 Conectar Impressora'}
        </button>
      )}
    </div>
  )
}
