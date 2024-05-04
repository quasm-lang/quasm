import { binaryen } from '../deps.ts'
import { DataType } from '../parser/token.ts'

export interface VariableInfo {
    type: DataType
    index: number
    reason: 'declaration' | 'parameter'
}

export interface FunctionInfo {
    params: binaryen.Type[]
    returnType: binaryen.Type
}

export class SymbolTable {
    private functions: Map<string, FunctionInfo>
    private scopes: Map<string, VariableInfo>[]

    constructor() {
        this.scopes = [new Map()]
        this.functions = new Map()
    }

    enterScope(newScope: Map<string, VariableInfo>) {
        this.scopes.push(new Map(newScope))
    }
    
    exitScope() {
        return this.scopes.pop()
    }

    last() {
        return this.scopes[this.scopes.length-1]
    }

    addVariable(name: string, type: DataType, index: number, reason: 'declaration' | 'parameter') {
        const currentScope = this.scopes[this.scopes.length - 1]
        currentScope.set(name, { type, index, reason })
    }

    getVariable(name: string): VariableInfo | undefined {
        for (let i = this.scopes.length - 1; i >= 0; i--) {
            if (this.scopes[i].has(name)) {
                return this.scopes[i].get(name)
            }
        }
        return undefined
    }

    currentScopeLastIndex(): number {
        return this.scopes[this.scopes.length - 1].size
    }

    findIndex(name: string): number {
        for (let i = this.scopes.length - 1; i >= 0; i--) {
            if (this.scopes[i].has(name)) {
                const index = this.scopes[i].get(name)
                if (index === undefined) throw new Error(`Index for variable ${name} is undefined`)
                return index.index
            }
        }
        throw new Error(`Variable ${name} not found in scope`)
    }

    addFunction(name: string, params: binaryen.Type[], returnType: binaryen.Type) {
        this.functions.set(name, { params, returnType })
    }

    getFunction(name: string): FunctionInfo | undefined {
        return this.functions.get(name)
    }
}