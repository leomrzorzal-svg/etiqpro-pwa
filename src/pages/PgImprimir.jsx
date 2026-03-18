import React, { useState } from 'react'
import { useApp, fd, td, calcVal, nextNum, formatPesoKg } from '../App'

export default function PgImprimir() {
  const { data, updateData, showToast, btStatus, printBT, doPrintRawBT } = useApp()
  const [busca, setBusca] = useState('')
  const [modal, setModal] = useState(false)
  const [prodSel, setProdSel] = useState(null)
  const [opNome, setOpNome] = useState('')
  const [opErr, setOpErr] = useState(false)
  const [peso, setPeso] = useState('')
  const [qty, setQty] = useState(1)

  const hoje = td()

  const prods = data.prods.filter(p =>
    p.ativo && (!busca || p.nome.toLowerCase().includes(busca.toLowerCase()))
  )

  function abrirModal(p) {
    setProdSel(p)
    setOpNome('')
    setPeso('')
    setQty(1)
    setOpErr(false)
    setModal(true)
  }

  function changeQty(d) { setQty(q => Math.max(1, Math.min(100, q + d))) }

  function handleImprimir() {
    if (!opNome.trim()) { setOpErr(true); return }
    setOpErr(false)
    const p = prodSel
    const g = data.grps.find(x => x.id == p.grp) || { nome: 'Sem grupo', cor: '#999' }
    const valDate = p.vDias ? calcVal(p.vDias) : ''
    const pesoFmt = peso ? formatPesoKg(peso) : ''

    const novas = []
    for (let i = 0; i < qty; i++) {
      const counter = (data.counter || 0) + 1 + i
      const num = nextNum(counter)
      novas.push({
        id: Date.now() + i,
        num,
        prod: p.nome,
        grp: g.nome,
        grpCor: g.cor,
        ingr: p.ingr || '',
        obs: p.obs || '',
        conserv: p.conserv || '',
        manip: hoje,
        val: valDate,
        op: opNome,
        peso: pesoFmt,
        at: new Date().toISOString(),
        baixada: false,
        baixadaEm: null,
        baixadaPor: null,
        tipoBaixa: null,
        descMotivo: null,
        descPeso: null,
      })
    }

    const htmls = novas.map(h => gerarHtmlEtiqueta(h, p, g))
    imprimirHtmls(htmls)

    updateData(d => ({
      ...d,
      counter: (d.counter || 0) + qty,
      hist: [...novas, ...d.hist]
    }))
    showToast(`✓ ${qty} etiqueta${qty > 1 ? 's' : ''} registrada${qty > 1 ? 's' : ''}!`, 'ok')
    setModal(false)
  }

  async function handleImprimirBT() {
    if (!opNome.trim()) { setOpErr(true); return }
    setOpErr(false)
    const p = prodSel
    const g = data.grps.find(x => x.id == p.grp) || { nome: 'Sem grupo', cor: '#999' }
    const valDate = p.vDias ? calcVal(p.vDias) : ''
    const pesoFmt = peso ? formatPesoKg(peso) : ''
    const novas = []
    for (let i = 0; i < qty; i++) {
      const counter = (data.counter || 0) + 1 + i
      const num = nextNum(counter)
      novas.push({
        id: Date.now() + i, num,
        prod: p.nome, grp: g.nome, grpCor: g.cor,
        ingr: p.ingr||'', obs: p.obs||'', conserv: p.conserv||'',
        manip: hoje, val: valDate, op: opNome, peso: pesoFmt,
        at: new Date().toISOString(),
        baixada: false, baixadaEm: null, baixadaPor: null, tipoBaixa: null, descMotivo: null, descPeso: null,
      })
    }
    updateData(d => ({ ...d, counter: (d.counter || 0) + qty, hist: [...novas, ...d.hist] }))
    for (const h of novas) await printBT(h)
    setModal(false)
  }

  function handleImprimirRawBT() {
    if (!opNome.trim()) { setOpErr(true); return }
    setOpErr(false)
    const p = prodSel
    const g = data.grps.find(x => x.id == p.grp) || { nome: 'Sem grupo', cor: '#999' }
    const valDate = p.vDias ? calcVal(p.vDias) : ''
    const pesoFmt = peso ? formatPesoKg(peso) : ''
    const novas = []
    for (let i = 0; i < qty; i++) {
      const counter = (data.counter || 0) + 1 + i
      const num = nextNum(counter)
      novas.push({
        id: Date.now() + i, num,
        prod: p.nome, grp: g.nome, grpCor: g.cor,
        ingr: p.ingr||'', obs: p.obs||'', conserv: p.conserv||'',
        manip: hoje, val: valDate, op: opNome, peso: pesoFmt,
        at: new Date().toISOString(),
        baixada: false, baixadaEm: null, baixadaPor: null, tipoBaixa: null, descMotivo: null, descPeso: null,
      })
    }
    updateData(d => ({ ...d, counter: (d.counter || 0) + qty, hist: [...novas, ...d.hist] }))
    // Passa todas as etiquetas para imprimir N cópias no mesmo job
    doPrintRawBT(novas)
    setModal(false)
  }

  const prod = prodSel
  const g = prod ? (data.grps.find(x => x.id == prod.grp) || { nome: 'Sem grupo', cor: '#999' }) : null
  const valDate = prod?.vDias ? calcVal(prod.vDias) : ''
  const pesoFmt = peso ? formatPesoKg(peso) : ''

  return (
    <div>
      {/* Barra de busca */}
      <div style={{background:'#fff', borderRadius:16, padding:'18px 22px', boxShadow:'0 2px 16px rgba(0,0,0,.09)', display:'flex', alignItems:'center', gap:14, marginBottom:24}}>
        <span style={{fontSize:22, color:'#6b7280'}}>🔍</span>
        <input
          type="text"
          placeholder="Buscar produto pelo nome..."
          value={busca}
          onChange={e => setBusca(e.target.value)}
          style={{flex:1, padding:'14px 20px', border:'2px solid #e0e3ea', borderRadius:12, fontSize:16, outline:'none', fontFamily:'inherit', background:'#fafafa'}}
        />
        {busca && (
          <button onClick={() => setBusca('')}
            style={{padding:'10px 16px', background:'#e0e3ea', border:'none', borderRadius:10, cursor:'pointer', fontSize:14, fontWeight:700, color:'#6b7280', fontFamily:'inherit'}}>
            Limpar
          </button>
        )}
      </div>

      {/* Grid de produtos */}
      {prods.length === 0 ? (
        <div style={{textAlign:'center', padding:'48px 20px', color:'#6b7280'}}>
          <div style={{fontSize:48, marginBottom:12}}>🔍</div>
          <p>Nenhum produto encontrado</p>
        </div>
      ) : busca ? (
        <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(155px,1fr))', gap:16, marginBottom:28}}>
          {prods.map(p => {
            const grp = data.grps.find(x => x.id == p.grp) || { nome:'Sem grupo', cor:'#999' }
            return <ProdCard key={p.id} p={p} g={grp} onClick={() => abrirModal(p)} />
          })}
        </div>
      ) : (
        data.grps.map(grp => {
          const lista = prods.filter(p => p.grp == grp.id)
          if (!lista.length) return null
          return (
            <div key={grp.id} style={{marginBottom:28}}>
              <div style={{display:'flex', alignItems:'center', gap:10, marginBottom:12}}>
                <div style={{width:10, height:10, borderRadius:'50%', background:grp.cor}} />
                <span style={{fontSize:13, fontWeight:800, color:'#6b7280', textTransform:'uppercase', letterSpacing:.8}}>{grp.nome}</span>
              </div>
              <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(155px,1fr))', gap:16}}>
                {lista.map(p => <ProdCard key={p.id} p={p} g={grp} onClick={() => abrirModal(p)} />)}
              </div>
            </div>
          )
        })
      )}

      {/* Modal de impressão */}
      {modal && prod && (
        <div className="modal-ov" onClick={() => setModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-hd">
              <h3 style={{maxWidth:'85%', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>{prod.nome}</h3>
              <button className="modal-cl" onClick={() => setModal(false)}>×</button>
            </div>
            <div className="modal-bd">

              {/* 1. Nome do operador */}
              <div style={{marginBottom:12}}>
                <label style={{display:'block', fontSize:13, fontWeight:800, color:'#6b7280', textTransform:'uppercase', letterSpacing:.5, marginBottom:6}}>
                  Seu nome <span style={{color:'#e53935'}}>*</span>
                </label>
                <input
                  type="text"
                  value={opNome}
                  onChange={e => { setOpNome(e.target.value); setOpErr(false) }}
                  placeholder="Digite seu nome..."
                  autoFocus
                  style={{
                    width:'100%', padding:'12px 16px', border:`3px solid ${opErr ? '#e53935' : '#e0e3ea'}`, borderRadius:12,
                    fontSize:17, fontWeight:700, outline:'none', fontFamily:'inherit', textAlign:'center',
                    background:'#fafafa', boxSizing:'border-box'
                  }}
                />
                {opErr && <div style={{color:'#e53935', fontSize:12, marginTop:5, fontWeight:700}}>⚠️ Nome obrigatório para imprimir</div>}
              </div>

              {/* 2. Quantidade + Peso em linha */}
              <div style={{display:'flex', gap:12, alignItems:'center', marginBottom:16}}>
                <div style={{flex:1}}>
                  <label style={{display:'block', fontSize:11, fontWeight:700, color:'#6b7280', textTransform:'uppercase', marginBottom:4}}>Qtd</label>
                  <div style={{display:'flex', alignItems:'center', gap:8, justifyContent:'center', background:'#f5f6fa', borderRadius:10, padding:'8px 0'}}>
                    <button onClick={() => changeQty(-1)} style={{width:36, height:36, borderRadius:8, border:'2px solid #e0e3ea', background:'#fff', fontSize:20, fontWeight:700, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'inherit'}}>−</button>
                    <span style={{fontSize:24, fontWeight:900, minWidth:36, textAlign:'center'}}>{qty}</span>
                    <button onClick={() => changeQty(1)} style={{width:36, height:36, borderRadius:8, border:'2px solid #e0e3ea', background:'#fff', fontSize:20, fontWeight:700, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'inherit'}}>+</button>
                  </div>
                </div>
                <div style={{flex:1}}>
                  <label style={{display:'block', fontSize:11, fontWeight:700, color:'#6b7280', textTransform:'uppercase', marginBottom:4}}>Peso KG <span style={{fontWeight:400}}>(opc.)</span></label>
                  <div style={{position:'relative'}}>
                    <input
                      type="number" step="0.001" min="0"
                      value={peso} onChange={e => setPeso(e.target.value)}
                      placeholder="0.000"
                      style={{
                        width:'100%', padding:'10px 38px 10px 10px', border:'2px solid #e0e3ea', borderRadius:10,
                        fontSize:15, fontWeight:600, outline:'none', fontFamily:'inherit', background:'#fafafa',
                        boxSizing:'border-box', textAlign:'center'
                      }}
                    />
                    <span style={{position:'absolute', right:10, top:'50%', transform:'translateY(-50%)', fontWeight:800, color:'#6b7280', fontSize:12, pointerEvents:'none'}}>KG</span>
                  </div>
                </div>
              </div>

              {/* 3. BOTÃO IMPRIMIR — sempre visível */}
              <button
                onClick={handleImprimirRawBT}
                style={{
                  display:'block', width:'100%', padding:'18px 0',
                  background:'linear-gradient(135deg,#2e7d32,#43a047)',
                  color:'#fff', border:'none', borderRadius:14,
                  cursor:'pointer', fontSize:20, fontWeight:900,
                  fontFamily:'inherit', letterSpacing:.3,
                  boxShadow:'0 4px 20px rgba(46,125,50,.4)',
                  marginBottom:16
                }}
              >
                📱 IMPRIMIR via RawBT {qty > 1 ? `· ${qty} cópias` : ''}
              </button>

              {/* 4. Preview compacto (abaixo do botão, scroll se necessário) */}
              <div style={{border:'2px solid #e0e3ea', borderRadius:10, padding:12, background:'#fafafa', fontFamily:'Arial,sans-serif', fontSize:11}}>
                <div style={{display:'flex', justifyContent:'space-between', marginBottom:4}}>
                  <span style={{fontWeight:900, color:'#e67e00'}}>etiqPRO</span>
                  <span style={{color:'#aaa'}}>{new Date().toLocaleDateString('pt-BR')}</span>
                </div>
                <div style={{fontSize:15, fontWeight:900, color:'#111', marginBottom:2, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>{prod.nome}</div>
                <div style={{fontWeight:700, color:g.cor, marginBottom:6}}>{g.nome}</div>
                <div style={{display:'flex', gap:16, background:'#fff', borderRadius:6, padding:'6px 10px', marginBottom:6, border:'1px solid #e0e3ea'}}>
                  <div><div style={{fontSize:8, color:'#888', textTransform:'uppercase'}}>Abertura</div><div style={{fontSize:14, fontWeight:900}}>{fd(hoje)}</div></div>
                  <div><div style={{fontSize:8, color:'#888', textTransform:'uppercase'}}>Validade</div><div style={{fontSize:14, fontWeight:900, color:'#e53935'}}>{valDate ? fd(valDate) : '—'}</div></div>
                  {pesoFmt && <div><div style={{fontSize:8, color:'#888', textTransform:'uppercase'}}>Peso</div><div style={{fontSize:14, fontWeight:900}}>{pesoFmt}</div></div>}
                </div>
                {prod.conserv && <div style={{fontWeight:700, color:'#1565c0', background:'#e3f2fd', borderRadius:4, padding:'2px 8px', display:'inline-block', marginBottom:4}}>{prod.conserv}</div>}
                <div style={{color:'#6b7280', borderTop:'1px solid #e0e3ea', paddingTop:6, marginTop:4, display:'flex', justifyContent:'space-between'}}>
                  <span>Operador: <b>{opNome || '—'}</b></span>
                  <span>{qty} etiq.</span>
                </div>
              </div>

              {/* Cancelar + BLE (secundários) */}
              <div style={{display:'flex', gap:8, marginTop:12, justifyContent:'space-between'}}>
                <button className="btn btn-gy" onClick={() => setModal(false)}>✕ Cancelar</button>
                {btStatus === 'connected' && (
                  <button onClick={handleImprimirBT} style={{padding:'8px 16px', background:'#e3f2fd', color:'#1565c0', border:'2px solid #1565c0', borderRadius:10, cursor:'pointer', fontSize:12, fontWeight:700, fontFamily:'inherit'}}>
                    📡 BLE direto
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function ProdCard({ p, g, onClick }) {
  const [hov, setHov] = useState(false)
  return (
    <div onClick={onClick}
      onMouseOver={() => setHov(true)}
      onMouseOut={() => setHov(false)}
      style={{
        background:'#fff', borderRadius:16,
        boxShadow: hov ? '0 8px 28px rgba(0,0,0,.13)' : '0 2px 16px rgba(0,0,0,.09)',
        cursor:'pointer', border: `2px solid ${hov ? '#e67e00' : '#f0f2f5'}`,
        display:'flex', flexDirection:'column', overflow:'hidden', userSelect:'none',
        transform: hov ? 'translateY(-3px)' : 'translateY(0)',
        transition:'transform .18s, box-shadow .18s, border-color .18s'
      }}
    >
      <div style={{height:5, width:'100%', background:g.cor, flexShrink:0}} />
      <div style={{padding:14}}>
        <div style={{fontSize:14, fontWeight:800, color:'#1a1a2e', lineHeight:1.3, marginBottom:7}}>{p.nome}</div>
        <div style={{fontSize:11, fontWeight:700, padding:'3px 10px', borderRadius:10, marginBottom:8, display:'inline-block', background:g.cor+'22', color:g.cor}}>{g.nome}</div>
        {p.vDias ? <div style={{fontSize:11, color:'#6b7280'}}><b>{p.vDias} dias</b> de validade</div> : null}
      </div>
    </div>
  )
}

function gerarHtmlEtiqueta(h, p, g) {
  const hora = new Date(h.at).toLocaleTimeString('pt-BR', {hour:'2-digit',minute:'2-digit'})
  const dataFmt = new Date(h.at).toLocaleDateString('pt-BR')
  const fdt = s => { if (!s) return '--/--/----'; const pt = s.split('-'); return `${pt[2]}/${pt[1]}/${pt[0]}` }
  return `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="margin:0;padding:0;background:#fff;font-family:Arial,sans-serif">
<div style="width:378px;height:189px;border:2px solid #e67e00;border-radius:4px;box-sizing:border-box;padding:6px 10px;overflow:hidden;display:flex;flex-direction:column;gap:3px">
<div style="display:flex;justify-content:space-between;align-items:center"><span style="font-weight:900;font-size:8px;color:#e67e00">etiqPRO</span><span style="font-size:8px;color:#aaa">${h.num}</span></div>
<div style="font-size:17px;font-weight:900;color:#111;line-height:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${p.nome}</div>
<div style="font-size:9px;font-weight:700;color:${g.cor}">${g.nome}</div>
<div style="display:flex;gap:16px;background:#f5f6fa;border-radius:3px;padding:3px 6px">
<div><div style="font-size:8px;font-weight:700;color:#666;text-transform:uppercase;letter-spacing:.5px">Abertura</div><div style="font-size:15px;font-weight:900;color:#111;line-height:1.1">${fdt(h.manip)}</div></div>
<div><div style="font-size:8px;font-weight:700;color:#666;text-transform:uppercase;letter-spacing:.5px">Validade</div><div style="font-size:15px;font-weight:900;color:#e53935;line-height:1.1">${h.val ? fdt(h.val) : '--'}</div></div>
${h.peso ? `<div><div style="font-size:8px;font-weight:700;color:#666;text-transform:uppercase;letter-spacing:.5px">Peso</div><div style="font-size:13px;font-weight:900;color:#111;line-height:1.1">${h.peso}</div></div>` : ''}
</div>
${p.ingr ? `<div style="background:#fff8f0;border-left:3px solid #e67e00;padding:2px 5px;border-radius:2px"><span style="font-size:8px;font-weight:700;color:#e67e00;text-transform:uppercase">Ingredientes: </span><span style="font-size:8px;color:#333">${p.ingr}</span></div>` : ''}
${p.conserv ? `<div style="font-size:8px;font-weight:700;color:#1565c0;background:#e3f2fd;padding:1px 5px;border-radius:2px;display:inline-block">${p.conserv}</div>` : ''}
${p.obs ? `<div style="font-size:8px;color:#888;font-style:italic;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${p.obs}</div>` : ''}
<div style="display:flex;justify-content:space-between;align-items:center;border-top:1px solid #ddd;padding-top:2px;margin-top:auto">
<span style="font-size:8px;font-weight:700;color:#333">Operador: ${h.op}</span>
<span style="font-size:8px;color:#666">${hora} &nbsp; ${dataFmt}</span>
</div>
</div></body></html>`
}

function imprimirHtmls(htmls) {
  const ifrId = 'printFrame'
  let ifr = document.getElementById(ifrId)
  if (ifr) ifr.parentNode.removeChild(ifr)
  ifr = document.createElement('iframe')
  ifr.id = ifrId
  ifr.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:0;height:0;border:none;visibility:hidden'
  document.body.appendChild(ifr)
  ifr.contentDocument.open()
  ifr.contentDocument.write(htmls.join(''))
  ifr.contentDocument.close()
  ifr.onload = () => {
    try { ifr.contentWindow.focus(); ifr.contentWindow.print() } catch { window.print() }
    setTimeout(() => { if (ifr && ifr.parentNode) ifr.parentNode.removeChild(ifr) }, 3000)
  }
}
