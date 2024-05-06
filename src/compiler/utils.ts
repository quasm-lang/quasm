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