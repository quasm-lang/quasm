import { DataType } from '../datatype/mod.ts'

export enum SymbolType {
    Variable = 'variable',
    Function = 'function',
    Struct = 'struct',
    StringLiteral = 'stringLiteral'
}

export type Symbol = VariableSymbol | FunctionSymbol | StructSymbol | StringLiteralSymbol

export enum VariableReason {
    Declaration = 'declaration',
    Parameter = 'parameter',
}

export interface VariableSymbol {
    name: string
    type: SymbolType.Variable
    dataType: DataType
    instanceOf?: string
    index: number
    reason: VariableReason
}

export interface StructSymbol {
    type: SymbolType.Struct
    name: string
    members: Map<string, DataType>
    size: number
}

export interface FunctionSymbol {
    name: string
    type: SymbolType.Function
    params: DataType[]
    returnType: DataType
}

export interface StringLiteralSymbol {
    type: SymbolType.StringLiteral
    value: string
    offset?: number
}

class Scope {
    symbols: Map<string, Symbol> = new Map()

    define(symbol: VariableSymbol) {
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
    private segmentOffset = 0
    public segment: { offset: number, data: Uint8Array }[] = []

    enterScope() {
        this.scopes.push(new Scope())
    }
    
    exitScope() {
        return this.scopes.pop()
    }

    currentScope(): Scope {
        return this.scopes[this.scopes.length-1]
    }

    currentScopeLastIndex(): number {
        return this.currentScope().size()
    }

    define(symbol: Symbol) {
        switch (symbol.type) {
            case SymbolType.Variable: {
                const currentScope = this.scopes[this.scopes.length - 1]
                currentScope.define(symbol as VariableSymbol)
                break
            }
            case SymbolType.StringLiteral: {
                const strSymbol = symbol as StringLiteralSymbol
                if (!this.stringLiterals.has(strSymbol.value)) {
                    const value = strSymbol.value
                    this.stringLiterals.set(strSymbol.value, this.segmentOffset)

                    const strBytes = new TextEncoder().encode(value)
                    const lengthBytes = new Uint8Array(4)
                    new DataView(lengthBytes.buffer).setUint32(0, strBytes.length, true)

                    const fullData = new Uint8Array(4 + strBytes.length)
                    fullData.set(lengthBytes)
                    fullData.set(strBytes, 4)

                    this.segment.push({
                        offset: this.segmentOffset,
                        data: fullData
                    })

                    this.segmentOffset += fullData.length
                }
                break
            }
            case SymbolType.Function: {
                this.topLevel.set((symbol as FunctionSymbol).name, symbol)
            }
        }
    }

    lookup(symbolType: SymbolType, name: string): Symbol | undefined {
        switch (symbolType) {
            case SymbolType.StringLiteral: {
                return {
                    value: name,
                    offset: this.stringLiterals.get(name)
                } as StringLiteralSymbol
            }
            case SymbolType.Variable:
                for (let i = this.scopes.length - 1; i >= 0; i--) {
                    const symbol = this.scopes[i].lookup(name)
                    if (symbol) {
                        return symbol
                    }
                }
                break
            case SymbolType.Function:
                return this.topLevel.get(name)
        }
    }
}