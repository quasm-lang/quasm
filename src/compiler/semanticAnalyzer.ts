import {
    AstType,
    Program,
    Statement,
    Expression,
    BinaryExpression,
    LetStatement,
    FuncStatement,
    ReturnStatement,
    Identifier,
    IntegerLiteral,
    AssignmentStatement,
    CallExpression,
    FloatLiteral,
    StringLiteral,
    UnaryExpression,
    ExpressionStatement,
    MemberAccessExpression,
} from '../parser/ast.ts'
import { VariableSymbol, SymbolTable, SymbolType, FunctionSymbol, StructSymbol } from './symbolTable.ts'
import { DataType, TokenType } from '../lexer/token.ts'

export class SemanticAnalyzer {
    private symbolTable: SymbolTable

    constructor(symbolTable: SymbolTable) {
        this.symbolTable = symbolTable
    }

    check(ast: Program) {
        this.visitProgram(ast)
    }

    visitProgram(program: Program) {
        this.symbolTable.enterScope()
        
        for (const statement of program.statements) {
            this.visitStatement(statement)
        }

        this.symbolTable.exitScope()
    }

    visitStatement(statement: Statement) {
        switch (statement.type) {
            case AstType.LetStatement:
                this.visitLetStatement(statement as LetStatement)
                break
            case AstType.FuncStatement:
                this.visitFnStatement(statement as FuncStatement)
                break
            case AstType.ReturnStatement:
                this.visitReturnStatement(statement as ReturnStatement)
                break
            case AstType.AssignmentStatement:
                this.visitAssignmentStatement(statement as AssignmentStatement)
                break
            case AstType.ExpressionStatement:
                this.visitExpressionStatement(statement as ExpressionStatement)
                break
        }
    }

    visitLetStatement(statement: LetStatement): number {
        const { name, dataType, value } = statement.spec

        if (dataType === undefined && value === undefined) {
            throw new Error(`Illegal let declaration!`)
        }
    
        let inferredType: DataType | undefined
    
        if (value) {
            inferredType = this.visitExpression(value)
        }
    
        const finalType = dataType || inferredType || DataType.none
    
        if (value && inferredType && dataType && inferredType !== dataType) {
            throw new Error(`Type mismatch: Expected ${dataType}, but got ${inferredType} for variable '${name.value}'`)
        }

        let instanceOf: string | undefined
        if (statement.spec.value && statement.spec.value.type === AstType.CallExpression) {
            const stmt = statement.spec.value as CallExpression
            const symbol = this.symbolTable.getFunction(stmt.callee.value)
            if (symbol?.type === SymbolType.Struct) {
                instanceOf = (symbol as StructSymbol).name
            }
        }

        const index = this.symbolTable.currentScopeLastIndex()
        this.symbolTable.define({ type: SymbolType.Variable, name: name.value, dataType: finalType, instanceOf, index, reason: 'declaration' } as VariableSymbol)

        return index
    }

    visitFnStatement(statement: FuncStatement) {
        const { name, parameters, returnType, body } = statement
    
        // Create a new scope for the function
        this.symbolTable.enterScope()
    
        // Add function parameters to the symbol table
        for (const param of parameters) {
            this.symbolTable.define({ type: SymbolType.Variable, name: param.name.value, dataType: param.dataType, index: 0, reason: 'parameter' } as VariableSymbol)
        }
    
        // Visit the function body
        for (const bodyStatement of body.statements) {
            this.visitStatement(bodyStatement)
        }
    
        // Check the return type of the function
        // const lastStatement = body.statements[body.statements.length - 1]
        // if (lastStatement.type === AstType.ReturnStatement) {
        //     const actualReturnType = this.visitExpression((lastStatement as ReturnStatement).value)
        //     if (actualReturnType !== returnType) {
        //         throw new Error(`Type mismatch: Expected return type ${returnType}, but got ${actualReturnType} for function '${name.value}'`)
        //     }
        // } else if (returnType !== DataType.none) {
        //     throw new Error(`Missing return statement for function '${name.value}' with return type ${returnType}`)
        // }
    
        // Exit the function scope
        this.symbolTable.exitScope()
    }

    visitReturnStatement(statement: ReturnStatement) {
        this.visitExpression(statement.value)
    }

    visitAssignmentStatement(statement: AssignmentStatement) {
        const { name, value } = statement
        const variableType = (this.symbolTable.lookup(name.value) as VariableSymbol)?.dataType
        const valueType = this.visitExpression(value)

        if (!variableType) {
            throw new Error(`Undefined variable '${name.value}'`)
        }

        if (variableType !== valueType) {
            throw new Error(`Type mismatch: Cannot assign value of type ${valueType} to variable '${name.value}' of type ${variableType}`)
        }
    }

