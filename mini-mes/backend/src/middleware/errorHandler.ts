import { Request, Response, NextFunction } from 'express'
import { ZodError } from 'zod'
import { AppError } from '../utils/AppError'
import { logger } from '../utils/logger'

export function errorHandler(err: any, req: Request, res: Response, _next: NextFunction) {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({ error: err.message })
  }

  if (err instanceof ZodError) {
    return res.status(400).json({
      error: 'Dados inválidos',
      detalhes: err.errors.map(e => ({ campo: e.path.join('.'), mensagem: e.message }))
    })
  }

  logger.error('Erro não tratado:', err)
  res.status(500).json({ error: 'Erro interno do servidor' })
}
