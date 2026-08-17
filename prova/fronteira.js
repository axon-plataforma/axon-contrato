// prova/fronteira.js — A TRAVA DE FRONTEIRA do @axon/contrato.
//
// Rodar: node prova/fronteira.js      (ou: npm run prova)
//
// POR QUE ELA EXISTE. Este pacote e PUBLICO. A seguranca disso nao vem de confiar
// em quem edita — vem de o pacote nao PODER carregar o que nao deve. Se um dia
// alguem acrescentar aqui uma regra de governanca, uma chave, uma consulta a banco
// ou um acesso a rede, isso vira codigo publico da plataforma inteira. Esta prova
// e o que faz esse acrescimo falhar em vez de passar despercebido.
//
// ESCRITA EM JS PURO, DE PROPOSITO: rodar a trava nao pode exigir instalar nada.
// Trava que depende de dependencia e trava que nao roda em maquina limpa.
//
// ---------------------------------------------------------------------------
// O QUE ELA GARANTE — e o que NAO garante. Ler antes de confiar.
//
// O pacote NAO e "so tipos e assinaturas": `SafeExecutor` tem 47 linhas de logica
// e `ToolRegistry` embrulha um Map. Uma trava que exigisse ausencia de codigo
// reprovaria o pacote no primeiro dia. A fronteira que ELA cobra e outra, e e
// verificavel:
//
//   GARANTE  superficie exportada fixa (5 nomes, lista fechada)
//   GARANTE  inventario de arquivos fixo (4 arquivos, lista fechada)
//   GARANTE  zero dependencias e zero imports de fora
//   GARANTE  zero capacidade de EFEITO: sem rede, disco, processo, banco, cripto
//   GARANTE  zero vocabulario de governanca (selo, cadeia, trail, tenant, lastro…)
//   GARANTE  teto de tamanho — crescimento silencioso vira vermelho
//   GARANTE  sha256 dos 3 arquivos de contrato
//
//   NAO GARANTE  que a logica existente esteja certa (isso e das provas dos
//                produtos que o consomem)
//   NAO GARANTE  que uma regra de governanca escrita SEM as palavras vedadas
//                passe despercebida — o teto de tamanho e a lista de arquivos sao
//                a segunda linha, mas quem quiser burlar de proposito consegue.
//                Contra isso a defesa e revisao humana, e esta prova existe para
//                que ela seja necessaria so quando algo realmente muda.
//
// Se for preciso acrescentar algo que nao passe aqui: PARE e suba ao mestre. Esta
// prova ficar vermelha e o sinal de que a fronteira foi cruzada, nao um obstaculo
// a contornar editando a lista.
'use strict'
const fs = require('fs')
const path = require('path')
const crypto = require('crypto')

const RAIZ = path.join(__dirname, '..')
let ok = 0
const falhas = []
function registrar(nome, passou, detalhe) {
  if (passou) { ok++; console.log('  ok    ' + nome) }
  else { falhas.push(nome); console.log('  FALHA ' + nome + ' — ' + detalhe) }
}

// ---------------------------------------------------------------- as listas fechadas

const ARQUIVOS = [
  'src/index.ts',
  'src/tools/types.ts',
  'src/tools/registry.ts',
  'src/modules/safe-executor.ts',
]

const EXPORTADOS = ['ApprovalLevel', 'ExecutionLog', 'SafeExecutor', 'Tool', 'ToolRegistry']

const SHA = {
  'src/tools/types.ts':           '4c6cd65c022b527875e5d0d6b17d4555ad76824d5d3d4bb4fda20089c649f8ae',
  'src/tools/registry.ts':        '31c5b9cad4519c81eab6ae01db37b5c266b7836d345443eed5466495a7962a0e',
  'src/modules/safe-executor.ts': '882d1af06c45a94e1b2573233b4b5d284ce01360b714e727bd480692f760756c',
}

const TETO_DE_LINHAS = 80   // hoje: 67. O teto e alarme de crescimento, nao meta.

