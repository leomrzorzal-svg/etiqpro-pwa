import { useState } from 'react'
import { loginOperador } from '../lib/db'

export default function Login({ onLogin }) {
  const [nome, setNome] = useState('')
  const [pin, setPin]   = useState('')
  const [erro, setErro] = useState('')
  const [loading, setLoading] = useState(false)

  async function entrar(e) {
    e.preventDefault()
    setLoading(true)
    setErro('')
    const op = await loginOperador(nome.trim(), pin.trim())
    if (op) {
      localStorage.setItem('etiqpro_operador', JSON.stringify(op))
      onLogin(op)
    } else {
      setErro('Nome ou PIN incorreto')
    }
    setLoading(false)
  }

  return (
    <div style={{ minHeight:'100dvh', background:'#1A1208', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:24 }}>
      <div style={{ marginBottom:32 }}>
        <span style={{ fontSize:48, fontWeight:'bold', color:'#fff' }}>etiq</span>
        <span style={{ fontSize:48, fontWeight:'bold', color:'#E67E00' }}>PRO</span>
      </div>

      <form onSubmit={entrar} style={{ width:'100%', maxWidth:340, display:'flex', flexDirection:'column', gap:16 }}>
        <input
          placeholder="Seu nome"
          value={nome}
          onChange={e => setNome(e.target.value)}
          required
          style={inputStyle}
        />
        <input
          placeholder="PIN"
          type="password"
          inputMode="numeric"
          maxLength={6}
          value={pin}
          onChange={e => setPin(e.target.value)}
          required
          style={inputStyle}
        />
        {erro && <p style={{ color:'#EF5350', textAlign:'center', margin:0 }}>{erro}</p>}
        <button type="submit" disabled={loading} style={btnStyle}>
          {loading ? 'Entrando...' : 'Entrar'}
        </button>
      </form>
    </div>
  )
}

const inputStyle = {
  padding:'14px 16px', borderRadius:8, border:'1px solid #3D2A0A',
  background:'#241A0A', color:'#fff', fontSize:16, width:'100%',
  boxSizing:'border-box'
}
const btnStyle = {
  padding:'14px', borderRadius:8, border:'none',
  background:'#E67E00', color:'#fff', fontSize:16,
  fontWeight:'bold', cursor:'pointer'
}
