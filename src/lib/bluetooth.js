// ── Bluetooth para impressora térmica WKDY-80D ────────────────────────────
// UUIDs comuns de impressoras térmicas BLE
const BT_SERVICES = [
  '000018f0-0000-1000-8000-00805f9b34fb',
  'e7810a71-73ae-499d-8c15-faa9aef0c3f2',
  '49535343-fe7d-4ae5-8fa9-9fafd205e455',
  '6e400001-b5a3-f393-e0a9-e50e24dcca9e',
]
const BT_CHARS = [
  '00002af1-0000-1000-8000-00805f9b34fb',
  'bef8d6c9-9c21-4c9e-b632-bd58c1009f9f',
  '49535343-8841-43f4-a8d4-ecbe34729bb3',
  '6e400002-b5a3-f393-e0a9-e50e24dcca9e',
]

export function btSupported() {
  return !!(navigator.bluetooth)
}

// ── RawBT (app Android) via CPCL ─────────────────────────────────────────
// CPCL é o protocolo que a WKDY-80D aceita via Bluetooth
// URI formato correto: rawbt://print?base64=DATA

function toBase64(uint8array) {
  let binary = ''
  for (let i = 0; i < uint8array.length; i++) {
    binary += String.fromCharCode(uint8array[i])
  }
  return btoa(binary)
}

function strToBase64(str) {
  return toBase64(new TextEncoder().encode(str))
}

function normCpcl(str) {
  if (!str) return ''
  return String(str)
    .replace(/°C/g, ' grau')
    .replace(/°/g, ' grau')
    .replace(/[áàâãä]/g, 'a').replace(/[ÁÀÂÃÄ]/g, 'A')
    .replace(/[éèêë]/g, 'e').replace(/[ÉÈÊË]/g, 'E')
    .replace(/[íìîï]/g, 'i').replace(/[ÍÌÎÏ]/g, 'I')
    .replace(/[óòôõö]/g, 'o').replace(/[ÓÒÔÕÖ]/g, 'O')
    .replace(/[úùûü]/g, 'u').replace(/[ÚÙÛÜ]/g, 'U')
    .replace(/ç/g, 'c').replace(/Ç/g, 'C')
    .replace(/[^\x20-\x7E]/g, '?')
}

function fdtCpcl(s) {
  if (!s) return '--/--/----'
  const p = s.split('-')
  return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : s
}

function buildCpcl(h, qty = 1) {
  const agora = new Date()
  const hora  = agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })

  // Centraliza o nome na largura útil (~640 dots conservador para etiqueta 10cm)
  // font4 = 16 dots/char, SETMAG 1 3 não altera largura
  function cx(text) {
    const w = Math.min(text.length, 40) * 16
    return Math.max(10, Math.floor((640 - w) / 2))
  }

  const lines = [`! 0 200 200 400 ${qty}`]
  let y = 12

  // ── OPÇÃO 1 ────────────────────────────────────────────────────────────
  // Nome do produto: 3× altura, negrito, centralizado
  const prod = normCpcl(h.prod || h.produto || '').toUpperCase()
  lines.push('SETMAG 1 3')
  lines.push('SETBOLD 1')
  lines.push(`TEXT 4 0 ${cx(prod)} ${y} ${prod}`)
  lines.push('SETBOLD 0')
  lines.push('SETMAG 1 1')
  y += 82   // 72 dots (3×24) + 10 margem

  // Grupo: fonte normal pequena, discreta — não compete com o nome
  if (h.grp) {
    lines.push(`TEXT 4 0 15 ${y} ${normCpcl(h.grp)}`)
    y += 28
  }

  // Separador
  lines.push(`TEXT 4 0 10 ${y} ----------------------------------------`)
  y += 28

  // Corpo: 2× altura para leitura fácil
  lines.push('SETMAG 1 2')
  lines.push(`TEXT 4 0 10 ${y} Abertura : ${fdtCpcl(h.manip || h.fabricacao)}`);  y += 46
  lines.push(`TEXT 4 0 10 ${y} Validade : ${fdtCpcl(h.val || h.validade)}`)
  if (h.peso) lines.push(`TEXT 4 0 480 ${y} ${normCpcl(h.peso)}`)
  y += 46
  if (h.conserv && y < 358) { lines.push(`TEXT 4 0 10 ${y} ${normCpcl(h.conserv)}`);                              y += 46 }
  if (h.op      && y < 358) { lines.push(`TEXT 4 0 10 ${y} Operador : ${normCpcl(h.op || h.operador || '')}`);    y += 46 }
  if (h.obs     && y < 358) { lines.push(`TEXT 4 0 10 ${y} ${normCpcl(h.obs)}`);                                  y += 46 }

  // Rodapé: tamanho normal — hora + número da etiqueta
  lines.push('SETMAG 1 1')
  if (y < 388) {
    const num = normCpcl(h.num || '')
    lines.push(`TEXT 4 0 10 ${y} ${hora}${num ? '   ' + num : ''}`)
  }

  lines.push('FORM')
  lines.push('PRINT')
  return lines.join('\r\n') + '\r\n'
}

