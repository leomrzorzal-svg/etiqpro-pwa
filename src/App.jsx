import React, { useState, createContext, useContext, useEffect, useRef } from 'react'
import { supabase } from './lib/supabase'
import { btSupported, connectPrinter, printLabel, printLabelsCpcl, testPrint, simplePrintTest, printViaRawBT, testViaRawBT, calibratePrint } from './lib/bluetooth'

export const AppCtx = createContext({})
export const useApp = () => useContext(AppCtx)

// ── Usuários padrão ─────────────────────────────────────────────────────────
const USUARIOS_DEFAULT = [
  { id:1, nome:'Administrador', user:'admin', senha:'admin123', role:'admin' },
  { id:2, nome:'Operador Padrão', user:'op', senha:'op123', role:'operador' }
]

const GRUPOS_DEFAULT = [
  { id:1, nome:'Carnes',           cor:'#e53935' },
  { id:2, nome:'Molhos e Caldos',  cor:'#f4a11d' },
  { id:3, nome:'Cereais e Massas', cor:'#1a6b3c' },
  { id:4, nome:'Laticínios',       cor:'#1976d2' },
  { id:5, nome:'Hortifruti',       cor:'#7b1fa2' },
]

const PRODS_DEFAULT = [
  { id:1,  nome:'Frango Grelhado',   conserv:'Manter refrigerado 0-5C', grp:1, vDias:3, ingr:'Frango, azeite, alho, sal, pimenta', obs:'Manter refrigerado 0-4C', ativo:true },
  { id:2,  nome:'Molho Bechamel',    conserv:'Manter refrigerado 0-5C', grp:2, vDias:2, ingr:'Leite, manteiga, farinha de trigo, sal, noz-moscada', obs:'', ativo:true },
  { id:3,  nome:'Arroz Cozido',      conserv:'Temperatura Ambiente',    grp:3, vDias:2, ingr:'Arroz, água, sal, óleo', obs:'', ativo:true },
  { id:4,  nome:'Caldo de Legumes',  conserv:'',                        grp:2, vDias:4, ingr:'Cenoura, cebola, salsão, alho, sal', obs:'Congelar se não usar em 24h', ativo:true },
  { id:5,  nome:'Filé Mignon',       conserv:'Manter refrigerado 0-5C', grp:1, vDias:2, ingr:'Filé mignon, sal, pimenta, azeite', obs:'', ativo:true },
  { id:6,  nome:'Feijão Cozido',     conserv:'Temperatura Ambiente',    grp:3, vDias:2, ingr:'Feijão, água, sal, alho, louro', obs:'', ativo:true },
  { id:7,  nome:'Creme de Leite',    conserv:'Manter refrigerado 0-5C', grp:4, vDias:3, ingr:'Creme de leite, sal', obs:'', ativo:true },
  { id:8,  nome:'Salada de Frutas',  conserv:'Manter refrigerado 0-5C', grp:5, vDias:1, ingr:'Mamão, banana, maçã, uva, laranja', obs:'Não congelar', ativo:true },
  { id:9,  nome:'Molho Pesto',       conserv:'Manter refrigerado 0-5C', grp:2, vDias:3, ingr:'Manjericão, azeite, pinhão, alho, parmesão, sal', obs:'', ativo:true },
  { id:10, nome:'Peito de Peru',     conserv:'Manter refrigerado 0-5C', grp:1, vDias:3, ingr:'Peito de peru, sal, pimenta, ervas', obs:'', ativo:true },
  { id:11, nome:'Lasanha Bolonhesa', conserv:'Manter refrigerado 0-5C', grp:3, vDias:2, ingr:'Massa, carne moída, tomate, queijo, bechamel', obs:'', ativo:true },
  { id:12, nome:'Iogurte Natural',   conserv:'Manter refrigerado 0-5C', grp:4, vDias:5, ingr:'Leite integral, fermento láctico', obs:'', ativo:true },
]

const DATA_ID = 'main'

