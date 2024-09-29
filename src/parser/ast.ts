import * as Token from '../lexer/token.ts'

import { DataType } from '../datatype/mod.ts'

export enum Type {
    Program = 'PROGRAM',
    VarStatement = 'VAR_STATEMENT',
    BlockStatement = 'BLOCK_STATEMENT',
    ExpressionStatement = 'EXPRESSION_STATEMENT',
    FuncStatement = 'FUNC_STATEMENT',
    ReturnStatement = 'RETURN_STATEMENT',
    AssignmentStatement = 'ASSIGNMENT_STATEMENT',
    StructDeclaration = 'STRUCT_DECLARATION',
    IfStatement = 'IF_STATEMENT',
    WhileStatement = 'WHILE_STATEMENT',
    PrintStatement = 'PRINT_STATEMENT',
    PrefixExpression = 'PREFIX_EXPRESSION',
    InfixExpression = 'INFIX_EXPRESSION',
    CallExpression = 'CALL_EXPRESSION',
    UnaryExpression = 'UNARY_EXPRESSION',
    BinaryExpression = 'BINARY_EXPRESSION',
    MemberAccessExpression = 'MEMBER_ACCESS_EXPRESSION',
    IndexExpression = 'INDEX_EXPRESSION',
    Identifier = 'IDENTIFIER',
    IntegerLiteral = 'INTEGER_LITERAL',
    FloatLiteral = 'FLOAT_LITERAL',
    StringLiteral = 'STRING_LITERAL',
    ArrayLiteral = 'ARRAY_LITERAL',
    TupleLiteral = 'TUPLE_LITERAL',
    Field = 'FIELD',
    Spec = 'SPEC',
    IdentifierType = 'IDENTIFIER_TYPE',
    ArrayType = 'ARRAY_TYPE',
    TupleType = 'TUPLE_TYPE',
}

export interface SourceLocation {
    start: {
        line: number
        column: number
    }
}

export interface Node {
    type: Type
    location: SourceLocation
}

export interface Statement extends Node {}
export interface Expression extends Node {}

export interface Program extends Node {
    type: Type.Program
    statements: Statement[]
}

// Statements
export interface ExpressionStatement extends Statement {
    type: Type.ExpressionStatement
    expression: Expression
}

export interface BlockStatement extends Statement {
    type: Type.BlockStatement
    statements: Statement[]
}

export interface VarStatement extends Statement {
    type: Type.VarStatement
    specs: Spec[]
    value: Expression
    dataType?: DataType
}

export interface FuncStatement extends Statement {
    type: Type.FuncStatement
    name: Identifier
    parameters: Field[]
    returnType: DataType
    body: BlockStatement
    exported: boolean
}

export interface ReturnStatement extends Statement {
    type: Type.ReturnStatement
    value: Expression
}

export interface AssignmentStatement extends Statement {
    type: Type.AssignmentStatement
    left: Expression
    value: Expression
}

export interface StructDeclaration extends Statement {
    type: Type.StructDeclaration
    name: Identifier
    fields: Field[]
}

export interface IfStatement extends Statement {
    type: Type.IfStatement
    condition: Expression
    body: BlockStatement
    alternate?: IfStatement | BlockStatement
}

export interface WhileStatement extends Statement {
    type: Type.WhileStatement
    condition: Expression
    body: BlockStatement
}

export interface PrintStatement extends Statement {
    type: Type.PrintStatement
    expression: Expression
}

// Expressions
export interface CallExpression extends Expression {
    type: Type.CallExpression
    callee: Identifier
    arguments: Expression[]
}

export interface UnaryExpression extends Expression {
    type: Type.UnaryExpression,
    operator: Token.Type,
    right: Expression
}

export interface BinaryExpression extends Expression {
    type: Type.BinaryExpression
    left: Expression
    operator: Token.InfixOperator
    right: Expression
}

export interface MemberAccessExpression extends Expression {
    type: Type.MemberAccessExpression
    base: Expression
    member: Identifier
}

export interface IndexExpression extends Expression {
    type: Type.IndexExpression
    base: Expression
    index: Expression
}

export interface Field extends Node {
    type: Type.Field
    name: Identifier
    dataType: DataType
}

export interface Spec extends Node {
    type: Type.Spec
    name: Identifier
    dataType?: DataType
}

export interface IntegerLiteral extends Expression {
    type: Type.IntegerLiteral
    value: number
}

export interface FloatLiteral extends Expression {
    type: Type.FloatLiteral
    value: number
}

export interface StringLiteral extends Expression {
    type: Type.StringLiteral
    value: string
}

export interface Identifier extends Expression {
    type: Type.Identifier
    value: string
}

export interface ArrayLiteral extends Expression {
    type: Type.ArrayLiteral
    elements: Expression[]
}

export interface TupleLiteral extends Expression {
    type: Type.TupleLiteral
    elements: Expression[]
}

// export interface IdentifierType extends Expression {
//     type: Type.IdentifierType
//     value: string
// }

// export interface ArrayType extends Expression {
//     type: Type.ArrayType
//     elementType: IdentifierType
// }

// export interface TupleType extends Expression {
//     type: Type.TupleType
//     elementTypes: IdentifierType[]
// }