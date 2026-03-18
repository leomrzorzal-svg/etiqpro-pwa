import { Router } from 'express'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { prisma } from '../../database/client'
import { asyncHandler } from '../../middleware/asyncHandler'
import { AppError } from '../../utils/AppError'

export const authRouter = Router()

authRouter.post('/login', asyncHandler(async (req, res) => {
  const schema = z.object({
    login: z.string(),
    senha: z.string()
  })

  const { login, senha } = schema.parse(req.body)
  const usuario = await prisma.usuario.findUnique({ where: { login } })

  if (!usuario || !usuario.ativo) throw new AppError('Usuário não encontrado', 401)

  const senhaOk = await bcrypt.compare(senha, usuario.senha_hash)
  if (!senhaOk) throw new AppError('Senha incorreta', 401)

  const token = jwt.sign(
    { id: usuario.id, nome: usuario.nome, perfil: usuario.perfil },
    process.env.JWT_SECRET || 'secret',
    { expiresIn: '12h' }
  )

  res.json({ token, usuario: { id: usuario.id, nome: usuario.nome, perfil: usuario.perfil } })
}))
