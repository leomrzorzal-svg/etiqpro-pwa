import { Server as SocketIOServer } from 'socket.io'
import { SerialPort } from 'serialport'
import { prisma } from '../../database/client'
import { logger } from '../../utils/logger'

let porta: SerialPort | null = null

export function setupSocketIO(io: SocketIOServer) {
  io.on('connection', (socket) => {
    logger.info(`Cliente conectado: ${socket.id}`)

    // Operador inicia pesagem
    socket.on('balanca:iniciar', async ({ batida_id, modo, dispositivo }) => {
      socket.join(`batida:${batida_id}`)
      socket.emit('balanca:status', { conectada: porta?.isOpen || false, modo })
    })

    // Pesagem manual (sem balança física)
    socket.on('balanca:pesagem_manual', async ({ batida_id, peso_kg, modo, num_caixas }) => {
      await registrarPesagem(io, batida_id, peso_kg, modo, num_caixas)
    })

    socket.on('disconnect', () => {
      logger.info(`Cliente desconectado: ${socket.id}`)
    })
  })

  // Tentar conectar balança serial
  iniciarBalancaSerial(io)
}

async function iniciarBalancaSerial(io: SocketIOServer) {
  const portaSerial = process.env.BALANCA_PORTA || 'COM3'
  const baudRate = parseInt(process.env.BALANCA_BAUD || '9600')

  try {
    porta = new SerialPort({ path: portaSerial, baudRate, autoOpen: false })
    let buffer = ''

    porta.on('data', (chunk: Buffer) => {
      buffer += chunk.toString()
      // Protocolo simples: leitura termina com \r\n
      if (buffer.includes('\r\n')) {
        const linhas = buffer.split('\r\n')
        buffer = linhas.pop() || ''

        for (const linha of linhas) {
          const peso = parseFloat(linha.replace(/[^\d.]/g, ''))
          if (!isNaN(peso) && peso > 0) {
            io.emit('balanca:leitura', { peso_kg: peso, timestamp: new Date().toISOString() })
          }
        }
      }
    })

    porta.on('error', (err) => {
      logger.warn(`Balança serial: ${err.message}`)
      io.emit('balanca:status', { conectada: false, erro: err.message })
    })

    porta.open((err) => {
      if (err) {
        logger.warn(`Não foi possível abrir balança em ${portaSerial}: ${err.message}`)
      } else {
        logger.info(`Balança conectada em ${portaSerial}`)
        io.emit('balanca:status', { conectada: true, porta: portaSerial })
      }
    })
  } catch (err) {
    logger.warn('Balança serial não disponível - usando modo manual')
  }
}

async function registrarPesagem(
  io: SocketIOServer,
  batida_id: string,
  peso_kg: number,
  modo: string,
  num_caixas?: number
) {
  try {
    const batida = await prisma.batida.findUnique({
      where: { id: batida_id },
      include: { ordem: { include: { produto: true } } }
    })

    if (!batida) return

    const produto = batida.ordem.produto
    let unidades_calc: number

    if (modo === 'POR_CAIXA') {
      // Peso / peso da caixa padrão * unidades por caixa
      unidades_calc = Math.round((peso_kg / produto.peso_caixa_padrao_kg) * produto.unidades_por_caixa)
    } else {
      // Peso acumulado / peso unitário
      unidades_calc = Math.round((peso_kg * 1000) / produto.peso_unitario_g)
    }

    const pesagem = await prisma.pesagemBalanca.create({
      data: { batida_id, modo, peso_kg, num_caixas, unidades_calc }
    })

    // Verificar tolerância
    const meta = batida.quantidade_meta
    const tolerancia = produto.tolerancia_peso_pct / 100
    const dentroTolerancia = Math.abs(unidades_calc - meta) / meta <= tolerancia

    io.to(`batida:${batida_id}`).emit('balanca:resultado', {
      pesagem_id: pesagem.id,
      peso_kg,
      unidades_calc,
      meta,
      dentro_tolerancia: dentroTolerancia,
      variacao_pct: Math.round(((unidades_calc - meta) / meta) * 100)
    })
  } catch (err) {
    logger.error('Erro ao registrar pesagem:', err)
  }
}
