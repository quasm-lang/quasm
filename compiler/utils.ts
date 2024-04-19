import { binaryen } from '../deps.ts'
import { TokenType, DataType } from '../parser/token.ts'

const dataTypeToWasmTypeMap: Record<DataType, binaryen.Type> = {
    [TokenType.Int32]: binaryen.i32,
    [TokenType.Float32]: binaryen.f32,
    [TokenType.None]: binaryen.none
}

export function getWasmType(type: DataType): binaryen.Type {
    return dataTypeToWasmTypeMap[type]
}