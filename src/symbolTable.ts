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
    symbols: Map<string, Variable> = new Map()

    define(symbol: Variable) {
        this.symbols.set(symbol.name, symbol)
    }

    lookup(name: string): Variable | undefined {
        return this.symbols.get(name)
    }

    size() {
        return this.symbols.size
    }
}

export class SymbolTable {
    private topLevel: Map<string, Function> = new Map()

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
        const symbol = this.lookupVariable(name)
        return symbol ? (symbol as Variable).index : undefined
    }

    defineStringLiteral(value: string) {
        if (!this.stringLiterals.has(value)) {
            this.stringLiterals.set(value, this.segmentOffset)

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
    }

    defineFunction(name: string, params: DataType[], returnType: DataType) {
        this.topLevel.set(name, {
            name,
            type: Type.Function,
            params,
            returnType,
        } as Function)
    }

    defineVariable(name: string, dataType: DataType, reason: VariableReason): number {
        const symbol = {
            name,
            type: Type.Variable,
            dataType,
            reason,
        } as Variable
        
        symbol.index = this.index++

        if (this.currentScope().lookup(name)) {
            throw new Error(`Variable '${name}' is already defined!`)
        }

        this.currentScope().define(symbol)
        if (symbol.reason === VariableReason.Declaration) {
            this.currentFunctionVariables.push(symbol as Variable)
        }

        return symbol.index
    }

    lookupFunction(name: string): Function | undefined {
        return this.topLevel.get(name)
    }

    lookupStringLiteral(name: string): StringLiteral {
        return {
            value: name,
            offset: this.stringLiterals.get(name)
        } as StringLiteral
    }

    lookupVariable(name: string): Variable | undefined {
        for (let i = this.scopes.length - 1; i >= 0; i--) {
            const symbol = this.scopes[i].lookup(name)
            if (symbol) {
                return symbol
            }
        }
    }
}