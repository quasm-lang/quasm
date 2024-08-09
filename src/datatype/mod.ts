import { binaryen } from '../deps.ts'

export enum TypeKind {
    Primitive = 'Primitive',
    Struct = 'Struct',
    Array = 'Array',
    Tuple = 'Tuple'
}

export interface DataType {
    kind: TypeKind
    eq(other: DataType): boolean
    toString(): string
    toWasmType(): binaryen.Type
}

export enum PrimitiveKind {
    i32 = 'i32',
    f64 = 'f64',
    String = 'string',
    None = 'none'
}

export interface PrimitiveType extends DataType {
    kind: TypeKind.Primitive
    primitiveKind: PrimitiveKind
}

export interface StructType extends DataType {
    kind: TypeKind.Struct
    name: string
    fields: Map<string, DataType>
}

export interface ArrayType extends DataType {
    kind: TypeKind.Array
    elementType: DataType
}

export interface TupleType extends DataType {
    kind: TypeKind.Tuple
    elementTypes: DataType[]
}

export const i32: PrimitiveType = {
    kind: TypeKind.Primitive,
    primitiveKind: PrimitiveKind.i32,
    eq(other: DataType): boolean {
        return other.kind === TypeKind.Primitive && (other as PrimitiveType).primitiveKind === PrimitiveKind.i32
    },
    toString(): string {
        return PrimitiveKind.i32
    },
    toWasmType(): binaryen.Type {
        return binaryen.i32
    }
}

export const f64: PrimitiveType = {
    kind: TypeKind.Primitive,
    primitiveKind: PrimitiveKind.f64,
    eq(other: DataType): boolean {
        return other.kind === TypeKind.Primitive && (other as PrimitiveType).primitiveKind === PrimitiveKind.f64
    },
    toString(): string {
        return PrimitiveKind.f64
    },
    toWasmType(): binaryen.Type {
        return binaryen.f64
    }
}

export const String: PrimitiveType = {
    kind: TypeKind.Primitive,
    primitiveKind: PrimitiveKind.String,
    eq(other: DataType): boolean {
        return other.kind === TypeKind.Primitive && (other as PrimitiveType).primitiveKind === PrimitiveKind.String
    },
    toString(): string {
        return PrimitiveKind.String
    },
    toWasmType(): binaryen.Type {
        return binaryen.i32
    }
}

export const None: PrimitiveType = {
    kind: TypeKind.Primitive,
    primitiveKind: PrimitiveKind.None,
    eq(other: DataType): boolean {
        return other.kind === TypeKind.Primitive && (other as PrimitiveType).primitiveKind === PrimitiveKind.None
    },
    toString(): string {
        return PrimitiveKind.None
    },
    toWasmType(): binaryen.Type {
        return binaryen.none
    }
}

// helper functions
export function isPrimitiveType(type: DataType): type is PrimitiveType {
    return type.kind === TypeKind.Primitive
}

export function fromString(typeString: string): DataType {
    switch (typeString) {
        case PrimitiveKind.i32:
            return i32
        case PrimitiveKind.f64:
            return f64
        case PrimitiveKind.String:
            return String
        case PrimitiveKind.None:
            return None
        default:
            throw new Error(`Unknown type: ${typeString}`)
    }
}

export function createStructType(name: string, fields: Map<string, DataType>): StructType {
    return {
        kind: TypeKind.Struct,
        name,
        fields,
        eq(other: DataType): boolean {
            if (other.kind !== TypeKind.Struct) return false
            const otherStruct = other as StructType
            if (this.name !== otherStruct.name) return false
            // Check field compatibility
            for (const [fieldName, fieldType] of this.fields) {
                const otherField = otherStruct.fields.get(fieldName)
                if (!otherField || !fieldType.eq(otherField)) {
                    return false
                }
            }
            return true
        },
        toString(): string {
            return `struct ${this.name}`
        },
        toWasmType(): binaryen.Type {
            throw new Error('Structs are not supported yet')
        }
    }
}

export function createArrayType(elementType: DataType): ArrayType {
    return {
        kind: TypeKind.Array,
        elementType,
        eq(other: DataType): boolean {
            return other.kind === TypeKind.Array &&
                   this.elementType.eq((other as ArrayType).elementType)
        },
        toString(): string {
            return `${this.elementType.toString()}[]`
        },
        toWasmType(): binaryen.Type {
            throw new Error('Arrays are not supported yet')
        }
    }
}

export function createTupleType(elementTypes: DataType[]): TupleType {
    return {
        kind: TypeKind.Tuple,
        elementTypes,
        eq(other: DataType): boolean {
            return other.kind === TypeKind.Tuple &&
                   this.elementTypes.length === (other as TupleType).elementTypes.length &&
                   this.elementTypes.every((type, index) => type.eq((other as TupleType).elementTypes[index]))
        },
        toString(): string {
            return `(${this.elementTypes.map(type => type.toString()).join(', ')})`
        },
        toWasmType(): binaryen.Type {
            return binaryen.createType(this.elementTypes.map(type => type.toWasmType()))
        }
    }
}