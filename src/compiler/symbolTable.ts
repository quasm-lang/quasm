import { DataType } from '../parser/token.ts'

export interface VariableInfo {
    type: DataType
    index: number
    reason: 'declaration' | 'parameter'
}

export interface FunctionInfo {
    params: DataType[]
    returnType: DataType
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
        if (this.last().get(name)) {
            return this.last().get(name)
        }
        return undefined
    }

    currentScopeLastIndex(): number {
        return this.scopes[this.scopes.length - 1].size
    }

    addFunction(name: string, params: DataType[], returnType: DataType) {
        this.functions.set(name, { params, returnType })
    }

    getFunction(name: string): FunctionInfo | undefined {
        return this.functions.get(name)
    }
}