function sendRawBT(text) {
  const a = document.createElement('a')
  a.href = 'rawbt:' + encodeURIComponent(text)
  a.style.display = 'none'
  document.body.appendChild(a)
  a.click()
  setTimeout(() => { if (a.parentNode) a.parentNode.removeChild(a) }, 1000)
}

function center(str, w) {
  const s = String(str).slice(0, w)
  const pad = Math.max(0, Math.floor((w - s.length) / 2))
  return ' '.repeat(pad) + s
}

function buildPlainText(h) {
  const n = normCpcl
  const f = fdtCpcl
  const W = 32
  const SEP = '================================'
  const DIV = '--------------------------------'
  const prod   = n(h.prod || h.produto || '').toUpperCase()
  const grp    = n(h.grp || '')
  const ab     = f(h.manip || h.fabricacao)
  const val    = f(h.val || h.validade)
  const conserv= n(h.conserv || h.temp || '')
  const peso   = n(h.peso || '')
  const op     = n(h.op || h.operador || '')
  const num    = n(String(h.num || ''))
  const obs    = n(h.obs || '')
  const agora  = new Date()
  const hora   = agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  const hoje   = agora.toLocaleDateString('pt-BR')

  const L = []

  // ── Nome do produto ──
  L.push(SEP)
  for (let i = 0; i < prod.length; i += W) {
    L.push(center(prod.slice(i, i + W), W))
  }
  L.push(SEP)

  // ── Datas e info principal ──
  L.push('')
  if (grp)    L.push(`  Grupo    : ${grp}`)
  L.push(`  ABERTURA : ${ab}`)
  L.push(`  VALIDADE : ${val}`)
  if (peso)   L.push(`  Peso     : ${peso}`)
  if (conserv)L.push(`  ${conserv}`)
  if (obs)    L.push(`  ${obs}`)
  L.push('')

  // ── Rodapé compacto ──
  L.push(DIV)
  L.push(center(`${op}  ${num}`, W))
  L.push(center(`${hoje} ${hora}`, W))
  L.push(SEP)

  return L.join('\r\n') + '\r\n'
}

export function printViaRawBT(h) {
  const lista = Array.isArray(h) ? h : [h]
  const content = Array.from({ length: lista.length }, () => buildPlainText(lista[0])).join('\x0C')
  sendRawBT(content)
}

// ── Impressão BLE direta via CPCL ─────────────────────────────────────────
// Envia CPCL direto para a impressora via BLE — sem RawBT, sem intermediário.
// O header "! 0 200 200 400 N" faz a impressora imprimir N cópias automaticamente.
export async function printLabelsCpcl(char, h, qty = 1) {
  const cpcl = buildCpcl(h, qty)
  const bytes = new TextEncoder().encode(cpcl)
  await writeChunked(char, bytes)
}

export function testViaRawBT() {
  const texto = [
    '================================',
    '          etiqPRO',
    '       IMPRESSORA OK!',
    '================================',
    `Data: ${new Date().toLocaleString('pt-BR')}`,
    '================================',
    ''
  ].join('\r\n')
  sendRawBT(texto)
}

// Imprime linhas numeradas para calibrar altura da etiqueta.
// O usuário olha qual número aparece NO TOPO da 2ª etiqueta — esse é o LABEL_HEIGHT correto.
export function calibratePrint() {
  const lines = []
  for (let i = 1; i <= 80; i++) {
    lines.push('Linha ' + String(i).padStart(2, '0') + ' ---------------')
  }
  sendRawBT(lines.join('\r\n') + '\r\n')
}

export async function connectPrinter() {
  const device = await navigator.bluetooth.requestDevice({
    acceptAllDevices: true,
    optionalServices: BT_SERVICES,
  })
  const server = await device.gatt.connect()
  let char = null

  // 1ª tentativa: UUIDs conhecidos com verificação de permissão de escrita
  for (const svcUuid of BT_SERVICES) {
    if (char) break
    try {
      const svc = await server.getPrimaryService(svcUuid)
      for (const charUuid of BT_CHARS) {
        try {
          const c = await svc.getCharacteristic(charUuid)
          if (c.properties.write || c.properties.writeWithoutResponse) {
            char = c; break
          }
        } catch {}
      }
    } catch {}
  }

  // 2ª tentativa: varre TODOS os serviços e pega qualquer característica escrita
  if (!char) {
    for (const svcUuid of BT_SERVICES) {
      if (char) break
      try {
        const svc = await server.getPrimaryService(svcUuid)
        const all = await svc.getCharacteristics()
        for (const c of all) {
          if (c.properties.write || c.properties.writeWithoutResponse) {
            char = c; break
          }
        }
      } catch {}
    }
  }

  if (!char) throw new Error('Nenhuma característica de escrita encontrada. Verifique se a impressora suporta BLE.')
  return { device, char }
}

// ── ESC/POS builder ───────────────────────────────────────────────────────
// Etiqueta: 50mm largura (papel) × 100mm altura (feed)
// Fonte normal em 50mm ≈ 24 caracteres por linha

const ENC = new TextEncoder()

