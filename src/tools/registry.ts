import {Tool} from './types'
export class ToolRegistry {
    private tools: Map<string,Tool> = new Map()
    register (tool: Tool): void {
        this.tools.set(tool.name, tool)
}

get(name: string): Tool | undefined {
    return this.tools.get(name)
}

list(): Tool[] {
    return Array.from(this.tools.values())
}
}