import { useEffect, useState } from 'react'
import { io, Socket } from 'socket.io-client'

let socketInstance: Socket | null = null

export function useSocket(): Socket | null {
  const [socket, setSocket] = useState<Socket | null>(null)

  useEffect(() => {
    if (!socketInstance) {
      const token = localStorage.getItem('mes_token')
      socketInstance = io(process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:3001', {
        auth: { token },
        transports: ['websocket']
      })
    }

    setSocket(socketInstance)
    return () => {
      // Não desconectar ao desmontar componente — socket é global
    }
  }, [])

  return socket
}
