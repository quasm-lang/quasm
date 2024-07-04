import { DataType } from '../datatype/mod.ts'

export enum SymbolType {
    Variable,
    Function,
    Struct,
    StringLiteral
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

export interface StringLiteralSymbol extends Symbol {
    type: SymbolType.StringLiteral
    value: string
    offset?: number
}

class Scope {
    symbols: Map<string, Symbol> = new Map()

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
    private topLevel: Map<string, Symbol> = new Map()
    private scopes: Scope[] = [new Scope()]
    private stringLiterals: Map<string, number> = new Map()

    enterScope() {
        this.scopes.push(new Scope())
    }
    
    exitScope() {
        return this.scopes.pop()
    }

    last() {
        return this.scopes[this.scopes.length-1]
    }

    currentScopeLastIndex(): number {
        return this.last().size()
    }

    define(symbol: Symbol) {
        switch (symbol.type) {
            case SymbolType.Variable: {
                const currentScope = this.scopes[this.scopes.length - 1]
                currentScope.define(symbol)
                break
            }
            case SymbolType.StringLiteral: {
                const strSymbol = symbol as StringLiteralSymbol
                this.stringLiterals.set(strSymbol.value, strSymbol.offset ?? -1)
                break
            }
            case SymbolType.Function: {
                this.topLevel.set(symbol.name, symbol)
            }
        }
    }

    lookup(symbolType: SymbolType, name: string): Symbol | undefined {
        switch (symbolType) {
            case SymbolType.StringLiteral: {
                const offset = this.stringLiterals.get(name)
                return {
                    name: `_str_${offset}`,
                    value: name,
                    offset: this.stringLiterals.get(name)
                } as StringLiteralSymbol
            }
            case SymbolType.Variable:
                return this.last().lookup(name)
            case SymbolType.Function:
                return this.topLevel.get(name)
        }
    }

    getStringLiterals(): string[] {
        return Array.from(this.stringLiterals.keys())
    }

    updateStringLiteralOffset(value: string, offset: number) {
        this.stringLiterals.set(value, offset)
    }
}