import { AstType } from '../parser/ast.ts'
import * as Ast from '../parser/ast.ts'
import { VariableSymbol, SymbolTable, SymbolType, FunctionSymbol, VariableReason } from './symbolTable.ts'
import { TokenType } from '../lexer/token.ts'
import { DataType } from '../datatype/mod.ts'

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
            case AstType.IfStatement:
                this.visitIfStatement(statement as Ast.IfStatement)
                break
            case AstType.BlockStatement:
                this.visitWhileStatement(statement as Ast.WhileStatement)
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
    
        const inferredType = this.visitExpression(value)

        if (dataType && inferredType !== dataType) {
            throw new Error(`Type mismatch: Expected ${dataType}, but got ${inferredType} for variable '${name.value}'`)
        }

        const finalType = dataType || inferredType
        statement.spec.dataType = finalType

        this.symbolTable.define({
            type: SymbolType.Variable,
            name: name.value,
            dataType: finalType,
            reason: VariableReason.Declaration
        } as VariableSymbol)

        return finalType
    }

    visitFuncStatement(func: Ast.FuncStatement) {
        const { parameters, returnType /* TODO: validate return type */, body } = func
    
        // Create a new scope for the function
        this.symbolTable.enterFunc()
    
        // Add function parameters to the symbol table
        for (const [index, param] of parameters.entries()) {
            this.symbolTable.define({
                type: SymbolType.Variable,
                name: param.name.value,
                dataType: param.dataType,
                index,
                reason: VariableReason.Parameter
            } as VariableSymbol)
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
        this.symbolTable.exitFunc()
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
        }
    }

    visitIfStatement(statement: Ast.IfStatement) {
        const conditionType = this.visitExpression(statement.condition)
        if (conditionType !== DataType.i32) {
            throw new Error(`Condition in if statement must be of type i32, got ${conditionType}`)
        }

        this.symbolTable.enterScope()
        for (const stmt of statement.body.statements) {
            this.visitStatement(stmt)
        }
        this.symbolTable.exitScope()

        if (statement.alternate) {
            this.symbolTable.enterScope()
            if (statement.alternate.type === AstType.IfStatement) {
                this.visitIfStatement(statement.alternate as Ast.IfStatement)
            } else {
                for (const stmt of (statement.alternate as Ast.BlockStatement).statements) {
                    this.visitStatement(stmt)
                }
            }
            this.symbolTable.exitScope()
        }
    }

    visitWhileStatement(statement: Ast.WhileStatement) {
        const conditionType = this.visitExpression(statement.condition)
        if (conditionType !== DataType.i32) {
            throw new Error(`Condition in while statement must be of type i32, got ${conditionType}`)
        }

        this.symbolTable.enterScope()
        for (const stmt of statement.body.statements) {
            this.visitStatement(stmt)
        }
        this.symbolTable.exitScope()
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
        return DataType.f64
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

        if (expression.operator === TokenType.Minus && rightType !== DataType.i32 && rightType !== DataType.f64) {
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
                throw new Error('Invalid symbol type')
        } 
    }
}