const EMPTY_DATA = {
  prods: PRODS_DEFAULT,
  grps: GRUPOS_DEFAULT,
  hist: [],
  counter: 0,
  usuarios: USUARIOS_DEFAULT,
  _ts: 0
}

// ── Helpers ──────────────────────────────────────────────────────────────────
export function fd(s) { if (!s) return '--/--/----'; const p = s.split('-'); return `${p[2]}/${p[1]}/${p[0]}` }
export function td() { return new Date().toISOString().split('T')[0] }
export function du(s) { if (!s) return 99; return Math.ceil((new Date(s+'T23:59:59') - new Date()) / 86400000) }
export function calcVal(dias) { const v = new Date(); v.setDate(v.getDate() + dias); return v.toISOString().split('T')[0] }
export function nextNum(counter) { return 'ETQ-' + String(counter).padStart(5, '0') }
export function formatPesoKg(v) { if (!v && v !== 0) return ''; const n = parseFloat(String(v).replace(',','.')); if (isNaN(n)) return ''; return n.toFixed(3) + ' KG' }

// ── Limpeza automática: remove etiquetas de USO baixadas há mais de 7 dias ──
export function limparBaixadasAntigas(hist) {
  const limite = 7 * 24 * 60 * 60 * 1000
  const agora = Date.now()
  return hist.filter(h => {
    if (h.baixada && h.tipoBaixa === 'uso' && h.baixadaEm) {
      return (agora - new Date(h.baixadaEm).getTime()) < limite
    }
    return true
  })
}

// ── Migração de dados antigos ──────────────────────────────────────────────
function migrateData(saved) {
  if (!saved) return null
  const hist = (saved.hist || []).map(h => {
    const m = { ...h }
    if (!m.prod && m.prodNome) m.prod = m.prodNome
    if (!m.manip && m.aber) m.manip = m.aber
    if (!m.at && m.printedAt) m.at = m.printedAt
    if (!m.grpNome && m.grp && typeof m.grp === 'number' && saved.grps) {
      const g = saved.grps.find(x => x.id == m.grp)
      if (g) { m.grpNome = g.nome; m.grpCor = g.cor }
    }
    if (m.baixadaEm === null || m.baixadaEm === undefined) m.baixadaEm = null
    if (!m.baixadaPor) m.baixadaPor = null
    if (!m.descMotivo) m.descMotivo = null
    if (!m.descPeso) m.descPeso = null
    return m
  })
  return { ...saved, hist }
}

function loadLocalData() {
  try {
    const raw = localStorage.getItem('etiqpro_data')
    if (raw) {
      const saved = JSON.parse(raw)
      const migrated = migrateData(saved)
      if (migrated) return { ...EMPTY_DATA, ...migrated }
    }
  } catch {}
  return { ...EMPTY_DATA }
}

function saveLocalData(d) {
  try { localStorage.setItem('etiqpro_data', JSON.stringify(d)) } catch {}
}

async function loadSupabaseData() {
  try {
    const { data, error } = await supabase
      .from('app_data')
      .select('payload')
      .eq('id', DATA_ID)
      .single()
    if (error) return null
    return data?.payload || null
  } catch {
    return null
  }
}

async function saveSupabaseData(payload) {
  try {
    const { error } = await supabase
      .from('app_data')
      .upsert({ id: DATA_ID, payload, updated_at: new Date().toISOString() })
    return !error
  } catch {
    return false
  }
}

// ── Status sync ──────────────────────────────────────────────────────────────
const SYNC_INFO = {
  loading:    { icon:'⏳', label:'Conectando...', color:'#9e9e9e' },
  online:     { icon:'🟢', label:'Online',        color:'#2e7d32' },
  syncing:    { icon:'🔄', label:'Salvando...',   color:'#1565c0' },
  offline:    { icon:'🔴', label:'Offline',       color:'#c62828' },
}

