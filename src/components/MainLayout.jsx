import { useState } from 'react'
import { useAuth } from '../App.jsx'
import CriarEtiqueta from '../pages/CriarEtiqueta.jsx'
import GestaoEtiquetas from '../pages/GestaoEtiquetas.jsx'
import Dashboard from '../pages/Dashboard.jsx'
import Produtos from '../pages/Produtos.jsx'
import Grupos from '../pages/Grupos.jsx'
import Relatorios from '../pages/Relatorios.jsx'
import Descartes from '../pages/Descartes.jsx'
import Configuracoes from '../pages/Configuracoes.jsx'
import PrintBar from './PrintBar.jsx'

const PAGES = [
  {id:'imprimir', label:'Criar Etiquetas', icon:'🖨️', role:'all'},
  {id:'baixas',   label:'Gestão de Etiquetas', icon:'🏷️', role:'all'},
  {id:'dashboard',label:'Dashboard', icon:'📊', role:'all'},
  {id:'produtos', label:'Produtos', icon:'📦', role:'admin'},
  {id:'grupos',   label:'Grupos', icon:'📁', role:'admin'},
  {id:'relatorios',label:'Relatórios', icon:'📋', role:'admin'},
  {id:'descartes',label:'Rel. Descartes', icon:'🗑️', role:'admin'},
  {id:'config',   label:'Configurações', icon:'⚙️', role:'admin'},
]
const COMPS = {imprimir:CriarEtiqueta, baixas:GestaoEtiquetas, dashboard:Dashboard, produtos:Produtos, grupos:Grupos, relatorios:Relatorios, descartes:Descartes, config:Configuracoes}
const TITLES = {
  imprimir:['Criar Etiquetas','Selecione um produto para imprimir'],
  baixas:['Gestão de Etiquetas','Gerencie as etiquetas em uso'],
  dashboard:['Dashboard','Visão geral do sistema'],
  produtos:['Produtos','Cadastro e gestão'],
  grupos:['Grupos','Grupos de produtos'],
  relatorios:['Relatórios','Análises de impressão'],
  descartes:['Rel. Descartes','Controle de perdas'],
  config:['Configurações','Usuários e senhas'],
}

export default function MainLayout() {
  const { user, doLogout } = useAuth()
  const [page, setPage] = useState('imprimir')
  const [sideOpen, setSide] = useState(false)
  const visible = PAGES.filter(p => p.role === 'all' || user.role === 'admin')
  const [title, sub] = TITLES[page] || ['','']
  const PageComp = COMPS[page] || (() => null)
  const nav = (id) => { setPage(id); setSide(false) }

  return (
    <div className="app-layout">
      <div className={`sidebar-overlay ${sideOpen?'open':''}`} onClick={()=>setSide(false)} />
      <aside className={`sidebar ${sideOpen?'open':''}`}>
        <div className="sidebar-logo">
          <span style={{fontSize:32}}>🏷️</span>
          <div><div className="logo-text">etiq<span>PRO</span></div><span className="logo-sub">Cozinha Industrial</span></div>
        </div>
        <div className="sidebar-user">
          <div className="user-name">👤 {user.nome}</div>
          <div className="user-role">{user.role==='admin'?'Administrador':'Operador'}</div>
        </div>
        <nav>
          {visible.map(p => (
            <div key={p.id} className={`nav-item ${page===p.id?'active':''}`} onClick={()=>nav(p.id)}>
              <span className="icon">{p.icon}</span>{p.label}
            </div>
          ))}
        </nav>
        <div className="sidebar-footer">
          <button className="btn-logout" onClick={doLogout}>🚪 Sair</button>
        </div>
      </aside>
      <div className="main-content">
        <div className="topbar">
          <div style={{display:'flex',alignItems:'center',gap:14}}>
            <button onClick={()=>setSide(s=>!s)} style={{display:'none',background:'none',border:'none',fontSize:24,cursor:'pointer',padding:'4px 8px'}} className="mob-menu">☰</button>
            <div><h2>{title}</h2><div className="sub">{sub}</div></div>
          </div>
          <PrintBar />
        </div>
        <div className="content-area"><PageComp /></div>
      </div>
      <style>{`@media(max-width:768px){.mob-menu{display:block!important}}`}</style>
    </div>
  )
}
