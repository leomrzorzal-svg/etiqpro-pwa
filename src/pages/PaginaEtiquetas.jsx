import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../App'
import { getEtiquetas, baixarEtiqueta } from '../lib/db'
import { imprimirEtiqueta, impressoraConectada } from '../lib/bluetooth'

const STATUS_LABELS = { ativa:'Ativa', vencida:'Vencida', descartada:'Descartada' }

export default function PaginaEtiquetas() {
  const { showToast } = useApp()
  const navigate = useNavigate()
  const [etiquetas, setEtiquetas] = useState([])
  const [loading, setLoading] = useState(true)
  const [filtro, setFiltro] = useState('ativa')
  const [selecionada, setSelecionada] = useState(null)

  const carregar = useCallback(async () => {
    setLoading(true)
    const data = await getEtiquetas({ status: filtro, limit: 50 })
    setEtiquetas(data)
    setLoading(false)
  }, [filtro])

  useEffect(() => { carregar() }, [carregar])

  async function handleBaixar(etq) {
    try {
      await baixarEtiqueta(etq.id)
      showToast('Etiqueta descartada', 'sucesso')
      setSelecionada(null)
      carregar()
    } catch (err) {
      showToast('Erro: ' + err.message, 'erro')
    }
  }

  async function handleReimprimir(etq) {
    if (!impressoraConectada()) return showToast('Impressora não conectada', 'erro')
    try {
      await imprimirEtiqueta({
        produto:       etq.produto?.nome || '',
        grupo:         etq.produto?.grupo || '',
        dataAbertura:  etq.data_abertura,
        dataValidade:  etq.data_validade,
        ingredientes:  etq.ingredientes || etq.produto?.ingredientes || '',
        conservacao:   etq.conservacao  || etq.produto?.conservacao  || '',
        operador:      etq.operador,
        numeroEtiqueta: etq.numero
      })
      showToast('✓ Reimpresso!', 'sucesso')
    } catch (err) {
      showToast('Erro: ' + err.message, 'erro')
    }
  }

  const filtros = ['ativa', 'vencida', 'descartada']

  return (
    <div>
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16}}>
        <h2 style={{fontSize:18, fontWeight:800}}>Etiquetas</h2>
        <button className="btn btn-primary btn-sm" onClick={() => navigate('/criar')}>+ Nova</button>
      </div>

      {/* Filtros */}
      <div style={{display:'flex', gap:8, marginBottom:16, overflowX:'auto'}}>
        {filtros.map(f => (
          <button
            key={f}
            onClick={() => setFiltro(f)}
            style={{
              padding:'6px 14px', borderRadius:20, border:'2px solid',
              borderColor: filtro===f ? 'var(--laranja)' : 'var(--cinza2)',
              background: filtro===f ? 'var(--laranja)' : 'transparent',
              color: filtro===f ? '#fff' : 'var(--texto)',
              fontWeight:600, fontSize:12, cursor:'pointer', whiteSpace:'nowrap'
            }}
          >
            {STATUS_LABELS[f]}
          </button>
        ))}
      </div>

      {loading && <div className="spinner" />}

      {!loading && etiquetas.length === 0 && (
        <div style={{textAlign:'center', padding:'40px 0', color:'var(--cinza3)'}}>
          <div style={{fontSize:40, marginBottom:8}}>🏷️</div>
          <p>Nenhuma etiqueta {STATUS_LABELS[filtro].toLowerCase()}</p>
          {filtro === 'ativa' && (
            <button className="btn btn-primary" style={{marginTop:16}} onClick={() => navigate('/criar')}>
              Criar primeira etiqueta
            </button>
          )}
        </div>
      )}

      {!loading && etiquetas.map(etq => {
        const venceHoje = etq.data_validade === new Date().toISOString().split('T')[0]
        return (
          <div key={etq.id} className="card" style={{cursor:'pointer'}} onClick={() => setSelecionada(etq)}>
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start'}}>
              <div style={{flex:1}}>
                <div style={{fontWeight:700, fontSize:15}}>{etq.produto?.nome}</div>
                <div style={{fontSize:12, color:'var(--cinza3)', marginTop:2}}>
                  {etq.produto?.grupo} · Op: {etq.operador} · #{etq.numero}
                </div>
                <div style={{display:'flex', gap:12, marginTop:8}}>
                  <div>
                    <div style={{fontSize:9, color:'var(--cinza3)', fontWeight:700, textTransform:'uppercase'}}>Abertura</div>
                    <div style={{fontSize:13, fontWeight:600}}>{etq.data_abertura}</div>
                  </div>
                  <div>
                    <div style={{fontSize:9, color:'var(--cinza3)', fontWeight:700, textTransform:'uppercase'}}>Validade</div>
                    <div style={{fontSize:13, fontWeight:600, color: etq.status==='vencida' ? 'var(--vermelho)' : (venceHoje ? 'var(--amarelo)' : 'inherit')}}>
                      {etq.data_validade}
                    </div>
                  </div>
                </div>
              </div>
              <span className={`badge badge-${etq.status}`}>{STATUS_LABELS[etq.status]}</span>
            </div>
          </div>
        )
      })}

      {/* Drawer ações */}
      {selecionada && (
        <div className="overlay" onClick={() => setSelecionada(null)}>
          <div className="drawer" onClick={e => e.stopPropagation()}>
            <div className="drawer-handle" />
            <h3 style={{fontWeight:800, marginBottom:4}}>{selecionada.produto?.nome}</h3>
            <p style={{fontSize:12, color:'var(--cinza3)', marginBottom:16}}>
              #{selecionada.numero} · {selecionada.operador} · Validade: {selecionada.data_validade}
            </p>
            <div style={{display:'flex', flexDirection:'column', gap:10}}>
              <button className="btn btn-ghost" onClick={() => handleReimprimir(selecionada)}>
                🖨️ Reimprimir
              </button>
              {selecionada.status === 'ativa' && (
                <button className="btn btn-danger" onClick={() => handleBaixar(selecionada)}>
                  🗑️ Descartar produto
                </button>
              )}
              <button className="btn btn-ghost" onClick={() => setSelecionada(null)}>Fechar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
