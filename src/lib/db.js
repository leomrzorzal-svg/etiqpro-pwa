// ── Camada de dados: Supabase + fallback offline (localStorage) ──────────
import { supabase } from './supabase'

// ─── PRODUTOS ─────────────────────────────────────────────────────────────

export async function getProdutos() {
  const { data, error } = await supabase
    .from('produtos')
    .select('*')
    .eq('ativo', true)
    .order('nome')
  if (error) return getProdutosLocal()
  salvarLocal('produtos', data)
  return data
}

export async function salvarProduto(produto) {
  if (produto.id) {
    const { data, error } = await supabase
      .from('produtos')
      .update({ ...produto, atualizado_em: new Date().toISOString() })
      .eq('id', produto.id)
      .select()
      .single()
    if (error) throw error
    return data
  } else {
    const { data, error } = await supabase
      .from('produtos')
      .insert({ ...produto, ativo: true })
      .select()
      .single()
    if (error) throw error
    return data
  }
}

export async function deletarProduto(id) {
  const { error } = await supabase
    .from('produtos')
    .update({ ativo: false })
    .eq('id', id)
  if (error) throw error
}

// ─── ETIQUETAS ─────────────────────────────────────────────────────────────

export async function getEtiquetas(filtros = {}) {
  let query = supabase
    .from('etiquetas')
    .select(`*, produto:produtos(nome, grupo, ingredientes, conservacao)`)
    .order('criado_em', { ascending: false })

  if (filtros.status)      query = query.eq('status', filtros.status)
  if (filtros.produto_id)  query = query.eq('produto_id', filtros.produto_id)
  if (filtros.dataInicio)  query = query.gte('data_abertura', filtros.dataInicio)
  if (filtros.dataFim)     query = query.lte('data_abertura', filtros.dataFim)
  if (filtros.limit)       query = query.limit(filtros.limit)

  const { data, error } = await query
  if (error) return getEtiquetasLocal()
  return data
}

export async function criarEtiqueta(etiqueta) {
  // Buscar próximo número de etiqueta
  const { data: ultimo } = await supabase
    .from('etiquetas')
    .select('numero')
    .order('numero', { ascending: false })
    .limit(1)
    .single()

  const numero = (ultimo?.numero || 0) + 1

  const { data, error } = await supabase
    .from('etiquetas')
    .insert({
      ...etiqueta,
      numero,
      status: 'ativa',
      criado_em: new Date().toISOString()
    })
    .select()
    .single()

  if (error) {
    // Salvar offline para sync posterior
    salvarEtiquetaOffline({ ...etiqueta, numero, status: 'ativa' })
    throw error
  }
  return data
}

export async function baixarEtiqueta(id, motivo = 'descarte') {
  const { data: etiqueta } = await supabase
    .from('etiquetas')
    .select('*')
    .eq('id', id)
    .single()

  // Atualizar status da etiqueta
  const { error } = await supabase
    .from('etiquetas')
    .update({ status: 'descartada', baixado_em: new Date().toISOString() })
    .eq('id', id)

  if (error) throw error

  // Registrar no relatório de descartes
  if (etiqueta) {
    await supabase.from('descartes').insert({
      etiqueta_id: id,
      produto_id: etiqueta.produto_id,
      operador: etiqueta.operador,
      motivo,
      data_descarte: new Date().toISOString()
    })
  }
}

export async function vencerEtiquetasExpiradas() {
  const hoje = new Date().toISOString().split('T')[0]
  const { error } = await supabase
    .from('etiquetas')
    .update({ status: 'vencida' })
    .eq('status', 'ativa')
    .lt('data_validade', hoje)
  if (error) console.error('Erro ao vencer etiquetas:', error)
}

// ─── DESCARTES / RELATÓRIO ─────────────────────────────────────────────────

