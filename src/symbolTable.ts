import { DataType } from './datatype/mod.ts'

export enum Type {
    Variable = 'variable',
    Function = 'function',
    Struct = 'struct',
    StringLiteral = 'stringLiteral'
}

export type Symbol = Variable | Function | StringLiteral

export enum VariableReason {
    Declaration = 'declaration',
    Parameter = 'parameter',
}

export interface Variable {
    name: string
    type: Type.Variable
    dataType: DataType
    instanceOf?: string
    index: number
    reason: VariableReason
}

export interface Function {
    name: string
    type: Type.Function
    params: DataType[]
    returnType: DataType
}

export interface StringLiteral {
    type: Type.StringLiteral
    value: string
    offset?: number
}

class Scope {
    symbols: Map<string, Symbol> = new Map()

    define(symbol: Variable) {
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

    private scopes: Scope[] = []
    private currentFunctionVariables: Variable[] = []
    private index = 0 // variable index $0, $1, $2,...

    private stringLiterals: Map<string, number> = new Map()
    private segmentOffset = 0
    public segment: { offset: number, data: Uint8Array }[] = []

    enterScope() {
        this.scopes.push(new Scope())
    }
    
    exitScope() {
        return this.scopes.pop()
    }

    enterFunc() {
        this.enterScope()
        this.currentFunctionVariables = []
        this.index = 0
    }

    exitFunc(): Variable[] {
        this.exitScope()
        return this.currentFunctionVariables
    }

    currentScope(): Scope {
        return this.scopes[this.scopes.length-1]
    }

    getIndex(name: string): number | undefined {
        const symbol = this.lookup(Type.Variable, name)
        return symbol ? (symbol as Variable).index : undefined
    }

    define(symbol: Symbol) {
        switch (symbol.type) {
            case Type.Variable: {
                const varSymbol = symbol as Variable
                varSymbol.index = this.index++
                this.currentScope().define(varSymbol)
                if (symbol.reason === VariableReason.Declaration) {
                    this.currentFunctionVariables.push(symbol as Variable)
                }
                break
            }
            case Type.StringLiteral: {
                const strSymbol = symbol as StringLiteral
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
            case Type.Function: {
                this.topLevel.set((symbol as Function).name, symbol)
            }
        }
    }

    lookup(symbolType: Type, name: string): Symbol | undefined {
        switch (symbolType) {
            case Type.StringLiteral: {
                return {
                    value: name,
                    offset: this.stringLiterals.get(name)
                } as StringLiteral
            }
            case Type.Variable:
                for (let i = this.scopes.length - 1; i >= 0; i--) {
                    const symbol = this.scopes[i].lookup(name)
                    if (symbol) {
                        return symbol
                    }
                }
                break
            case Type.Function:
                return this.topLevel.get(name)
        }
    } 
}