// Pages
import PgImprimir    from './pages/PgImprimir'
import PgEtiquetas   from './pages/PgEtiquetas'
import PgProdutos    from './pages/PgProdutos'
import PgGrupos      from './pages/PgGrupos'
import PgHistorico   from './pages/PgHistorico'
import PgRelatorios  from './pages/PgRelatorios'
import PgDescartes   from './pages/PgDescartes'
import PgConfig      from './pages/PgConfig'
import PgDashboard   from './pages/PgDashboard'

const NAV_ADMIN = [
  { id:'imprimir',   label:'Criar Etiquetas',    icon:'🏷️',  sub:'Selecione um produto' },
  { id:'etiquetas',  label:'Gestão de Etiquetas', icon:'✅',  sub:'Gerencie as etiquetas em uso' },
  { id:'dashboard',  label:'Dashboard',           icon:'📊',  sub:'Visão geral' },
  { id:'produtos',   label:'Produtos',            icon:'📦',  sub:'Cadastro e gestão' },
  { id:'grupos',     label:'Grupos',              icon:'🗂️', sub:'Grupos de produtos' },
  { id:'historico',  label:'Histórico',           icon:'📋',  sub:'Registro de impressões' },
  { id:'relatorios', label:'Relatórios',          icon:'📈',  sub:'Análises de impressão' },
  { id:'descartes',  label:'Rel. Descartes',      icon:'🗑️', sub:'Controle de perdas' },
  { id:'config',     label:'Configurações',       icon:'⚙️',  sub:'Usuários e senhas' },
]

const NAV_OP = [
  { id:'imprimir',  label:'Criar Etiquetas',    icon:'🏷️', sub:'Selecione um produto' },
  { id:'etiquetas', label:'Gestão de Etiquetas', icon:'✅', sub:'Gerencie as etiquetas em uso' },
]

