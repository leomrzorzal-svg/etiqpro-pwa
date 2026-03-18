import { useState, useEffect } from 'react'
import { getEtiquetas, updateEtiquetaStatus, addDescarte } from '../lib/db'
import { format, isAfter, isBefore, addDays } from 'date-fns'

export default function EtiquetasAtivas({ operador }) {
  const [etiquetas, setEtiquetas] = useState([])
  const [filtro, setFiltro]       = useState('ativa')
  const [loading, setLoading]     = useState(true)

  async function carregar() {
    setLoading(true)
    const data = await getEtiquetas({ status: filtro })
    setEtiquetas(data)
    setLoading(false)
  }

  useEffect(() => { carregar() }, [filtro])

  async function baixar(etiqueta) {
    if (!confirm(`Baixar etiqueta de "${etiqueta.produto?.nome}"?`)) return
    await updateEtiquetaStatus(etiqueta.id, 'baixada')
    await addDescarte({
      etiqueta_id: etiqueta.id,
      produto_id:  etiqueta.produto_id,
      operador:    operador?.nome || 'Sistema',
      motivo:      'baixa_manual',
    })
    carregar()
  }

  function getCorStatus(etiqueta) {
    const hoje = new Date()
    const validade = new Date(etiqueta.data_validade + 'T23:59:59')
    if (isBefore(validade, hoje))                 return { cor:'#E53935', label:'VENCIDA' }
    if (isBefore(validade, addDays(hoje, 2)))     return { cor:'#FB8C00', label:'VENCE EM BREVE' }
    return { cor:'#43A047', label:'OK' }
  }

  return (
    <div style={{ maxWidth:480, margin:'0 auto' }}>
      <h2 style={{ margin:'0 0 12px', color:'#1A1208' }}>📋 Etiquetas</h2>

      {/* Filtros */}
      <div style={{ display:'flex', gap:8, marginBottom:16 }}>
        {['ativa','baixada','vencida'].map(s => (
          <button key={s} onClick={() => setFiltro(s)}
            style={{ flex:1, padding:'8px 4px', borderRadius:8, border:'none', fontSize:12, fontWeight:'bold', cursor:'pointer',
                     background: filtro===s ? '#E67E00' : '#eee', color: filtro===s ? '#fff' : '#555' }}>
            {s.charAt(0).toUpperCase()+s.slice(1)}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign:'center', color:'#999', padding:40 }}>Carregando...</div>
      ) : etiquetas.length === 0 ? (
        <div style={{ textAlign:'center', color:'#999', padding:40 }}>Nenhuma etiqueta encontrada</div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {etiquetas.map(et => {
            const { cor, label } = getCorStatus(et)
            return (
              <div key={et.id} style={{ background:'#fff', borderRadius:8, padding:'12px 14px',
                                        boxShadow:'0 1px 4px rgba(0,0,0,0.08)', borderLeft:`4px solid ${cor}` }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                  <div>
                    <div style={{ fontWeight:'bold', fontSize:15 }}>{et.produto?.nome}</div>
                    <div style={{ fontSize:11, color:'#999' }}>{et.produto?.grupo}</div>
                  </div>
                  <span style={{ fontSize:10, fontWeight:'bold', color:cor, background:`${cor}20`, padding:'3px 8px', borderRadius:12 }}>
                    {label}
                  </span>
                </div>
                <div style={{ display:'flex', gap:16, marginTop:8, fontSize:12, color:'#555' }}>
                  <span>📅 Validade: <strong>{format(new Date(et.data_validade+'T12:00:00'), 'dd/MM/yyyy')}</strong></span>
                  <span>👤 {et.operador}</span>
                </div>
                {filtro === 'ativa' && (
                  <button onClick={() => baixar(et)}
                    style={{ marginTop:10, width:'100%', padding:'8px', borderRadius:6, border:'1px solid #E53935',
                             background:'#fff', color:'#E53935', fontSize:13, fontWeight:'bold', cursor:'pointer' }}>
                    ⬇️ Baixar etiqueta
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
