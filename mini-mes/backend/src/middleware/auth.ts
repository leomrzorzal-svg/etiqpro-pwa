import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { AppError } from '../utils/AppError'

export function authMiddleware(req: Request, _res: Response, next: NextFunction) {
  const token = req.headers.authorization?.replace('Bearer ', '')
  if (!token) throw new AppError('Token não fornecido', 401)

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret')
    ;(req as any).user = decoded
    next()
  } catch {
    throw new AppError('Token inválido ou expirado', 401)
  }
}