    visitExpressionStatement(statement: ExpressionStatement) {
        this.visitExpression(statement.expression)
    }

    visitExpression(expression: Expression): DataType {
        switch (expression.type) {
            case AstType.Identifier:
                return this.visitIdentifier(expression as Identifier)
            case AstType.IntegerLiteral:
                return this.visitIntegerLiteral(expression as IntegerLiteral)
            case AstType.FloatLiteral:
                return this.visitFloatLiteral(expression as FloatLiteral)
            case AstType.StringLiteral:
                return this.visitStringLiteral(expression as StringLiteral)
            case AstType.BinaryExpression:
                return this.visitBinaryExpression(expression as BinaryExpression)
            case AstType.UnaryExpression:
                return this.visitUnaryExpression(expression as UnaryExpression)
            case AstType.CallExpression:
                return this.visitCallExpression(expression as CallExpression)
            case AstType.MemberAccessExpression:
                return this.visitMemberAccessExpression(expression as MemberAccessExpression)
            default:
                throw new Error(`Unhandled expression type: ${expression.type}`)
        }
    }

    visitIdentifier(identifier: Identifier): DataType {
        const variable = this.symbolTable.lookup(identifier.value) as VariableSymbol
        if (!variable) {
            throw new Error(`Undefined variable '${identifier.value}'`)
        };
        return variable.dataType
    }

    visitIntegerLiteral(_integer: IntegerLiteral): DataType {
        return DataType.i32
    }

    visitFloatLiteral(_float: FloatLiteral): DataType {
        return DataType.f32
    }

    visitStringLiteral(_str: StringLiteral): DataType {
        return DataType.i32 // Assuming strings are represented as pointers (i32)
    }

    visitBinaryExpression(expression: BinaryExpression): DataType {
        const leftType = this.visitExpression(expression.left)
        const rightType = this.visitExpression(expression.right)
    
        if (leftType !== rightType) {
            throw new Error(`Type mismatch: Cannot perform binary operation on types ${leftType} and ${rightType}`)
        }
    
        return leftType
    }

    visitUnaryExpression(expression: UnaryExpression): DataType {
        const rightType = this.visitExpression(expression.right)

        if (expression.operator === TokenType.Minus && rightType !== DataType.i32 && rightType !== DataType.f32) {
            throw new Error(`Invalid unary operator '-' for type ${rightType}`)
        }

        return rightType
    }
    
    visitCallExpression(expression: CallExpression): DataType {
        const symbol = this.symbolTable.getFunction(expression.callee.value)

        if (!symbol) {
            throw new Error(`Undefined function '${expression.callee.value}'`)
        }

        switch (symbol.type) {
            case SymbolType.Function: {
                const functionInfo = symbol as FunctionSymbol 
                if (expression.arguments.length !== functionInfo.params.length) {
                    throw new Error(`Incorrect number of arguments for function '${expression.callee.value}'. Expected ${functionInfo.params.length}, but got ${expression.arguments.length}`)
                }
        
                for (let i = 0; i < expression.arguments.length; i++) {
                    const argType = this.visitExpression(expression.arguments[i])
                    const paramType = functionInfo.params[i]
            
                    if (argType !== paramType) {
                        throw new Error(`Type mismatch: Argument ${i + 1} of function '${expression.callee.value}' expected type ${paramType}, but got ${argType}`)
                    }
                }
                return functionInfo.returnType
            }
            case SymbolType.Struct: {
                return DataType.struct
            }
            default:
                throw new Error('Placeholder')
        } 
    }

    visitMemberAccessExpression(expression: MemberAccessExpression): DataType {
        const objectType = this.visitExpression(expression.base)
        if (objectType !== DataType.struct) {
            throw new Error('Member access is only allowed on struct instances')
        }

        if (expression.base.type !== AstType.Identifier) {
            throw new Error('Should be Identifier')
        }

        const symbol = this.symbolTable.lookup((expression.base as Identifier).value)

        if (!symbol) {
            throw new Error('Doesn\'t exist')
        }

        const structName = (symbol as VariableSymbol).instanceOf
        const structSymbol = this.symbolTable.getFunction(structName!) as StructSymbol
        const memberType = structSymbol.members.get(expression.member.value)
        if (!memberType) {
            throw new Error(`Member ${expression.member.value} not found in struct ${structSymbol.name}`)
        }

        return memberType
    }
}