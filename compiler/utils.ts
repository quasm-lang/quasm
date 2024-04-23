import { binaryen } from '../deps.ts'
import { DataType } from '../parser/token.ts'

const dataTypeToWasmTypeMap: Record<DataType, binaryen.Type> = {
    'i32': binaryen.i32,
    'f32': binaryen.f32,
    'none': binaryen.none
}

export function getWasmType(type: DataType): binaryen.Type {
    return dataTypeToWasmTypeMap[type]
}