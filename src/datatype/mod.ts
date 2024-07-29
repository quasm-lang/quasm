import { binaryen } from '../deps.ts'

export enum TypeKind {
    i32 = 'i32',
    f64 = 'f64',
    None = 'none',
    String = 'string',
    Struct = 'Struct',
    Array = 'Array'
}

export type PrimitiveTypeKind = TypeKind.i32 | TypeKind.f64 | TypeKind.String | TypeKind.None

export interface PrimitiveType {
    kind: PrimitiveTypeKind
}

export interface StructType {
    kind: TypeKind.Struct
    name: string
    fields: Map<string, DataType>
}

export interface ArrayType {
    kind: TypeKind.Array
    elementType: DataType
}

export type DataType = PrimitiveType | StructType | ArrayType

// To binaryen type
const primitiveTypeToWasmTypeMap: Record<PrimitiveTypeKind, binaryen.Type> = {
    i32: binaryen.i32,
    f64: binaryen.f64,
    none: binaryen.none,
    string: binaryen.i32
}

export function getWasmType(type: DataType): binaryen.Type {
    if (isPrimitiveType(type)) {
        return primitiveTypeToWasmTypeMap[type.kind]
    }
    
    switch (type.kind) {
        case TypeKind.Struct:
            throw new Error('Structs are not supported yet')
        case TypeKind.Array:
            throw new Error('Arrays are not supported yet')
    }
}

// helper functions
export function isPrimitiveType(type: DataType): type is PrimitiveType {
    return Object.values(TypeKind).includes(type.kind as PrimitiveTypeKind)
}

export function isEqual(left: DataType, right: DataType): boolean {
    return left.kind === right.kind
}