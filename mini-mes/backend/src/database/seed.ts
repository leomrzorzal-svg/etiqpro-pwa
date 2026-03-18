/**
 * Seed inicial com dados da La Miguelita Salgados
 */
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('Iniciando seed...')

  // =============================================
  // Usuários
  // =============================================
  await prisma.usuario.upsert({
    where: { login: 'admin' },
    update: {},
    create: {
      nome: 'Administrador',
      login: 'admin',
      senha_hash: await bcrypt.hash('admin123', 10),
      perfil: 'ADMIN'
    }
  })

  await prisma.usuario.upsert({
    where: { login: 'supervisora' },
    update: {},
    create: {
      nome: 'Supervisora',
      login: 'supervisora',
      senha_hash: await bcrypt.hash('super123', 10),
      perfil: 'SUPERVISORA'
    }
  })

  await prisma.usuario.upsert({
    where: { login: 'operador1' },
    update: {},
    create: {
      nome: 'Operador 1',
      login: 'operador1',
      senha_hash: await bcrypt.hash('op123', 10),
      perfil: 'OPERADOR'
    }
  })

  // =============================================
  // Ingredientes
  // =============================================
  const ingredientes = [
    { nome: 'Massa de coxinha', unidade_medida: 'KG', custo_unitario: 8.50 },
    { nome: 'Frango desfiado', unidade_medida: 'KG', custo_unitario: 18.00 },
    { nome: 'Catupiry', unidade_medida: 'KG', custo_unitario: 22.00 },
    { nome: 'Massa de bauru', unidade_medida: 'KG', custo_unitario: 7.80 },
    { nome: 'Presunto fatiado', unidade_medida: 'KG', custo_unitario: 24.00 },
    { nome: 'Queijo mussarela', unidade_medida: 'KG', custo_unitario: 28.00 },
    { nome: 'Massa de pastel', unidade_medida: 'KG', custo_unitario: 6.50 },
    { nome: 'Carne moída', unidade_medida: 'KG', custo_unitario: 32.00 },
    { nome: 'Massa de quibe', unidade_medida: 'KG', custo_unitario: 9.00 },
    { nome: 'Recheio de quibe', unidade_medida: 'KG', custo_unitario: 28.00 },
    { nome: 'Massa de esfirra', unidade_medida: 'KG', custo_unitario: 7.20 },
    { nome: 'Carne temperada', unidade_medida: 'KG', custo_unitario: 30.00 },
    { nome: 'Óleo de soja', unidade_medida: 'LITROS', custo_unitario: 7.00 },
    { nome: 'Sal', unidade_medida: 'KG', custo_unitario: 1.50 },
    { nome: 'Tempero verde', unidade_medida: 'KG', custo_unitario: 12.00 },
  ]

  const ingMap: Record<string, string> = {}
  for (const ing of ingredientes) {
    const criado = await prisma.ingrediente.upsert({
      where: { codigo_erp: ing.nome.toLowerCase().replace(/ /g, '_') },
      update: { custo_unitario: ing.custo_unitario },
      create: {
        ...ing,
        unidade_medida: ing.unidade_medida as any,
        codigo_erp: ing.nome.toLowerCase().replace(/ /g, '_')
      }
    })
    ingMap[ing.nome] = criado.id
  }

  // =============================================
  // Produtos
  // =============================================
  const produtos = [
    {
      nome: 'Coxinha Frango Catupiry',
      categoria: 'Massa Frita',
      tipo_producao: 'FRITO',
      maquina_permitida: ['MCI'],
      peso_unitario_g: 80,
      unidades_por_caixa: 50,
      peso_caixa_padrao_kg: 4.0,
      tolerancia_peso_pct: 5.0,
      lote_ideal: 300,
      lote_maximo_batida: 500,
      tempo_medio_min: 35,
      instrucoes: [
        { ordem: 1, titulo: 'Preparar massa', descricao: 'Aquecer massa até temperatura ambiente. Verificar consistência - deve estar macia e homogênea.' },
        { ordem: 2, titulo: 'Montar coxinhas', descricao: 'Pesar 80g de massa. Abrir na palma da mão. Colocar 30g de recheio no centro. Fechar modelando no formato cônico.' },
        { ordem: 3, titulo: 'Empanar', descricao: 'Passar na farinha de rosca. Garantir cobertura uniforme.' },
        { ordem: 4, titulo: 'Fritar (MCI)', descricao: 'Temperatura do óleo: 175-180°C. Tempo: 4-5 minutos. Cor dourada. Escorrer bem.' },
      ],
      ingredientes: [
        { nome: 'Massa de coxinha', qty: 24, unidade: 'KG' },
        { nome: 'Frango desfiado', qty: 9, unidade: 'KG' },
        { nome: 'Catupiry', qty: 3, unidade: 'KG' },
        { nome: 'Óleo de soja', qty: 5, unidade: 'LITROS' },
      ]
    },
    {
      nome: 'Bauru Presunto Queijo',
      categoria: 'Massa Assada',
      tipo_producao: 'ASSADO',
      maquina_permitida: ['USIFOOD_1', 'USIFOOD_2'],
      peso_unitario_g: 90,
      unidades_por_caixa: 40,
      peso_caixa_padrao_kg: 3.6,
      tolerancia_peso_pct: 5.0,
      lote_ideal: 500,
      lote_maximo_batida: 500,
      tempo_medio_min: 40,
      instrucoes: [
        { ordem: 1, titulo: 'Abrir massa', descricao: 'Abrir massa em espessura de 3mm usando cilindro.' },
        { ordem: 2, titulo: 'Cortar e rechear', descricao: 'Cortar retângulos 15x10cm. Colocar 25g presunto + 25g queijo.' },
        { ordem: 3, titulo: 'Enrolar e fechar', descricao: 'Enrolar firmemente. Pressionar bordas para fechar.' },
        { ordem: 4, titulo: 'Assar (Usifood)', descricao: 'Temperatura: 200°C. Tempo: 18-20 minutos. Até dourar.' },
      ],
      ingredientes: [
        { nome: 'Massa de bauru', qty: 45, unidade: 'KG' },
        { nome: 'Presunto fatiado', qty: 12.5, unidade: 'KG' },
        { nome: 'Queijo mussarela', qty: 12.5, unidade: 'KG' },
      ]
    },
    {
      nome: 'Quibe',
      categoria: 'Massa Frita',
      tipo_producao: 'FRITO',
      maquina_permitida: ['MCI'],
      peso_unitario_g: 70,
      unidades_por_caixa: 60,
      peso_caixa_padrao_kg: 4.2,
      tolerancia_peso_pct: 5.0,
      lote_ideal: 400,
      lote_maximo_batida: 400,
      tempo_medio_min: 30,
      instrucoes: [
        { ordem: 1, titulo: 'Preparar massa', descricao: 'Misturar trigo fino com carne temperada. Consistência firme.' },
        { ordem: 2, titulo: 'Modelar', descricao: 'Pesar 70g. Modelar no formato oval (fusiforme).' },
        { ordem: 3, titulo: 'Fritar (MCI)', descricao: 'Temperatura: 180°C. Tempo: 5-6 minutos. Cor marrom dourado.' },
      ],
      ingredientes: [
        { nome: 'Massa de quibe', qty: 28, unidade: 'KG' },
        { nome: 'Recheio de quibe', qty: 5, unidade: 'KG' },
        { nome: 'Óleo de soja', qty: 4, unidade: 'LITROS' },
      ]
    },
    {
      nome: 'Esfirra',
      categoria: 'Massa Assada',
      tipo_producao: 'MANUAL',
      maquina_permitida: ['MESA_1', 'MESA_2', 'MESA_3'],
      peso_unitario_g: 60,
      unidades_por_caixa: 50,
      peso_caixa_padrao_kg: 3.0,
      tolerancia_peso_pct: 8.0,
      lote_ideal: 200,
      lote_maximo_batida: 200,
      tempo_medio_min: 45,
      instrucoes: [
        { ordem: 1, titulo: 'Abrir massa', descricao: 'Bolear 40g de massa. Abrir em círculo de 10cm.' },
        { ordem: 2, titulo: 'Rechear', descricao: 'Colocar 20g de carne temperada no centro.' },
        { ordem: 3, titulo: 'Fechar', descricao: 'Dobrar as bordas em triângulo. Beliscar firme.' },
        { ordem: 4, titulo: 'Assar no forno', descricao: 'Forno 220°C por 15-18 minutos até dourar.' },
      ],
      ingredientes: [
        { nome: 'Massa de esfirra', qty: 8, unidade: 'KG' },
        { nome: 'Carne temperada', qty: 4, unidade: 'KG' },
      ]
    },
  ]

  for (const prod of produtos) {
    const { instrucoes, ingredientes: ings, ...dadosProd } = prod

    const produto = await prisma.produto.upsert({
      where: { codigo_erp: prod.nome.toLowerCase().replace(/ /g, '_') },
      update: {},
      create: {
        ...dadosProd,
        tipo_producao: dadosProd.tipo_producao as any,
        maquina_permitida: dadosProd.maquina_permitida as any,
        codigo_erp: prod.nome.toLowerCase().replace(/ /g, '_'),
        instrucoes: { createMany: { data: instrucoes } }
      }
    })

    // Criar receita
    const existeReceita = await prisma.receita.findUnique({ where: { produto_id: produto.id } })
    if (!existeReceita) {
      await prisma.receita.create({
        data: {
          produto_id: produto.id,
          rendimento: dadosProd.lote_ideal * dadosProd.peso_unitario_g / 1000,
          ingredientes: {
            createMany: {
              data: ings
                .filter(i => ingMap[i.nome])
                .map(i => ({
                  ingrediente_id: ingMap[i.nome],
                  quantidade: i.qty,
                  unidade: i.unidade as any
                }))
            }
          }
        }
      })
    }
  }

  // =============================================
  // Base de conhecimento da IA
  // =============================================
  const conhecimentos = [
    {
      categoria: 'RECEITA',
      titulo: 'Pesos dos produtos',
      conteudo: `Coxinha Frango Catupiry: 80g por unidade, 50 unidades por caixa
Bauru Presunto Queijo: 90g por unidade, 40 unidades por caixa
Quibe: 70g por unidade, 60 unidades por caixa
Esfirra: 60g por unidade, 50 unidades por caixa
Pastel Carne: 100g por unidade, 30 unidades por caixa`,
      tags: ['peso', 'unidades', 'caixa']
    },
    {
      categoria: 'EQUIPAMENTO',
      titulo: 'Temperatura de fritura - MCI',
      conteudo: `Temperatura correta para fritura na MCI: 175-180°C
- Coxinha: 175°C por 4-5 minutos
- Quibe: 180°C por 5-6 minutos
- Pastel: 175°C por 3-4 minutos
ATENÇÃO: Nunca fritar com óleo abaixo de 170°C (produto fica encharcado) nem acima de 190°C (queima por fora, cru por dentro)`,
      tags: ['temperatura', 'fritura', 'MCI', 'óleo']
    },
    {
      categoria: 'EQUIPAMENTO',
      titulo: 'Temperatura de forno - Usifood',
      conteudo: `Temperatura padrão Usifood: 200-210°C
- Bauru: 200°C por 18-20 minutos
- Croissant: 190°C por 15-18 minutos
Verificar cor dourada uniforme antes de retirar.`,
      tags: ['temperatura', 'forno', 'Usifood', 'assado']
    },
    {
      categoria: 'HIGIENE',
      titulo: 'Procedimento de higiene das mãos',
      conteudo: `Lavar as mãos SEMPRE:
1. Antes de iniciar a produção
2. Após usar o banheiro
3. Após tocar em lixo ou superfície contaminada
4. Após comer ou beber
5. Após manipular embalagens
Procedimento: molhar, ensaboar por 20 segundos, enxaguar, secar com papel toalha descartável.`,
      tags: ['higiene', 'mãos', 'lavagem']
    },
    {
      categoria: 'BOAS_PRATICAS',
      titulo: 'Controle de temperatura dos ingredientes',
      conteudo: `- Recheios devem estar resfriados (máximo 5°C) durante a montagem
- Massa deve estar em temperatura ambiente para modelagem
- Nunca deixar recheio de frango fora da geladeira por mais de 2 horas
- Verificar temperatura da câmara fria diariamente (deve estar entre 2-4°C)`,
      tags: ['temperatura', 'ingredientes', 'câmara fria', 'segurança alimentar']
    },
  ]

  for (const c of conhecimentos) {
    await prisma.conhecimentoIA.upsert({
      where: { id: c.titulo },
      update: { conteudo: c.conteudo },
      create: c
    })
  }

  console.log('Seed concluído!')
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
