import { Link, useLocation } from 'react-router-dom'

const TABS = [
  { path: '/',          icon: '🏷️', label: 'Etiquetas' },
  { path: '/ativas',    icon: '📋', label: 'Ativas'    },
  { path: '/relatorio', icon: '📊', label: 'Relatório' },
  { path: '/produtos',  icon: '📦', label: 'Produtos'  },
  { path: '/config',    icon: '⚙️', label: 'Config'   },
]

export default function Layout({ children, operador, impressoraOk }) {
  const { pathname } = useLocation()

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100dvh', background:'#F5F5F5', fontFamily:'Arial, sans-serif' }}>
      {/* Header */}
      <header style={{ background:'#1A1208', padding:'10px 16px', display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0 }}>
        <span style={{ fontSize:20, fontWeight:'bold' }}>
          <span style={{ color:'#fff' }}>etiq</span>
          <span style={{ color:'#E67E00' }}>PRO</span>
        </span>
        <div style={{ display:'flex', gap:8, alignItems:'center' }}>
          {impressoraOk !== undefined && (
            <span style={{ fontSize:11, color: impressoraOk ? '#66BB6A' : '#EF5350', background:'#2a1e0a', padding:'2px 8px', borderRadius:12 }}>
              {impressoraOk ? '🖨️ Conectada' : '🖨️ Desconectada'}
            </span>
          )}
          {operador && (
            <span style={{ fontSize:11, color:'#aaa' }}>👤 {operador.nome}</span>
          )}
        </div>
      </header>

      {/* Conteúdo */}
      <main style={{ flex:1, overflowY:'auto', padding:'16px' }}>
        {children}
      </main>

      {/* Nav inferior */}
      <nav style={{ background:'#1A1208', display:'flex', borderTop:'2px solid #E67E00', flexShrink:0 }}>
        {TABS.map(tab => {
          const ativo = pathname === tab.path
          return (
            <Link key={tab.path} to={tab.path}
              style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', padding:'8px 4px',
                       textDecoration:'none', color: ativo ? '#E67E00' : '#888',
                       borderTop: ativo ? '2px solid #E67E00' : '2px solid transparent',
                       marginTop:-2, fontSize:10, gap:2 }}>
              <span style={{ fontSize:20 }}>{tab.icon}</span>
              {tab.label}
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
