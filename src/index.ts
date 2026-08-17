// src/index.ts
// @axon/contrato — a fronteira motor <-> Axon.
//
// Este pacote NAO e "o harness". Sao os tres arquivos que definem o CONTRATO pelo
// qual qualquer Axon executa uma Tool: o que uma Tool e (`Tool`), onde ela e
// declarada (`ToolRegistry`) e por onde ela passa (`SafeExecutor`). Quem consome
// este pacote nao ganha comportamento — ganha uma fronteira comum.
//
// OS TRES ARQUIVOS SAO CONTEUDO PROVADO, NAO EDITADO. Vieram por copia do
// `jinnee-core` e mantem o sha256 do original, byte a byte. E' por isso que a
// estrutura de pastas (`tools/`, `modules/`) foi preservada em vez de achatada:
// `safe-executor.ts` importa `../tools/types`, e achatar exigiria editar a linha —
// o que quebraria a identidade que este pacote existe para carregar.
//
// Este arquivo (o barril) e a UNICA peca nova. Ele nao acrescenta logica: so
// reexporta. Acrescentar comportamento aqui seria o pacote deixar de ser contrato
// e virar biblioteca — e a divergencia entre os Axons voltaria por dentro dele.
//
// ATENCAO ao consumir: o `SafeExecutor` so bloqueia `approvalLevel: 'approve'` sem
// dono. Ele NAO e tranca de nada — e registro de execucao. Quem trata este pacote
// como garantia de seguranca esta se enganando: a garantia mora no produto que o
// consome, e tem de ser provada la. Ver o caso A15 do Acompanhante do Axon
// Comunicacao, que percorre as Tools em 'auto' e prova, rodando, que nenhuma
// escreve, sela ou toca o trail.
export type { ApprovalLevel, Tool } from './tools/types'
export { ToolRegistry } from './tools/registry'
export type { ExecutionLog } from './modules/safe-executor'
export { SafeExecutor } from './modules/safe-executor'
