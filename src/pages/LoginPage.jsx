import { useState } from 'react'
import { login } from '../lib/db.js'
import { useAuth, useToast } from '../App.jsx'

export default function LoginPage() {
  const { doLogin } = useAuth()
  const toast = useToast()
  const [user, setUser] = useState('')
  const [pass, setPass] = useState('')
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')

  const handleLogin = async (e) => {
    e.preventDefault(); setErr(''); setLoading(true)
    try {
      const found = await login(user.trim(), pass.trim())
      if (!found) { setErr('Usuário ou senha incorretos.'); return }
      toast('Bem-vindo, ' + found.nome + '!', 'ok')
      doLogin(found)
    } catch { setErr('Erro de conexão. Verifique sua internet.') }
    finally { setLoading(false) }
  }

  const inp = {width:'100%',padding:'13px 16px',border:'2px solid #e0e3ea',borderRadius:12,fontSize:15,marginBottom:12,outline:'none',fontFamily:'inherit',background:'#fafafa',display:'block'}

  return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',minHeight:'100vh',background:'linear-gradient(135deg,#7a3200 0%,#c46c00 40%,#e67e00 100%)'}}>
      <div style={{background:'#fff',borderRadius:24,padding:'48px 40px',width:'100%',maxWidth:400,boxShadow:'0 24px 80px rgba(0,0,0,.3)',textAlign:'center'}}>
        <div style={{width:80,height:80,background:'linear-gradient(135deg,#e67e00,#f59500)',borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 20px',fontSize:36}}>🏷️</div>
        <h1 style={{color:'#e67e00',fontSize:28,fontWeight:900,marginBottom:4}}>etiq<span style={{color:'#1a1a2e'}}>PRO</span></h1>
        <p style={{color:'#6b7280',fontSize:13,marginBottom:28}}>Gestão de Etiquetas para Cozinha Industrial</p>
        <form onSubmit={handleLogin}>
          <input value={user} onChange={e=>setUser(e.target.value)} placeholder="Usuário" required style={inp} />
          <input type="password" value={pass} onChange={e=>setPass(e.target.value)} placeholder="Senha" required style={{...inp,marginBottom:16}} />
          {err && <div style={{color:'#e53935',fontSize:13,marginBottom:14,background:'#ffebee',padding:10,borderRadius:8}}>{err}</div>}
          <button type="submit" disabled={loading} style={{width:'100%',padding:15,background:'linear-gradient(135deg,#e67e00,#f59500)',color:'#fff',border:'none',borderRadius:12,fontSize:16,fontWeight:700,cursor:'pointer',fontFamily:'inherit',opacity:loading?.7:1}}>
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
        <p style={{color:'#aaa',fontSize:11,marginTop:20}}>etiqPRO v2.0 · PWA + Supabase</p>
      </div>
    </div>
  )
}
