import { Tool } from '../tools/types'

export interface ExecutionLog {
  toolName: string
  timestamp: string
  status: 'success' | 'blocked' | 'error'
  message: string
  result?: string
}

export class SafeExecutor {
  private logs: ExecutionLog[] = []

  async execute(tool: Tool, params: any, ctx: { isOwner?: boolean } = {}): Promise<ExecutionLog> {
    if (tool.approvalLevel === 'approve' && !ctx.isOwner) {
      const log: ExecutionLog = {
        toolName: tool.name,
        timestamp: new Date().toISOString(),
        status: 'blocked',
        message: 'Requer aprovacao humana antes de executar'
      }
      this.logs.push(log)
      return log
    }
    try {
      const toolResult = await tool.execute(params)
      const log: ExecutionLog = {
        toolName: tool.name,
        timestamp: new Date().toISOString(),
        status: 'success',
        message: 'Executado com sucesso',
        result: String(toolResult)
      }
      this.logs.push(log)
      return log
    } catch (error) {
      const log: ExecutionLog = {
        toolName: tool.name,
        timestamp: new Date().toISOString(),
        status: 'error',
        message: 'Erro na execucao'
      }
      this.logs.push(log)
      return log
    }
  }

  getLogs(): ExecutionLog[] {
    return this.logs
  }
}
