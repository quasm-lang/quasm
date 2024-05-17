import { DataType } from '../lexer/token.ts'

export enum SymbolType {
    Variable,
    Function
}

export interface Symbol {
    type: SymbolType
    name: string
}

export interface VariableSymbol extends Symbol {
    type: SymbolType.Variable
    dataType: DataType
    index: number
    reason: 'declaration' | 'parameter'
}

interface FunctionSymbol extends Symbol {
    type: SymbolType.Function
    params: DataType[]
    returnType: DataType
}

class Scope {
    symbols: Map<string, Symbol>

    constructor() {
        this.symbols = new Map()
    }

    define(symbol: Symbol) {
        this.symbols.set(symbol.name, symbol)
    }

    lookup(name: string): Symbol | undefined {
        return this.symbols.get(name)
    }

    size() {
        return this.symbols.size
    }
}

export class SymbolTable {
    private topLevel: Map<string, FunctionSymbol>
    private scopes: Scope[]

    constructor() {
        this.scopes = [new Scope()]
        this.topLevel = new Map()
    }

    enterScope() {
        this.scopes.push(new Scope())
    }
    
    exitScope() {
        return this.scopes.pop()
    }

    last() {
        return this.scopes[this.scopes.length-1]
    }

    define(name: string, dataType: DataType, index: number, reason: 'declaration' | 'parameter') {
        const currentScope = this.scopes[this.scopes.length - 1]
        currentScope.define({
            type: SymbolType.Variable,
            name,
            dataType,
            index,
            reason
        } as VariableSymbol)
    }

    lookup(name: string): Symbol | undefined {
        return this.last().lookup(name)
    }

    currentScopeLastIndex(): number {
        return this.scopes[this.scopes.length - 1].size()
    }

    addFunction(name: string, params: DataType[], returnType: DataType) {
        this.topLevel.set(name, {
            name,
            type: SymbolType.Function,
            params,
            returnType,
        } as FunctionSymbol)
    }

    getFunction(name: string): FunctionSymbol | undefined {
        return this.topLevel.get(name)
    }
}