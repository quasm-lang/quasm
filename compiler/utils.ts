import binaryen from 'npm:binaryen'
import { DataType } from '../parser/ast.ts'

const dataTypeToWasmTypeMap: Record<DataType, binaryen.Type> = {
    [DataType.Int]: binaryen.i32,
    [DataType.Float]: binaryen.f32,
    [DataType.None]: binaryen.none
}

export function getWasmType(type: DataType): binaryen.Type {
    return dataTypeToWasmTypeMap[type]
}