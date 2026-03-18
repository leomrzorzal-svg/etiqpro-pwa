import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import { createServer } from 'http'
import { Server as SocketIOServer } from 'socket.io'
import dotenv from 'dotenv'

import { authRouter } from './modules/auth/auth.routes'
import { produtosRouter } from './modules/products/products.routes'
import { ingredientesRouter } from './modules/ingredients/ingredients.routes'
import { planejamentoRouter } from './modules/planning/planning.routes'
import { ordensRouter } from './modules/orders/orders.routes'
import { batidasRouter } from './modules/batches/batches.routes'
import { balancaRouter } from './modules/scale/scale.routes'
import { custosRouter } from './modules/costs/costs.routes'
import { dashboardRouter } from './modules/dashboard/dashboard.routes'
import { iaRouter } from './modules/ai-assistant/ai.routes'
import { errorHandler } from './middleware/errorHandler'
import { authMiddleware } from './middleware/auth'
import { setupSocketIO } from './integrations/scale/socket'
import { logger } from './utils/logger'

dotenv.config()

const app = express()
const httpServer = createServer(app)

// Socket.IO para tempo real (balança, status produção)
const io = new SocketIOServer(httpServer, {
  cors: { origin: process.env.FRONTEND_URL || 'http://localhost:3000', credentials: true }
})

setupSocketIO(io)

// Middlewares globais
app.use(helmet())
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:3000', credentials: true }))
app.use(morgan('combined'))
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))

// Health check
app.get('/health', (_, res) => res.json({ status: 'ok', service: 'mini-mes-api', version: '1.0.0' }))

// Rotas públicas
app.use('/api/auth', authRouter)

// Rotas protegidas
app.use('/api/produtos', authMiddleware, produtosRouter)
app.use('/api/ingredientes', authMiddleware, ingredientesRouter)
app.use('/api/planejamento', authMiddleware, planejamentoRouter)
app.use('/api/ordens', authMiddleware, ordensRouter)
app.use('/api/batidas', authMiddleware, batidasRouter)
app.use('/api/balanca', authMiddleware, balancaRouter)
app.use('/api/custos', authMiddleware, custosRouter)
app.use('/api/dashboard', authMiddleware, dashboardRouter)
app.use('/api/ia', authMiddleware, iaRouter)

// Error handler global
app.use(errorHandler)

const PORT = process.env.PORT || 3001
httpServer.listen(PORT, () => {
  logger.info(`Mini MES API rodando na porta ${PORT}`)
})

export { io }
