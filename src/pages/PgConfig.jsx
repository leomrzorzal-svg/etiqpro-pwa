import React, { useState, useRef } from 'react'
import { useApp } from '../App'

const BT_INFO = {
  disconnected: { icon:'📵', label:'Desconectada', color:'#9e9e9e', bg:'#f5f5f5' },
  connecting:   { icon:'🔄', label:'Conectando...', color:'#1565c0', bg:'#e3f2fd' },
  connected:    { icon:'🖨️', label:'Conectada',    color:'#2e7d32', bg:'#e8f5e9' },
  error:        { icon:'⚠️', label:'Erro',          color:'#c62828', bg:'#ffebee' },
}

const ROLE_DESC = {
  admin: 'Acesso completo. Pode imprimir, dar baixas, editar e deletar etiquetas, gerenciar produtos, grupos, usuários e ver todos os relatórios.',
  operador: 'Pode imprimir etiquetas e dar baixas (uso ou descarte). Não tem acesso a configurações nem a deletar/editar etiquetas.',
}

export default function PgConfig() {
  const { data, updateData, showToast, user, btStatus, connectBT, disconnectBT, testPrintBT, simpleTestPrintBT, doTestRawBT, doCalibratePrint, btDeviceRef, printerMode, setPrinterMode } = useApp()
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({ id: null, nome: '', user: '', senha: '', role: 'operador' })
  const [senhaAtual, setSenhaAtual] = useState('')
  const [novaSenha, setNovaSenha] = useState('')
  const importRef = useRef()

  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }

  function abrirNovo() {
    setForm({ id: null, nome: '', user: '', senha: '', role: 'operador' })
    setModal(true)
  }

  function abrirEditar(u) {
    setForm({ ...u })
    setModal(true)
  }

  function salvarUsuario() {
    if (!form.nome.trim() || !form.user.trim() || !form.senha.trim())
      return showToast('Preencha todos os campos', 'erro')
    if (form.senha.length < 4)
      return showToast('Senha deve ter pelo menos 4 caracteres', 'erro')
    const existe = data.usuarios.find(u => u.user === form.user.toLowerCase() && u.id !== form.id)
    if (existe) return showToast('Usuário já existe', 'erro')
    updateData(d => {
      const usuarios = form.id
        ? d.usuarios.map(u => u.id === form.id ? { ...form, user: form.user.toLowerCase() } : u)
        : [...d.usuarios, { ...form, id: Date.now(), user: form.user.toLowerCase() }]
      return { ...d, usuarios }
    })
    showToast('✓ Usuário salvo!', 'ok')
    setModal(false)
  }

  function excluirUsuario(u) {
    if (u.user === 'admin') return showToast('O usuário admin não pode ser excluído', 'erro')
    if (u.id === user?.id) return showToast('Não pode excluir o próprio usuário!', 'erro')
    if (!confirm(`Remover "${u.nome}"?`)) return
    updateData(d => ({ ...d, usuarios: d.usuarios.filter(x => x.id !== u.id) }))
    showToast('Usuário removido', 'ok')
  }

  function trocarSenha() {
    if (!senhaAtual || !novaSenha) return showToast('Preencha os campos', 'erro')
    if (novaSenha.length < 4) return showToast('Nova senha deve ter pelo menos 4 caracteres', 'erro')
    const u = data.usuarios.find(x => x.id === user?.id)
    if (!u || u.senha !== senhaAtual) return showToast('Senha atual incorreta', 'erro')
    updateData(d => ({ ...d, usuarios: d.usuarios.map(x => x.id === user.id ? { ...x, senha: novaSenha } : x) }))
    showToast('✓ Senha alterada!', 'ok')
    setSenhaAtual(''); setNovaSenha('')
  }

  // Backup export
  function exportarBackup() {
    const json = JSON.stringify(data, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `etiqpro-backup-${new Date().toISOString().slice(0,10)}.json`
    a.click()
    URL.revokeObjectURL(url)
    showToast('✓ Backup exportado!', 'ok')
  }

  // Backup import
  function importarBackup(e) {
    const file = e.target.files[0]
    if (!file) return
    if (!confirm('Importar backup vai SUBSTITUIR todos os dados atuais. Continuar?')) {
      e.target.value = ''
      return
    }
    const reader = new FileReader()
    reader.onload = ev => {
      try {
        const d = JSON.parse(ev.target.result)
        if (!d.hist || !d.prods || !d.usuarios) return showToast('Arquivo inválido', 'erro')
        updateData(() => d)
        showToast('✓ Backup restaurado com sucesso!', 'ok')
      } catch {
        showToast('Erro ao importar o arquivo', 'erro')
      }
      e.target.value = ''
    }
    reader.readAsText(file)
  }

  const isAdmin = form.user === 'admin'

  const bt = BT_INFO[btStatus] || BT_INFO.disconnected

  return (
    <div>
      {/* Modo de Impressora */}
      <div className="panel" style={{marginBottom:20}}>
        <div className="panel-hd"><h3>🖨️ Tipo de Impressora</h3></div>
        <div className="panel-bd">
          <p style={{fontSize:13,color:'var(--t2)',marginBottom:16}}>
            Selecione como as etiquetas serão impressas neste dispositivo:
          </p>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(280px,1fr))',gap:16}}>
            {/* Opção Bluetooth */}
            <div
              onClick={() => setPrinterMode('ble')}
              style={{
                padding:20, borderRadius:14, cursor:'pointer', transition:'all .2s',
                border: `3px solid ${printerMode === 'ble' ? '#1565c0' : '#e0e3ea'}`,
                background: printerMode === 'ble' ? '#e3f2fd' : '#fafafa',
              }}
            >
              <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:10}}>
                <div style={{
                  width:44,height:44,borderRadius:12,
                  background: printerMode === 'ble' ? '#1565c0' : '#e0e3ea',
                  display:'flex',alignItems:'center',justifyContent:'center',fontSize:22,
                  transition:'background .2s'
                }}>
                  {printerMode === 'ble' ? '✅' : '📡'}
                </div>
                <div>
                  <div style={{fontWeight:900,fontSize:16,color: printerMode === 'ble' ? '#1565c0' : '#333'}}>
                    Bluetooth (BLE)
                  </div>
                  <div style={{fontSize:12,color:'var(--t2)'}}>Para tablets e celulares</div>
                </div>
              </div>
              <p style={{fontSize:12,color:'#555',lineHeight:1.5,margin:0}}>
                Conecta diretamente via Bluetooth Low Energy. Ideal para <b>tablets Android</b> com impressoras portáteis. Também suporta impressão via <b>RawBT</b>.
              </p>
            </div>

            {/* Opção Local */}
            <div
              onClick={() => setPrinterMode('local')}
              style={{
                padding:20, borderRadius:14, cursor:'pointer', transition:'all .2s',
                border: `3px solid ${printerMode === 'local' ? '#2e7d32' : '#e0e3ea'}`,
                background: printerMode === 'local' ? '#e8f5e9' : '#fafafa',
              }}
            >
              <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:10}}>
                <div style={{
                  width:44,height:44,borderRadius:12,
                  background: printerMode === 'local' ? '#2e7d32' : '#e0e3ea',
                  display:'flex',alignItems:'center',justifyContent:'center',fontSize:22,
                  transition:'background .2s'
                }}>
                  {printerMode === 'local' ? '✅' : '🖨️'}
                </div>
                <div>
                  <div style={{fontWeight:900,fontSize:16,color: printerMode === 'local' ? '#2e7d32' : '#333'}}>
                    Impressora Local (USB/Rede)
                  </div>
                  <div style={{fontSize:12,color:'var(--t2)'}}>Para computadores</div>
                </div>
              </div>
              <p style={{fontSize:12,color:'#555',lineHeight:1.5,margin:0}}>
                Usa a impressora instalada no computador (ex: <b>Argox</b>, Zebra, etc). Imprime pelo navegador usando o diálogo de impressão do sistema.
              </p>
            </div>
          </div>
          <div style={{
            marginTop:16, padding:'10px 16px', borderRadius:10, fontSize:13,
            background: printerMode === 'local' ? '#e8f5e9' : '#e3f2fd',
            color: printerMode === 'local' ? '#2e7d32' : '#1565c0',
            border: `1px solid ${printerMode === 'local' ? '#a5d6a7' : '#90caf9'}`,
            fontWeight:600
          }}>
            {printerMode === 'local'
              ? '✅ Modo ativo: Impressora Local — ao imprimir, o navegador abrirá o diálogo para selecionar a impressora (Argox, Zebra, etc).'
              : '✅ Modo ativo: Bluetooth — conecte a impressora BLE no botão da barra superior.'}
          </div>
        </div>
      </div>

      {/* RawBT — só aparece no modo Bluetooth */}
      {printerMode === 'ble' && (
        <>
          <div className="panel" style={{marginBottom:20}}>
            <div className="panel-hd"><h3>🖨️ Impressora via RawBT</h3></div>
            <div className="panel-bd">
              <div style={{display:'flex',alignItems:'center',gap:16,flexWrap:'wrap'}}>
                <div style={{display:'flex',alignItems:'center',gap:10,padding:'12px 20px',borderRadius:12,background:'#e8f5e9',border:'1px solid #a5d6a733',flex:1,minWidth:220}}>
                  <span style={{fontSize:24}}>📱</span>
                  <div>
                    <div style={{fontWeight:800,fontSize:15,color:'#2e7d32'}}>RawBT configurado</div>
                    <div style={{fontSize:12,color:'#6b7280',marginTop:2}}>Impressão via app RawBT no Android</div>
                  </div>
                </div>
                <button className="btn" style={{background:'#1565c0',color:'#fff'}} onClick={doTestRawBT}>
                  🖨️ Imprimir Teste
                </button>
                <button className="btn" style={{background:'#6a1b9a',color:'#fff'}} onClick={doCalibratePrint}>
                  📏 Calibrar Etiqueta
                </button>
              </div>
              <p style={{fontSize:12,color:'var(--t2)',marginTop:12}}>
                ℹ️ O app <b>RawBT</b> deve estar instalado e com a impressora configurada no tablet. Ao imprimir, o Android abrirá o RawBT automaticamente.
              </p>
              <p style={{fontSize:12,color:'#6a1b9a',marginTop:6}}>
                📏 <b>Calibrar Etiqueta:</b> imprime linhas numeradas de 01 a 80. Veja qual número aparece no <b>início da 2ª etiqueta</b> e informe esse número para ajustar as cópias múltiplas.
              </p>
            </div>
          </div>

          <div className="panel" style={{marginBottom:20,border:'2px solid #e67e00'}}>
            <div className="panel-bd" style={{padding:16}}>
              <div style={{display:'flex',gap:12,alignItems:'flex-start'}}>
                <span style={{fontSize:28}}>ℹ️</span>
                <div>
                  <div style={{fontWeight:800,fontSize:15,color:'#e67e00',marginBottom:4}}>Não precisa conectar a impressora!</div>
                  <div style={{fontSize:13,color:'#555',lineHeight:1.5}}>
                    Para imprimir via <b>RawBT</b>, <b>não é necessário conectar nada aqui</b>.<br/>
                    Basta abrir o produto em <b>Imprimir Etiqueta</b> e tocar no botão <b style={{color:'#2e7d32'}}>📱 IMPRIMIR via RawBT</b>.<br/>
                    O Android abre o RawBT automaticamente.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Dica para modo local */}
      {printerMode === 'local' && (
        <div className="panel" style={{marginBottom:20,border:'2px solid #2e7d32'}}>
          <div className="panel-bd" style={{padding:16}}>
            <div style={{display:'flex',gap:12,alignItems:'flex-start'}}>
              <span style={{fontSize:28}}>🖨️</span>
              <div>
                <div style={{fontWeight:800,fontSize:15,color:'#2e7d32',marginBottom:4}}>Impressora Local configurada</div>
                <div style={{fontSize:13,color:'#555',lineHeight:1.5}}>
                  Ao clicar em <b>Imprimir</b>, o navegador abrirá o <b>diálogo de impressão do sistema</b>.<br/>
                  Selecione sua impressora de etiquetas (ex: <b>Argox</b>, Zebra, etc) e confirme.<br/>
                  Dica: configure o tamanho do papel nas preferências da impressora para o tamanho correto da etiqueta.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Usuários */}
      <div className="panel" style={{marginBottom:20}}>
        <div className="panel-hd">
          <h3>👤 Gerenciar Usuários</h3>
          <button className="btn btn-p" onClick={abrirNovo}>+ Novo Usuário</button>
        </div>
        <div className="panel-bd">
          <div style={{display:'grid',gap:12}}>
            {data.usuarios.map(u => {
              const isAdm = u.role === 'admin'
              const cor = isAdm ? '#e67e00' : '#1976d2'
              const isMe = u.id === user?.id
              return (
                <div key={u.id} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'12px 16px',background:'#fafafa',borderRadius:12,border:'1px solid var(--g2)',flexWrap:'wrap',gap:10}}>
                  <div style={{display:'flex',alignItems:'center',gap:12}}>
                    <div style={{width:44,height:44,borderRadius:12,background:cor,display:'flex',alignItems:'center',justifyContent:'center',fontSize:20,fontWeight:900,color:'#fff',flexShrink:0}}>
                      {u.nome.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div style={{fontWeight:800,fontSize:15}}>{u.nome} {isMe && <span style={{fontSize:11,color:'var(--t2)'}}>(você)</span>}</div>
                      <div style={{fontSize:12,color:'var(--t2)',marginTop:2}}>
                        <code style={{background:'#f0f2f5',padding:'1px 6px',borderRadius:5}}>@{u.user}</code>
                        {' '}
                        <span className={`badge ${isAdm?'b-adm':'b-ok'}`}>{isAdm ? '👑 Admin' : '👷 Operador'}</span>
                      </div>
                    </div>
                  </div>
                  <div style={{display:'flex',gap:8}}>
                    <button className="bti ed" onClick={() => abrirEditar(u)}>✏️ Editar</button>
                    {u.user !== 'admin' && !isMe && (
                      <button className="bti dl" onClick={() => excluirUsuario(u)}>🗑️ Excluir</button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Alterar senha */}
      <div className="panel" style={{marginBottom:20}}>
        <div className="panel-hd"><h3>🔒 Alterar Minha Senha</h3></div>
        <div className="panel-bd">
          <div className="form-grid">
            <div className="fg">
              <label>Senha atual</label>
              <input type="password" value={senhaAtual} onChange={e => setSenhaAtual(e.target.value)} placeholder="Senha atual" />
            </div>
            <div className="fg">
              <label>Nova senha (mín. 4 caracteres)</label>
              <input type="password" value={novaSenha} onChange={e => setNovaSenha(e.target.value)} placeholder="Nova senha" />
            </div>
          </div>
          <button className="btn btn-p" style={{marginTop:14}} onClick={trocarSenha}>🔒 Alterar Senha</button>
        </div>
      </div>

      {/* Backup */}
      <div className="panel">
        <div className="panel-hd"><h3>💾 Backup dos Dados</h3></div>
        <div className="panel-bd">
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(280px,1fr))',gap:20}}>
            <div style={{background:'#e8f5e9',borderRadius:12,padding:20,border:'1px solid #a5d6a7'}}>
              <div style={{fontSize:20,marginBottom:8}}>📤</div>
              <div style={{fontWeight:800,fontSize:15,marginBottom:6,color:'#2e7d32'}}>Exportar Backup</div>
              <p style={{fontSize:13,color:'#388e3c',marginBottom:14}}>Salva todos os dados (etiquetas, produtos, usuários) em um arquivo JSON.</p>
              <button className="btn" style={{background:'#2e7d32',color:'#fff'}} onClick={exportarBackup}>
                💾 Exportar Backup
              </button>
            </div>
            <div style={{background:'#fff3e0',borderRadius:12,padding:20,border:'1px solid #ffcc80'}}>
              <div style={{fontSize:20,marginBottom:8}}>📥</div>
              <div style={{fontWeight:800,fontSize:15,marginBottom:6,color:'#e65100'}}>Restaurar Backup</div>
              <p style={{fontSize:13,color:'#bf360c',marginBottom:14}}>Importa um backup salvo anteriormente. <b>Atenção:</b> substitui todos os dados atuais.</p>
              <input type="file" accept=".json" ref={importRef} style={{display:'none'}} onChange={importarBackup} />
              <button className="btn" style={{background:'#e65100',color:'#fff'}} onClick={() => importRef.current.click()}>
                📂 Restaurar Backup
              </button>
            </div>
          </div>
          <p style={{fontSize:12,color:'var(--t2)',marginTop:16}}>
            🔔 <b>Onde ficam os dados?</b> Os dados são salvos automaticamente no <b>localStorage</b> deste navegador. Exporte regularmente para não perder dados.
          </p>
        </div>
      </div>

      {/* Modal Usuário */}
      {modal && (
        <div className="modal-ov" onClick={() => setModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-hd">
              <h3>{form.id ? 'Editar Usuário' : 'Novo Usuário'}</h3>
              <button className="modal-cl" onClick={() => setModal(false)}>×</button>
            </div>
            <div className="modal-bd">
              <div className="form-grid">
                <div className="fg" style={{gridColumn:'1/-1'}}>
                  <label>Nome completo *</label>
                  <input value={form.nome} onChange={e => set('nome', e.target.value)} placeholder="Ex: João Silva" />
                </div>
                <div className="fg">
                  <label>Login (usuário) *</label>
                  <input value={form.user} onChange={e => set('user', e.target.value)}
                    placeholder="Ex: joao" disabled={isAdmin}
                    style={isAdmin ? {background:'#f5f6fa',color:'var(--t2)'} : {}} />
                </div>
                <div className="fg">
                  <label>Senha * (mín. 4 caracteres)</label>
                  <input type="password" value={form.senha} onChange={e => set('senha', e.target.value)} placeholder="Senha" />
                </div>
                <div className="fg" style={{gridColumn:'1/-1'}}>
                  <label>Perfil de acesso</label>
                  <select value={form.role} onChange={e => set('role', e.target.value)}
                    style={{padding:'10px 14px',border:'2px solid var(--g2)',borderRadius:10,fontSize:14,fontFamily:'inherit',background:'#fafafa',outline:'none'}}
                    disabled={isAdmin}>
                    <option value="operador">👷 Operador</option>
                    <option value="admin">👑 Administrador</option>
                  </select>
                </div>
                <div className="fg" style={{gridColumn:'1/-1'}}>
                  <div style={{
                    padding:'10px 14px',borderRadius:10,fontSize:13,
                    background: form.role==='admin' ? '#fff3e0' : '#e3f2fd',
                    color: form.role==='admin' ? '#e65100' : '#1565c0',
                    border: `1px solid ${form.role==='admin' ? '#ffcc80' : '#90caf9'}`
                  }}>
                    <b>{form.role==='admin' ? '👑 Administrador:' : '👷 Operador:'}</b> {ROLE_DESC[form.role] || ''}
                  </div>
                </div>
              </div>
            </div>
            <div className="modal-ft">
              <button className="btn btn-gy" onClick={() => setModal(false)}>Cancelar</button>
              <button className="btn btn-p" onClick={salvarUsuario}>✓ Salvar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
