import { AstType } from '../parser/ast.ts'
import * as Ast from '../parser/ast.ts'
import { VariableSymbol, SymbolTable, SymbolType, FunctionSymbol, StructSymbol } from './symbolTable.ts'
import { DataType, TokenType } from '../lexer/token.ts'

export class SemanticAnalyzer {
    constructor(private symbolTable: SymbolTable) {}

    check(ast: Ast.Program) {
        this.visitProgram(ast)
    }

    visitProgram(program: Ast.Program) {
        this.symbolTable.enterScope()
        
        for (const statement of program.statements) {
            this.visitStatement(statement)
        }

        this.symbolTable.exitScope()
    }

    visitStatement(statement: Ast.Statement) {
        switch (statement.type) {
            case AstType.LetStatement:
                this.visitLetStatement(statement as Ast.LetStatement)
                break
            case AstType.FuncStatement:
                this.visitFuncStatement(statement as Ast.FuncStatement)
                break
            case AstType.ReturnStatement:
                this.visitReturnStatement(statement as Ast.ReturnStatement)
                break
            case AstType.AssignmentStatement:
                this.visitAssignmentStatement(statement as Ast.AssignmentStatement)
                break
            case AstType.ExpressionStatement:
                this.visitExpressionStatement(statement as Ast.ExpressionStatement)
                break
        }
    }

    visitLetStatement(statement: Ast.LetStatement): DataType {
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

        // let instanceOf: string | undefined
        // if (statement.spec.value && statement.spec.value.type === AstType.CallExpression) {
        //     const stmt = statement.spec.value as Ast.CallExpression
        //     const symbol = this.symbolTable.lookup(SymbolType.Function, stmt.callee.value)
        //     if (symbol?.type === SymbolType.Struct) {
        //         instanceOf = (symbol as StructSymbol).name
        //     }
        // }

        return finalType
    }

    visitFuncStatement(statement: Ast.FuncStatement) {
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

    visitReturnStatement(statement: Ast.ReturnStatement) {
        this.visitExpression(statement.value)
    }

    visitAssignmentStatement(statement: Ast.AssignmentStatement) {
        const { left, value } = statement

        switch (left.type) {
            case AstType.Identifier: {
                const left_ = left as Ast.Identifier
                const variableType = (this.symbolTable.lookup(SymbolType.Variable, left_.value) as VariableSymbol)?.dataType
                const valueType = this.visitExpression(value)
        
                if (!variableType) {
                    throw new Error(`Undefined variable '${left_.value}'`)
                }
        
                if (variableType !== valueType) {
                    throw new Error(`Type mismatch: Cannot assign value of type ${valueType} to variable '${left_.value}' of type ${variableType}`)
                }
                break
            }
            case AstType.MemberAccessExpression: {
                // TODO
                break
            }
        }
    }

    visitExpressionStatement(statement: Ast.ExpressionStatement) {
        this.visitExpression(statement.expression)
    }

    visitExpression(expression: Ast.Expression): DataType {
        switch (expression.type) {
            case AstType.Identifier:
                return this.visitIdentifier(expression as Ast.Identifier)
            case AstType.IntegerLiteral:
                return this.visitIntegerLiteral(expression as Ast.IntegerLiteral)
            case AstType.FloatLiteral:
                return this.visitFloatLiteral(expression as Ast.FloatLiteral)
            case AstType.StringLiteral:
                return this.visitStringLiteral(expression as Ast.StringLiteral)
            case AstType.BinaryExpression:
                return this.visitBinaryExpression(expression as Ast.BinaryExpression)
            case AstType.UnaryExpression:
                return this.visitUnaryExpression(expression as Ast.UnaryExpression)
            case AstType.CallExpression:
                return this.visitCallExpression(expression as Ast.CallExpression)
            // case AstType.MemberAccessExpression:
            //     return this.visitMemberAccessExpression(expression as Ast.MemberAccessExpression)
            default:
                throw new Error(`Unhandled expression type: ${expression.type}`)
        }
    }

    visitIdentifier(identifier: Ast.Identifier): DataType {
        const variable = this.symbolTable.lookup(SymbolType.Variable, identifier.value) as VariableSymbol
        if (!variable) {
            throw new Error(`Undefined variable '${identifier.value}'`)
        }
        return variable.dataType
    }

    visitIntegerLiteral(_integer: Ast.IntegerLiteral): DataType {
        return DataType.i32
    }

    visitFloatLiteral(_float: Ast.FloatLiteral): DataType {
        return DataType.f32
    }

    visitStringLiteral(_str: Ast.StringLiteral): DataType {
        return DataType.string
    }

    visitBinaryExpression(expression: Ast.BinaryExpression): DataType {
        const leftType = this.visitExpression(expression.left)
        const rightType = this.visitExpression(expression.right)
    
        if (leftType !== rightType) {
            throw new Error(`Type mismatch: Cannot perform binary operation on types ${leftType} and ${rightType}`)
        }
    
        return leftType
    }

    visitUnaryExpression(expression: Ast.UnaryExpression): DataType {
        const rightType = this.visitExpression(expression.right)

        if (expression.operator === TokenType.Minus && rightType !== DataType.i32 && rightType !== DataType.f32) {
            throw new Error(`Invalid unary operator '-' for type ${rightType}`)
        }

        return rightType
    }
    
    visitCallExpression(expression: Ast.CallExpression): DataType {
        const symbol = this.symbolTable.lookup(SymbolType.Function, expression.callee.value)

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
            default:
                throw new Error('Placeholder')
        } 
    }
}