export default function App() {
  const [user, setUser] = useState(null)
  const [data, setData] = useState(loadLocalData)
  const [toast, setToast] = useState(null)
  const [page, setPage] = useState('imprimir')
  const [mobOpen, setMobOpen] = useState(false)
  const [sync, setSync] = useState('loading')
  const localTsRef = useRef(null)
  const [btStatus, setBtStatus] = useState('disconnected') // disconnected | connecting | connected | error
  const btDeviceRef = useRef(null)
  const btCharRef = useRef(null)

  async function connectBT() {
    if (!btSupported()) return showToast('Bluetooth não suportado neste navegador. Use Chrome.', 'erro')
    setBtStatus('connecting')
    try {
      const { device, char } = await connectPrinter()
      btDeviceRef.current = device
      btCharRef.current = char
      device.addEventListener('gattserverdisconnected', () => {
        btDeviceRef.current = null; btCharRef.current = null; setBtStatus('disconnected')
      })
      setBtStatus('connected')
      const props = char.properties
      const modo = props.writeWithoutResponse ? 'writeWithoutResponse' : props.write ? 'write' : '?'
      const uuidShort = char.uuid.substring(0, 8)
      showToast(`✓ ${device.name} | char: ${uuidShort} | ${modo}`, 'ok', 6000)
    } catch (e) {
      setBtStatus('error')
      if (e.name !== 'NotFoundError') showToast('Erro ao conectar: ' + e.message, 'erro')
      else setBtStatus('disconnected')
    }
  }

  function disconnectBT() {
    btDeviceRef.current?.gatt?.disconnect()
    btDeviceRef.current = null; btCharRef.current = null; setBtStatus('disconnected')
    showToast('Impressora desconectada', '')
  }

  async function printBT(labels) {
    if (!btCharRef.current) return showToast('Impressora não conectada', 'erro')
    const lista = Array.isArray(labels) ? labels : [labels]
    try {
      for (let i = 0; i < lista.length; i++) {
        await printLabelsCpcl(btCharRef.current, lista[i], 1)
        // Aguarda impressora terminar antes de enviar próxima — evita sobrescrever buffer e gerar cópias com mesmo número
        if (i < lista.length - 1) {
          await new Promise(r => setTimeout(r, 3500))
        }
      }
      showToast(`✓ ${lista.length > 1 ? lista.length + ' etiquetas impressas' : 'Impresso'} via Bluetooth!`, 'ok')
    } catch (e) {
      setBtStatus('error')
      showToast('Erro ao imprimir: ' + e.message, 'erro')
    }
  }

  async function testPrintBT() {
    if (!btCharRef.current) return showToast('Impressora não conectada', 'erro')
    try {
      await testPrint(btCharRef.current)
      showToast('✓ Impressão de teste enviada!', 'ok')
    } catch (e) {
      setBtStatus('error')
      showToast('Erro ao imprimir teste: ' + e.message, 'erro')
    }
  }

  async function simpleTestPrintBT() {
    if (!btCharRef.current) return showToast('Impressora não conectada', 'erro')
    try {
      await simplePrintTest(btCharRef.current)
      showToast('✓ Teste simples enviado!', 'ok')
    } catch (e) {
      setBtStatus('error')
      showToast('Erro: ' + e.message, 'erro')
    }
  }

  function doPrintRawBT(h) {
    try {
      const n = Array.isArray(h) ? h.length : 1
      printViaRawBT(h)
      showToast(
        n > 1 ? `✓ Imprimindo ${n} cópias... aguarde` : '✓ Enviado para RawBT!',
        'ok',
        n * 4000
      )
    } catch (e) {
      showToast('Erro RawBT: ' + e.message, 'erro')
    }
  }

  function doTestRawBT() {
    try {
      testViaRawBT()
      showToast('✓ Teste enviado para RawBT!', 'ok')
    } catch (e) {
      showToast('Erro RawBT: ' + e.message, 'erro')
    }
  }

  function doCalibratePrint() {
    try {
      calibratePrint()
      showToast('✓ Calibração enviada — veja qual número inicia na 2ª etiqueta', 'ok', 6000)
    } catch (e) {
      showToast('Erro RawBT: ' + e.message, 'erro')
    }
  }

  // ── Initial load from Supabase ─────────────────────────────────────────────
  useEffect(() => {
    async function init() {
      const remote = await loadSupabaseData()
      const local = loadLocalData()
      const remoteTs = remote?._ts || 0
      const localTs  = local._ts  || 0

      function mergeWithDefaults(d) {
        const migrated = migrateData(d) || d
        return {
          ...EMPTY_DATA,
          ...migrated,
          usuarios: migrated.usuarios?.length ? migrated.usuarios : EMPTY_DATA.usuarios,
          prods:    migrated.prods?.length    ? migrated.prods    : EMPTY_DATA.prods,
          grps:     migrated.grps?.length     ? migrated.grps     : EMPTY_DATA.grps,
        }
      }

      if (remote && remoteTs >= localTs) {
        const merged = mergeWithDefaults(remote)
        saveLocalData(merged)
        setData(merged)
        localTsRef.current = merged._ts || 0
        if (!remote.usuarios?.length) await saveSupabaseData(merged)
      } else {
        const merged = mergeWithDefaults(local)
        localTsRef.current = merged._ts || 0
        await saveSupabaseData(merged)
        setData(merged)
      }
      setSync('online')
    }
    init()
  }, [])

  // ── Recarrega do Supabase ao voltar para a aba ─────────────────────────────
  useEffect(() => {
    async function onVisible() {
      if (document.visibilityState !== 'visible') return
      const remote = await loadSupabaseData()
      if (!remote) return
      const remoteTs = remote._ts || 0
      const localTs  = localTsRef.current || 0
      if (remoteTs > localTs) {
        const migrated = migrateData(remote) || remote
        const merged = { ...EMPTY_DATA, ...migrated,
          usuarios: migrated.usuarios?.length ? migrated.usuarios : EMPTY_DATA.usuarios,
          prods:    migrated.prods?.length    ? migrated.prods    : EMPTY_DATA.prods,
          grps:     migrated.grps?.length     ? migrated.grps     : EMPTY_DATA.grps,
        }
        saveLocalData(merged)
        setData(merged)
        localTsRef.current = merged._ts || 0
      }
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [])

  // ── Realtime subscription ──────────────────────────────────────────────────
  useEffect(() => {
    const channel = supabase
      .channel('app_data_changes')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'app_data',
        filter: `id=eq.${DATA_ID}`
      }, (payload) => {
        const remote = payload.new?.payload
        if (!remote) return
        // Skip if this is our own update
        if (remote._ts && remote._ts === localTsRef.current) return
        // Apply remote update
        const migrated = migrateData(remote) || remote
        const merged = { ...EMPTY_DATA, ...migrated }
        saveLocalData(merged)
        setData(merged)
        localTsRef.current = merged._ts || 0
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') setSync('online')
        else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') setSync('offline')
      })

    return () => { supabase.removeChannel(channel) }
  }, [])

  // ── updateData ─────────────────────────────────────────────────────────────
  function updateData(fn) {
    setData(prev => {
      const ts = Date.now()
      const next = { ...fn(prev), _ts: ts }
      localTsRef.current = ts
      // 1. Salva local de forma síncrona (sempre funciona)
      saveLocalData(next)
      // 2. Salva no Supabase fora do ciclo de render
      queueMicrotask(() => {
        setSync('syncing')
        saveSupabaseData(next).then(ok => {
          setSync(ok ? 'online' : 'offline')
          if (!ok) {
            // Tenta novamente após 4 segundos se falhar
            setTimeout(() => {
              saveSupabaseData(next).then(ok2 => setSync(ok2 ? 'online' : 'offline'))
            }, 4000)
          }
        })
      })
      return next
    })
  }

  function showToast(msg, tipo = '', ms = 2500) {
    setToast({ msg, tipo })
    setTimeout(() => setToast(null), ms)
  }

  function doLogin(u, p) {
    const found = data.usuarios.find(x => x.user === u && x.senha === p)
    if (!found) return false
    setUser(found)
    updateData(d => ({ ...d, hist: limparBaixadasAntigas(d.hist) }))
    setPage(found.role === 'admin' ? 'dashboard' : 'imprimir')
    return true
  }

  function doLogout() { setUser(null); setPage('imprimir') }

  function navigate(p) {
    setPage(p)
    setMobOpen(false)
    if (p === 'etiquetas') {
      updateData(d => ({ ...d, hist: limparBaixadasAntigas(d.hist) }))
    }
  }

  const si = SYNC_INFO[sync] || SYNC_INFO.loading

  if (!user) return <LoginScreen onLogin={doLogin} syncInfo={si} />

  const nav = user.role === 'admin' ? NAV_ADMIN : NAV_OP
  const pageInfo = nav.find(n => n.id === page) || nav[0]

  const ctx = { user, data, updateData, showToast, setPage: navigate, btStatus, connectBT, disconnectBT, printBT, testPrintBT, simpleTestPrintBT, doPrintRawBT, doTestRawBT, doCalibratePrint, btDeviceRef }

  const pageMap = {
    imprimir:   <PgImprimir />,
    etiquetas:  <PgEtiquetas />,
    dashboard:  <PgDashboard />,
    produtos:   <PgProdutos />,
    grupos:     <PgGrupos />,
    historico:  <PgHistorico />,
    relatorios: <PgRelatorios />,
    descartes:  <PgDescartes />,
    config:     <PgConfig />,
  }

  return (
    <AppCtx.Provider value={ctx}>
      <div style={{display:'flex', height:'100vh', overflow:'hidden'}}>
        {/* Mobile overlay */}
        {mobOpen && (
          <div onClick={() => setMobOpen(false)} style={{
            position:'fixed', inset:0, background:'rgba(0,0,0,.5)', zIndex:150, display:'none'
          }} className="mob-overlay-el" />
        )}

        {/* Sidebar */}
        <aside style={{
          width:148, background:'linear-gradient(180deg,#a84e00 0%,#c46c00 100%)',
          color:'#fff', display:'flex', flexDirection:'column', flexShrink:0,
          position:'relative', zIndex:100
        }}>
          {/* Logo */}
          <div style={{padding:'10px 8px', borderBottom:'1px solid rgba(255,255,255,.12)', display:'flex', alignItems:'center', gap:6}}>
            <div style={{width:28, height:28, borderRadius:'50%', border:'2px solid #e67e00', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0}}>
              <span style={{fontWeight:900, fontSize:13, color:'#e67e00', lineHeight:1}}>E</span>
            </div>
            <div>
              <div style={{fontWeight:900, fontSize:14, letterSpacing:-0.5, lineHeight:1}}>
                etiq<span style={{color:'#e67e00'}}>PRO</span>
                <span style={{display:'inline-block', width:3, height:3, background:'#e67e00', borderRadius:'50%', marginLeft:1, marginBottom:2}}></span>
              </div>
              <div style={{fontSize:9, opacity:.45, marginTop:1}}>v2.2 · Cozinha</div>
            </div>
          </div>
          {/* Usuário */}
          <div style={{padding:'6px 8px', borderBottom:'1px solid rgba(255,255,255,.08)', background:'rgba(0,0,0,.2)'}}>
            <div style={{fontWeight:700, fontSize:11, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>{user.nome}</div>
            <span style={{fontSize:9, background:'rgba(255,255,255,.15)', padding:'2px 6px', borderRadius:10, marginTop:3, display:'inline-block'}}>
              {user.role === 'admin' ? 'Admin' : 'Operador'}
            </span>
          </div>
          {/* Nav */}
          <nav style={{flex:1, padding:'8px 0', overflowY:'auto'}}>
            {user.role === 'admin' && (
              <div style={{padding:'5px 8px 2px', fontSize:8, fontWeight:700, opacity:.6, textTransform:'uppercase', letterSpacing:1, color:'#e67e00'}}>Menu</div>
            )}
            {nav.map(n => (
              <div key={n.id}
                onClick={() => navigate(n.id)}
                style={{
                  display:'flex', alignItems:'center', gap:6, padding:'10px 8px',
                  cursor:'pointer', fontSize:11, borderLeft:`3px solid ${page === n.id ? '#e67e00' : 'transparent'}`,
                  background: page === n.id ? 'rgba(230,126,0,.22)' : 'transparent',
                  fontWeight: page === n.id ? 700 : 400, color: page === n.id ? '#ffb347' : '#fff',
                  transition:'all .2s', lineHeight:1.2
                }}
              >
                <span style={{fontSize:14, width:17, textAlign:'center', flexShrink:0}}>{n.icon}</span>
                <span style={{overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>{n.label}</span>
              </div>
            ))}
          </nav>
          {/* Logout */}
          <div style={{padding:'8px', borderTop:'1px solid rgba(255,255,255,.1)'}}>
            <button onClick={doLogout} style={{
              width:'100%', padding:'8px 4px', background:'rgba(255,255,255,.1)',
              color:'#fff', border:'none', borderRadius:7, cursor:'pointer', fontSize:11,
              fontFamily:'inherit'
            }}>
              Sair
            </button>
          </div>
        </aside>

        {/* Main */}
        <div style={{flex:1, display:'flex', flexDirection:'column', overflow:'hidden', background:'#f0f2f5'}}>
          {/* Topbar */}
          <div style={{
            background:'#fff', padding:'16px 30px', borderBottom:'1px solid #e0e3ea',
            display:'flex', alignItems:'center', justifyContent:'space-between',
            boxShadow:'0 2px 10px rgba(0,0,0,.06)', flexShrink:0, position:'sticky', top:0, zIndex:50
          }}>
            <div>
              <div style={{fontWeight:800, fontSize:21}}>{pageInfo.label}</div>
              <div style={{fontSize:13, color:'#6b7280', marginTop:2}}>{pageInfo.sub}</div>
            </div>
            <div style={{display:'flex', alignItems:'center', gap:10}}>
              {/* Impressora BT */}
              {btStatus === 'connected' ? (
                <button
                  onClick={() => { disconnectBT(); setTimeout(() => connectBT(), 300) }}
                  style={{
                    display:'flex', alignItems:'center', gap:6, padding:'6px 14px',
                    borderRadius:20, background:'#e8f5e9', border:'1px solid #a5d6a7',
                    fontSize:12, fontWeight:700, color:'#2e7d32', cursor:'pointer', fontFamily:'inherit'
                  }}
                >
                  <span>🖨️</span>
                  <span>{btDeviceRef.current?.name || 'Impressora'}</span>
                  <span style={{color:'#1565c0', marginLeft:4}}>🔄 Trocar</span>
                </button>
              ) : (
                <button
                  onClick={connectBT}
                  style={{
                    display:'flex', alignItems:'center', gap:6, padding:'6px 14px',
                    borderRadius:20, background:'#e3f2fd', border:'1px solid #90caf9',
                    fontSize:12, fontWeight:700, color:'#1565c0', cursor:'pointer', fontFamily:'inherit'
                  }}
                >
                  <span>🖨️</span>
                  <span>Conectar Impressora</span>
                </button>
              )}
              {/* Sync badge */}
              <div style={{
                display:'flex', alignItems:'center', gap:6, padding:'6px 14px',
                borderRadius:20, background:'#f5f6fa', border:'1px solid #e0e3ea',
                fontSize:12, fontWeight:600, color: si.color
              }}>
                <span>{si.icon}</span>
                <span>{si.label}</span>
              </div>
            </div>
          </div>

          {/* Content */}
          <div style={{flex:1, overflowY:'auto', padding:30}}>
            {pageMap[page] || pageMap['imprimir']}
          </div>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div style={{
          position:'fixed', bottom:24, left:'50%', transform:'translateX(-50%)',
          background: toast.tipo==='erro' ? '#c62828' : toast.tipo==='ok' ? '#2e7d32' : '#1a1208',
          color:'#fff', padding:'12px 24px', borderRadius:24, fontSize:14, fontWeight:500,
          zIndex:9999, animation:'fadeIn .2s ease', whiteSpace:'nowrap',
          boxShadow:'0 4px 20px rgba(0,0,0,.3)'
        }}>
          {toast.msg}
        </div>
      )}
      <style>{`@keyframes fadeIn{from{opacity:0;transform:translateX(-50%) translateY(10px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}`}</style>
    </AppCtx.Provider>
  )
}

// ── Tela de Login ──────────────────────────────────────────────────────────
function LoginScreen({ onLogin, syncInfo }) {
  const [u, setU] = useState(() => {
    try { return localStorage.getItem('etiqpro_remember_user') || '' } catch { return '' }
  })
  const [p, setP] = useState(() => {
    try { return localStorage.getItem('etiqpro_remember_pass') || '' } catch { return '' }
  })
  const [lembrar, setLembrar] = useState(() => {
    try { return !!localStorage.getItem('etiqpro_remember_user') } catch { return false }
  })
  const [err, setErr] = useState(false)

  function handleLogin() {
    if (!onLogin(u, p)) {
      setErr(true)
    } else {
      setErr(false)
      if (lembrar) {
        try {
          localStorage.setItem('etiqpro_remember_user', u)
          localStorage.setItem('etiqpro_remember_pass', p)
        } catch {}
      } else {
        try {
          localStorage.removeItem('etiqpro_remember_user')
          localStorage.removeItem('etiqpro_remember_pass')
        } catch {}
      }
    }
  }

  return (
    <div style={{
      display:'flex', alignItems:'center', justifyContent:'center', minHeight:'100vh',
      background:'linear-gradient(135deg,#7a3200 0%,#c46c00 40%,#e67e00 100%)'
    }}>
      <div style={{
        background:'#fff', borderRadius:24, padding:'52px 44px', width:400,
        boxShadow:'0 24px 80px rgba(0,0,0,.3)', textAlign:'center'
      }}>
        <div style={{display:'flex', alignItems:'center', gap:12, justifyContent:'center', marginBottom:8}}>
          <div style={{width:54, height:54, borderRadius:'50%', border:'3px solid #e67e00', display:'flex', alignItems:'center', justifyContent:'center', position:'relative'}}>
            <div style={{position:'absolute', inset:-8, borderRadius:'50%', border:'1px solid rgba(230,126,0,.2)'}}></div>
            <span style={{fontWeight:900, fontSize:26, color:'#e67e00', lineHeight:1}}>E</span>
          </div>
          <div style={{textAlign:'left'}}>
            <div style={{fontSize:36, fontWeight:700, letterSpacing:-1, lineHeight:1, color:'#1a1a1a'}}>
              etiq<span style={{color:'#e67e00', fontWeight:800}}>PRO</span>
              <span style={{display:'inline-block', width:7, height:7, background:'#e67e00', borderRadius:'50%', marginLeft:2, marginBottom:6}}></span>
            </div>
          </div>
        </div>
        <p style={{color:'#6b7280', fontSize:14, marginBottom:6}}>Gestão de Etiquetas para Cozinha Industrial</p>

        {/* Sync status on login */}
        <div style={{
          display:'inline-flex', alignItems:'center', gap:5, padding:'4px 12px',
          borderRadius:12, background:'#f5f6fa', border:'1px solid #e0e3ea',
          fontSize:12, color: syncInfo.color, marginBottom:24
        }}>
          <span>{syncInfo.icon}</span>
          <span>{syncInfo.label}</span>
        </div>

        <input
          placeholder="Usuário"
          value={u} onChange={e => { setU(e.target.value); setErr(false) }}
          onKeyDown={e => e.key==='Enter' && handleLogin()}
          style={{
            width:'100%', padding:'13px 16px', border:`2px solid ${err ? '#e53935' : '#e0e3ea'}`, borderRadius:12,
            fontSize:15, marginBottom:14, outline:'none', fontFamily:'inherit',
            background:'#fafafa', boxSizing:'border-box', transition:'border .2s'
          }}
        />
        <input
          type="password" placeholder="Senha"
          value={p} onChange={e => { setP(e.target.value); setErr(false) }}
          onKeyDown={e => e.key==='Enter' && handleLogin()}
          style={{
            width:'100%', padding:'13px 16px', border:`2px solid ${err ? '#e53935' : '#e0e3ea'}`, borderRadius:12,
            fontSize:15, marginBottom:10, outline:'none', fontFamily:'inherit',
            background:'#fafafa', boxSizing:'border-box', transition:'border .2s'
          }}
        />

        {/* Lembrar acesso */}
        <label style={{
          display:'flex', alignItems:'center', gap:8, cursor:'pointer',
          marginBottom:err ? 6 : 14, justifyContent:'flex-start', userSelect:'none'
        }}>
          <input
            type="checkbox"
            checked={lembrar}
            onChange={e => setLembrar(e.target.checked)}
            style={{
              width:17, height:17, accentColor:'#e67e00', cursor:'pointer', flexShrink:0
            }}
          />
          <span style={{fontSize:13, color:'#6b7280'}}>Lembrar acesso neste dispositivo</span>
        </label>

        {err && <div style={{color:'#e53935', fontSize:13, marginBottom:8, padding:'8px', background:'#ffebee', borderRadius:8}}>Usuário ou senha incorretos</div>}
        <button onClick={handleLogin} style={{
          width:'100%', padding:15, background:'linear-gradient(135deg,#e67e00,#f59500)',
          color:'#fff', border:'none', borderRadius:12, fontSize:16, fontWeight:700,
          cursor:'pointer', fontFamily:'inherit', marginTop:4
        }}>
          Entrar no Sistema
        </button>
      </div>
    </div>
  )
}