// Capacidade de EFEITO — o que um contrato nao pode ter porque nao precisa.
// Conferidos COM os literais: o nome do modulo mora DENTRO do literal.
const EFEITOS_DE_MODULO = [
  /require\s*\(/,
  /\bfrom\s+['"](fs|path|os|http|https|net|dns|crypto|child_process|worker_threads|pg|mysql|mongodb)['"]/,
]
// Conferidos SEM os literais: senao a prosa de uma string acusa sozinha.
const EFEITOS_DE_CODIGO = [
  /\bprocess\s*\./, /\bfetch\s*\(/, /XMLHttpRequest/, /WebSocket/, /\beval\s*\(/, /new\s+Function\s*\(/,
]

// Vocabulario de GOVERNANCA — se aparecer aqui, regra de produto vazou para o contrato.
const GOVERNANCA = [
  /\bselo\b/i, /\bcadeia\b/i, /\btrail\b/i, /\btenant\b/i, /\blastro\b/i, /\bportao\b/i,
  /\bcomprovante\b/i, /\bliberador\b/i, /\bliberacao\b/i, /\bpublicar\b/i, /\bfest\b/i,
  /\bsenha\b/i, /\btoken\b/i, /\bchave[ _-]?privada\b/i, /\bcofre\b/i,
]

function semComentario(t) {
  return t.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/\/\/[^\n]*/g, ' ')
}
function semLiteral(t) {
  return t.replace(/`(?:\\.|[^`\\])*`/g, "''").replace(/'(?:\\.|[^'\\\n])*'/g, "''").replace(/"(?:\\.|[^"\\\n])*"/g, '""')
}

// Analisa UM texto-fonte. Devolve a lista de violacoes. E' a mesma funcao usada
// contra os arquivos reais e contra as fontes fabricadas do controle negativo —
// senao a trava provaria a si mesma.
// DUAS PASSAGENS, e a distincao nao e detalhe: tirar os literais CEGA a checagem
// de import, porque o nome do modulo E um literal (`from 'fs'` vira `from ''`). A
// primeira versao desta funcao fazia tudo sobre o texto sem literais e deixava
// passar `import * as fs from 'fs'` e `import { Pool } from 'pg'` — os dois vicios
// mais graves da lista. Quem denunciou foi o controle negativo do F6.
//   modulos     -> texto SEM comentario, COM literais (o nome mora no literal)
//   identificad -> texto SEM comentario e SEM literais (senao a prosa acusa)
function violacoes(texto) {
  const v = []
  const comLiterais = semComentario(texto)
  const codigo = semLiteral(comLiterais)

  for (const re of EFEITOS_DE_MODULO) if (re.test(comLiterais)) v.push('capacidade de efeito (modulo): ' + re)
  for (const m of comLiterais.match(/from\s+['"][^'"]+['"]/g) || []) {
    if (!/from\s+['"]\.\.?\//.test(m)) v.push('import de fora: ' + m)
  }
  for (const re of EFEITOS_DE_CODIGO) if (re.test(codigo)) v.push('capacidade de efeito: ' + re)
  for (const re of GOVERNANCA) if (re.test(codigo)) v.push('vocabulario de governanca: ' + re)
  return v
}

console.log('=== F1 — inventario de arquivos e lista FECHADA ===')
const achados = []
;(function varrer(dir) {
  for (const nome of fs.readdirSync(dir)) {
    const p = path.join(dir, nome)
    if (fs.statSync(p).isDirectory()) varrer(p)
    else achados.push(path.relative(RAIZ, p).split(path.sep).join('/'))
  }
})(path.join(RAIZ, 'src'))
const sobrando = achados.filter(a => ARQUIVOS.indexOf(a) < 0)
const faltando = ARQUIVOS.filter(a => achados.indexOf(a) < 0)
registrar('F1 src/ tem exatamente os 4 arquivos do contrato',
  sobrando.length === 0 && faltando.length === 0,
  'sobrando: [' + sobrando.join(', ') + '] faltando: [' + faltando.join(', ') + ']')

console.log('\n=== F2 — os 3 arquivos de contrato sao os auditados (sha256) ===')
let shaOk = true
for (const arq of Object.keys(SHA)) {
  const h = crypto.createHash('sha256').update(fs.readFileSync(path.join(RAIZ, arq))).digest('hex')
  if (h !== SHA[arq]) shaOk = false
  console.log('        ' + arq + ' ' + (h === SHA[arq] ? 'identico' : 'DIVERGIU ' + h))
}
registrar('F2 sha256 dos 3 conferem', shaOk, 'algum arquivo mudou sem a lista ser atualizada')

console.log('\n=== F3 — zero dependencias, zero efeito, zero governanca ===')
const pkg = JSON.parse(fs.readFileSync(path.join(RAIZ, 'package.json'), 'utf8'))
registrar('F3a o pacote nao tem dependencias de producao',
  !pkg.dependencies || Object.keys(pkg.dependencies).length === 0,
  'dependencies: ' + JSON.stringify(pkg.dependencies))

const todas = []
for (const arq of ARQUIVOS) {
  const v = violacoes(fs.readFileSync(path.join(RAIZ, arq), 'utf8'))
  if (v.length) todas.push(arq + ': ' + v.join(' | '))
}
registrar('F3b nenhum arquivo tem capacidade de efeito nem vocabulario de governanca',
  todas.length === 0, todas.join('  //  '))

console.log('\n=== F4 — superficie exportada e lista FECHADA ===')
const dist = path.join(RAIZ, 'dist', 'index.d.ts')
if (!fs.existsSync(dist)) {
  registrar('F4 dist/index.d.ts existe (rode `npm run build` antes)', false, 'dist ausente')
} else {
  const d = fs.readFileSync(dist, 'utf8')
  const nomes = []
  // aceita `export { ... }` E `export type { ... }`: o d.ts separa valores de tipos,
  // e ler so o primeiro fazia a lista fechada parecer ter 2 nomes em vez de 5.
  for (const m of d.match(/export\s+(?:type\s+)?\{[^}]*\}/g) || []) {
    for (const n of m.replace(/export\s+(?:type\s+)?\{|\}/g, '').split(',')) {
      const limpo = n.trim().replace(/^type\s+/, '').split(/\s+as\s+/).pop()
      if (limpo && nomes.indexOf(limpo) < 0) nomes.push(limpo)
    }
  }
  nomes.sort()
  registrar('F4 exporta exatamente os 5 nomes do contrato',
    JSON.stringify(nomes) === JSON.stringify(EXPORTADOS),
    'exporta [' + nomes.join(', ') + '] esperado [' + EXPORTADOS.join(', ') + ']')
}

console.log('\n=== F5 — teto de tamanho (alarme de crescimento) ===')
let linhas = 0
for (const arq of Object.keys(SHA)) linhas += fs.readFileSync(path.join(RAIZ, arq), 'utf8').split('\n').length
registrar('F5 os 3 arquivos de contrato somam <= ' + TETO_DE_LINHAS + ' linhas',
  linhas <= TETO_DE_LINHAS, 'somam ' + linhas)
console.log('        (hoje: ' + linhas + ' linhas)')

console.log('\n=== F6 — [CONTROLE NEGATIVO] a trava morde? ===')
// Fontes FABRICADAS, com o vicio dentro, submetidas a MESMA funcao. Sem isto, F3
// seria uma prova que passa por nao ter o que reprovar — o vicio da pendencia 8.
const casos = [
  ['acesso a disco',    "import * as fs from 'fs'\nexport const x = 1"],
  ['acesso a rede',     "export async function f() { return fetch('http://x') }"],
  ['acesso a banco',    "import { Pool } from 'pg'\nexport const p = new Pool()"],
  ['leitura de ambiente', 'export const t = process.env.TOKEN'],
  ['regra de governanca', 'export function podePublicar(selo: any) { return selo.liberador != null }'],
  ['execucao dinamica',  'export const f = new Function("return 1")'],
]
let mordeuTodos = true
for (const [nome, fonte] of casos) {
  const v = violacoes(fonte)
  if (!v.length) mordeuTodos = false
  console.log('        ' + (v.length ? 'acusou' : 'NAO ACUSOU') + ': ' + nome)
}
registrar('F6 a trava acusa os 6 vicios fabricados', mordeuTodos, 'algum vicio passou')

const limpo = 'export interface Coisa { nome: string }\nexport type Papel = "a" | "b"'
registrar('F6b a trava NAO acusa contrato legitimo (nao recusa por reflexo)',
  violacoes(limpo).length === 0, 'acusou: ' + violacoes(limpo).join(', '))

const total = ok + falhas.length
console.log('\n=== PLACAR DA FRONTEIRA: ' + ok + '/' + total + ' ===')
if (falhas.length) {
  console.log('FRONTEIRA CRUZADA:')
  falhas.forEach(f => console.log('  - ' + f))
  console.log('\nSe a mudanca e legitima, ela NAO se resolve editando as listas desta')
  console.log('prova. PARE e suba ao mestre: o pacote e publico, e o que entra aqui')
  console.log('entra na plataforma inteira.')
  process.exit(1)
}
