import { binaryen } from '../deps.ts'
import { DataType } from '../parser/token.ts'

const dataTypeToWasmTypeMap: Record<DataType, binaryen.Type> = {
    i32: binaryen.i32,
    i64: binaryen.i64,
    f32: binaryen.f32,
    f64: binaryen.f64,
    none: binaryen.none
}

export function getWasmType(type: DataType): binaryen.Type {
    return dataTypeToWasmTypeMap[type]
}

export interface ScopeData {
    type: DataType
    index: number
    reason: 'declaration' | 'parameter'
}

export class ScopeStack {
    private scopes: Map<string, ScopeData>[] = []

    push(newScope: Map<string, ScopeData>) {
        this.scopes.push(newScope)
    }

    pop() {
        return this.scopes.pop()
    }

    last() {
        return this.scopes[this.scopes.length-1]
    }

    set(name: string, data: ScopeData) {
        const currentScope = this.scopes[this.scopes.length - 1]
        currentScope.set(name, data)
    }

    get(name: string): ScopeData | undefined {
        for (let i = this.scopes.length - 1; i >= 0; i--) {
            if (this.scopes[i].has(name)) {
                return this.scopes[i].get(name)
            }
        }
        return undefined;
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
}