export async function getDescartes(filtros = {}) {
  let query = supabase
    .from('descartes')
    .select(`*, produto:produtos(nome, grupo)`)
    .order('data_descarte', { ascending: false })

  if (filtros.dataInicio) query = query.gte('data_descarte', filtros.dataInicio)
  if (filtros.dataFim)    query = query.lte('data_descarte', filtros.dataFim)

  const { data, error } = await query
  if (error) return []
  return data
}

export async function getResumoDescartes(dias = 30) {
  const inicio = new Date()
  inicio.setDate(inicio.getDate() - dias)

  const { data, error } = await supabase
    .from('descartes')
    .select(`*, produto:produtos(nome, grupo)`)
    .gte('data_descarte', inicio.toISOString())

  if (error) return { total: 0, porProduto: [], porDia: [] }

  // Agrupar por produto
  const porProduto = {}
  const porDia = {}

  for (const d of data) {
    const nome = d.produto?.nome || 'Desconhecido'
    porProduto[nome] = (porProduto[nome] || 0) + 1

    const dia = d.data_descarte.split('T')[0]
    porDia[dia] = (porDia[dia] || 0) + 1
  }

  return {
    total: data.length,
    porProduto: Object.entries(porProduto)
      .map(([nome, qtd]) => ({ nome, qtd }))
      .sort((a, b) => b.qtd - a.qtd),
    porDia: Object.entries(porDia)
      .map(([dia, qtd]) => ({ dia, qtd }))
      .sort((a, b) => a.dia.localeCompare(b.dia))
  }
}

// ─── OPERADORES ─────────────────────────────────────────────────────────────

export async function getOperadores() {
  const { data, error } = await supabase
    .from('operadores')
    .select('*')
    .eq('ativo', true)
    .order('nome')
  if (error) return getOperadoresLocal()
  salvarLocal('operadores', data)
  return data
}

export async function salvarOperador(op) {
  if (op.id) {
    const { data, error } = await supabase
      .from('operadores')
      .update(op)
      .eq('id', op.id)
      .select().single()
    if (error) throw error
    return data
  } else {
    const { data, error } = await supabase
      .from('operadores')
      .insert({ ...op, ativo: true })
      .select().single()
    if (error) throw error
    return data
  }
}

export async function validarPinOperador(pin) {
  const { data, error } = await supabase
    .from('operadores')
    .select('*')
    .eq('pin', pin)
    .eq('ativo', true)
    .single()
  if (error || !data) return null
  return data
}

// ─── OFFLINE HELPERS ───────────────────────────────────────────────────────

function salvarLocal(chave, dados) {
  try { localStorage.setItem(`etiqpro_${chave}`, JSON.stringify(dados)) } catch {}
}

function getProdutosLocal() {
  try { return JSON.parse(localStorage.getItem('etiqpro_produtos') || '[]') } catch { return [] }
}

function getEtiquetasLocal() {
  try { return JSON.parse(localStorage.getItem('etiqpro_etiquetas') || '[]') } catch { return [] }
}

function getOperadoresLocal() {
  try { return JSON.parse(localStorage.getItem('etiqpro_operadores') || '[]') } catch { return [] }
}

function salvarEtiquetaOffline(etiqueta) {
  try {
    const fila = JSON.parse(localStorage.getItem('etiqpro_fila_offline') || '[]')
    fila.push({ ...etiqueta, _offline: true, _ts: Date.now() })
    localStorage.setItem('etiqpro_fila_offline', JSON.stringify(fila))
  } catch {}
}

export async function sincronizarOffline() {
  try {
    const fila = JSON.parse(localStorage.getItem('etiqpro_fila_offline') || '[]')
    if (!fila.length) return 0
    let sincronizados = 0
    for (const item of fila) {
      const { _offline, _ts, ...etiqueta } = item
      const { error } = await supabase.from('etiquetas').insert(etiqueta)
      if (!error) sincronizados++
    }
    if (sincronizados === fila.length) {
      localStorage.removeItem('etiqpro_fila_offline')
    }
    return sincronizados
  } catch { return 0 }
}
