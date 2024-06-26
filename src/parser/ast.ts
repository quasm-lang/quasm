import {
    DataType,
    InfixOperator,
    TokenType
} from '../lexer/token.ts'

export enum AstType {
    Program = 'PROGRAM',
    LetStatement = 'LET_STATEMENT',
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
    Identifier = 'IDENTIFIER',
    IntegerLiteral = 'INTEGER_LITERAL',
    FloatLiteral = 'FLOAT_LITERAL',
    StringLiteral = 'STRING_LITERAL',
    Field = 'FIELD',
    Spec = 'SPEC'
}

export interface SourceLocation {
    start: {
        line: number
        column: number
    }
    end: {
        line: number
        column: number
    }
}

export interface Node {
    type: AstType
    location: SourceLocation
}

export interface Statement extends Node {}
export interface Expression extends Node {}

export interface Program extends Node {
    type: AstType.Program
    statements: Statement[]
}

// Statements
export interface ExpressionStatement extends Statement {
    type: AstType.ExpressionStatement
    expression: Expression
}

export interface BlockStatement extends Statement {
    type: AstType.BlockStatement
    statements: Statement[]
}

export interface LetStatement extends Statement {
    type: AstType.LetStatement
    spec: Spec
}

export interface FuncStatement extends Statement {
    type: AstType.FuncStatement
    name: Identifier
    parameters: Field[]
    returnType: DataType
    body: BlockStatement
    exported: boolean
}

export interface ReturnStatement extends Statement {
    type: AstType.ReturnStatement
    value: Expression
}

export interface AssignmentStatement extends Statement {
    type: AstType.AssignmentStatement
    left: Expression
    value: Expression
}

export interface StructDeclaration extends Statement {
    type: AstType.StructDeclaration
    name: Identifier
    fields: Field[]
}

export interface IfStatement extends Statement {
    type: AstType.IfStatement
    condition: Expression
    consequent: BlockStatement
    alternate?: IfStatement | BlockStatement
}

export interface WhileStatement extends Statement {
    type: AstType.WhileStatement
    condition: Expression
    body: BlockStatement
}

export interface PrintStatement extends Statement {
    type: AstType.PrintStatement
    expression: Expression
}

// Expressions
export interface CallExpression extends Expression {
    type: AstType.CallExpression
    callee: Identifier
    arguments: Expression[]
}

export interface UnaryExpression extends Expression {
    type: AstType.UnaryExpression,
    operator: TokenType,
    right: Expression
}

export interface BinaryExpression extends Expression {
    type: AstType.BinaryExpression
    left: Expression
    operator: InfixOperator
    right: Expression
}

export interface MemberAccessExpression extends Expression {
    type: AstType.MemberAccessExpression
    base: Expression
    member: Identifier
}

export interface Field extends Node {
    type: AstType.Field
    name: Identifier
    dataType: DataType
}

export interface Spec extends Node {
    type: AstType.Spec
    name: Identifier
    dataType?: DataType
    value?: Expression
}

export interface IntegerLiteral extends Expression {
    type: AstType.IntegerLiteral
    value: number
}

export interface FloatLiteral extends Expression {
    type: AstType.FloatLiteral
    value: number
}

export interface StringLiteral extends Expression {
    type: AstType.StringLiteral
    value: string
}

export interface Identifier extends Expression {
    type: AstType.Identifier
    value: string
}