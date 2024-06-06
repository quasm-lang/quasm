import { DataType } from '../lexer/token.ts'

export enum SymbolType {
    Variable,
    Function,
    Struct
}

export interface Symbol {
    type: SymbolType
    name: string
}

export interface VariableSymbol extends Symbol {
    type: SymbolType.Variable
    dataType: DataType
    instanceOf?: string
    index: number
    reason: 'declaration' | 'parameter'
}

export interface StructSymbol extends Symbol {
    type: SymbolType.Struct
    name: string
    members: Map<string, DataType>
    size: number
}

export interface FunctionSymbol extends Symbol {
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
    private topLevel: Map<string, Symbol>
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

    define(symbol: Symbol) {
        const currentScope = this.scopes[this.scopes.length - 1]
        currentScope.define(symbol)
    }

    lookup(name: string): Symbol | undefined {
        return this.last().lookup(name)
    }

    currentScopeLastIndex(): number {
        return this.scopes[this.scopes.length - 1].size()
    }

    // addFunction(name: string, params: DataType[], returnType: DataType) {
    addFunction(symbol: Symbol) {
        this.topLevel.set(symbol.name, symbol)
    }

    getFunction(name: string): Symbol | undefined {
        return this.topLevel.get(name)
    }
}