// Normaliza acentos para impressoras sem suporte a UTF-8
function norm(str) {
  if (!str) return ''
  return str
    .replace(/[áàâãä]/g, 'a').replace(/[ÁÀÂÃÄ]/g, 'A')
    .replace(/[éèêë]/g, 'e').replace(/[ÉÈÊË]/g, 'E')
    .replace(/[íìîï]/g, 'i').replace(/[ÍÌÎÏ]/g, 'I')
    .replace(/[óòôõö]/g, 'o').replace(/[ÓÒÔÕÖ]/g, 'O')
    .replace(/[úùûü]/g, 'u').replace(/[ÚÙÛÜ]/g, 'U')
    .replace(/ç/g, 'c').replace(/Ç/g, 'C')
    .replace(/ñ/g, 'n').replace(/Ñ/g, 'N')
}

function line(str, wrap = 24) {
  const s = norm(str)
  const result = []
  for (let i = 0; i < s.length; i += wrap) {
    result.push(...ENC.encode(s.slice(i, i + wrap)), 0x0A)
  }
  if (result.length === 0) result.push(0x0A)
  return result
}

function divider(char = '-', len = 24) { return [...ENC.encode(char.repeat(len)), 0x0A] }

export function buildEscPos(h) {
  const fdt = s => { if (!s) return '--/--/----'; const p = s.split('-'); return `${p[2]}/${p[1]}/${p[0]}` }
  const bytes = []
  const push = (...b) => bytes.push(...b)

  // Init + código de página PC850 (suporte a acentos básicos)
  push(0x1B, 0x40)
  push(0x1B, 0x74, 0x02)
  // Espaço entre linhas reduzido para caber na etiqueta de 100mm
  push(0x1B, 0x33, 0x18)
  // Centralizado
  push(0x1B, 0x61, 0x01)
  // Negrito + dupla altura/largura
  push(0x1B, 0x21, 0x38)
  push(...ENC.encode('etiqPRO'), 0x0A)
  // Normal
  push(0x1B, 0x21, 0x00)
  push(...divider('='))
  // Alinhamento esquerda
  push(0x1B, 0x61, 0x00)
  // Negrito
  push(0x1B, 0x45, 0x01)
  push(...line(h.prod))
  push(0x1B, 0x45, 0x00)
  push(...line(`Grupo: ${h.grp}`))
  push(...divider())
  push(...line(`Abertura : ${fdt(h.manip)}`))
  push(...line(`Validade : ${h.val ? fdt(h.val) : 'Nao definida'}`))
  if (h.peso) push(...line(`Peso     : ${h.peso}`))
  push(...line(`Operador : ${h.op}`))
  push(...line(`Num      : ${h.num}`))
  if (h.conserv) { push(...divider()); push(...line(h.conserv)) }
  if (h.ingr) { push(...divider()); push(...line('Ingredientes:')); push(...line(h.ingr)) }
  if (h.obs) { push(...divider()); push(...line(h.obs)) }
  // Centralizado + rodapé
  push(0x1B, 0x61, 0x01)
  push(...divider('='))
  push(...ENC.encode(norm(new Date().toLocaleString('pt-BR'))), 0x0A)
  // Avança papel e corta (corte total)
  push(0x1B, 0x64, 0x04)
  push(0x1D, 0x56, 0x00)

  return new Uint8Array(bytes)
}

// Escreve dados no BLE em chunks com delay para não perder dados
async function writeChunked(char, data, chunkSize = 20, delayMs = 80) {
  for (let i = 0; i < data.length; i += chunkSize) {
    const chunk = data.slice(i, i + chunkSize)
    // writeValue é o mais compatível (aceito por todos os dispositivos)
    try {
      await char.writeValue(chunk)
    } catch {
      try {
        await char.writeValueWithoutResponse(chunk)
      } catch {
        await char.writeValueWithResponse(chunk)
      }
    }
    if (i + chunkSize < data.length) {
      await new Promise(r => setTimeout(r, delayMs))
    }
  }
}

// Teste mínimo: texto puro sem ESC/POS — confirma se dados chegam à impressora
export async function simplePrintTest(char) {
  const enc = new TextEncoder()
  const bytes = []
  bytes.push(...enc.encode('etiqPRO TESTE'), 0x0A)
  bytes.push(...enc.encode('Impressora OK'), 0x0A)
  bytes.push(0x0A, 0x0A, 0x0A)
  await writeChunked(char, new Uint8Array(bytes))
}

export async function testPrint(char) {
  const bytes = []
  bytes.push(0x1B, 0x40)
  bytes.push(0x1B, 0x61, 0x01)
  bytes.push(0x1B, 0x21, 0x38)
  bytes.push(...ENC.encode('etiqPRO'), 0x0A)
  bytes.push(0x1B, 0x21, 0x00)
  bytes.push(...ENC.encode('Impressora OK!'), 0x0A)
  bytes.push(...ENC.encode(new Date().toLocaleString('pt-BR')), 0x0A)
  bytes.push(0x1B, 0x64, 0x04)
  bytes.push(0x1D, 0x56, 0x00)
  await writeChunked(char, new Uint8Array(bytes))
}

export async function printLabel(char, h) {
  await writeChunked(char, buildEscPos(h))
}
