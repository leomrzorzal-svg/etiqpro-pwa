// ─── Fila offline — salva ações localmente e sincroniza quando voltar internet ─
const QUEUE_KEY = 'etiqpro_offline_queue'

export function addToQueue(action) {
  const queue = getQueue()
  queue.push({ ...action, ts: Date.now() })
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue))
}

export function getQueue() {
  try { return JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]') }
  catch { return [] }
}

export function clearQueue() {
  localStorage.setItem(QUEUE_KEY, '[]')
}

export async function syncQueue(db) {
  const queue = getQueue()
  if (queue.length === 0) return 0

  let synced = 0
  const failed = []

  for (const item of queue) {
    try {
      if (item.type === 'addEtiqueta')  await db.addEtiqueta(item.payload)
      if (item.type === 'addDescarte')  await db.addDescarte(item.payload)
      synced++
    } catch {
      failed.push(item)
    }
  }

  localStorage.setItem(QUEUE_KEY, JSON.stringify(failed))
  return synced
}
