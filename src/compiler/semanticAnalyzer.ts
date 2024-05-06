import {
    AstType,
    Program,
    Statement,
    Expression,
    BinaryExpression,
    LetStatement,
    FnStatement,
    ReturnStatement,
    Identifier,
    IntegerLiteral,
    AssignmentStatement,
    CallExpression,
    FloatLiteral,
    StringLiteral,
    UnaryExpression,
    ExpressionStatement,
} from '../parser/ast.ts'
import { SymbolTable } from './symbolTable.ts'
import { DataType, TokenType } from '../parser/token.ts'

export class SemanticAnalyzer {
    private symbolTable: SymbolTable

    constructor(symbolTable: SymbolTable) {
        this.symbolTable = symbolTable
    }

    check(ast: Program) {
        this.visitProgram(ast)
    }

    private visitProgram(program: Program) {
        this.symbolTable.enterScope(new Map())
        
        for (const statement of program.statements) {
            this.visitStatement(statement)
        }

        this.symbolTable.exitScope()
    }

    private visitStatement(statement: Statement) {
        switch (statement.type) {
            case AstType.LetStatement:
                this.visitLetStatement(statement as LetStatement)
                break
            case AstType.FnStatement:
                this.visitFnStatement(statement as FnStatement)
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

    private visitLetStatement(statement: LetStatement) {
        const { name, dataType, value } = statement.spec
    
        let inferredType: DataType | undefined
    
        if (value) {
            inferredType = this.visitExpression(value)
        }
    
        const finalType = dataType || inferredType || DataType.none
    
        if (value && inferredType && dataType && inferredType !== dataType) {
            throw new Error(`Type mismatch: Expected ${dataType}, but got ${inferredType} for variable '${name.value}'`)
        }
    
        // Add the variable to the symbol table
        this.symbolTable.addVariable(name.value, finalType, 0, 'declaration')
    }

    private visitFnStatement(statement: FnStatement) {
        const { name, parameters, returnType, body } = statement
    
        // Create a new scope for the function
        this.symbolTable.enterScope(new Map())
    
        // Add function parameters to the symbol table
        for (const param of parameters) {
            this.symbolTable.addVariable(param.name.value, param.dataType, 0, 'parameter')
        }
    
        // Visit the function body
        for (const bodyStatement of body.statements) {
            this.visitStatement(bodyStatement)
        }
    
        // Check the return type of the function
        const lastStatement = body.statements[body.statements.length - 1]
        if (lastStatement.type === AstType.ReturnStatement) {
            const actualReturnType = this.visitExpression((lastStatement as ReturnStatement).value)
            if (actualReturnType !== returnType) {
                throw new Error(`Type mismatch: Expected return type ${returnType}, but got ${actualReturnType} for function '${name.value}'`)
            }
        } else if (returnType !== DataType.none) {
            throw new Error(`Missing return statement for function '${name.value}' with return type ${returnType}`)
        }
    
        // Exit the function scope
        this.symbolTable.exitScope()
    }

    private visitReturnStatement(statement: ReturnStatement) {
        this.visitExpression(statement.value)
    }

    private visitAssignmentStatement(statement: AssignmentStatement) {
        const { name, value } = statement
        const variableType = this.symbolTable.getVariable(name.value)?.type
        const valueType = this.visitExpression(value)

        if (!variableType) {
            throw new Error(`Undefined variable '${name.value}'`)
        }

        if (variableType !== valueType) {
            throw new Error(`Type mismatch: Cannot assign value of type ${valueType} to variable '${name.value}' of type ${variableType}`)
        }
    }

    private visitExpressionStatement(statement: ExpressionStatement) {
        this.visitExpression(statement.expression)
    }

    private visitExpression(expression: Expression): DataType {
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
            default:
                throw new Error(`Unhandled expression type: ${expression.type}`)
        }
    }

    private visitIdentifier(identifier: Identifier): DataType {
        const variable = this.symbolTable.getVariable(identifier.value)
        if (!variable) {
            throw new Error(`Undefined variable '${identifier.value}'`)
        }
        return variable.type
    }

    private visitIntegerLiteral(_integer: IntegerLiteral): DataType {
        return DataType.i32
    }

    private visitFloatLiteral(_float: FloatLiteral): DataType {
        return DataType.f32
    }

    private visitStringLiteral(_str: StringLiteral): DataType {
        return DataType.i32 // Assuming strings are represented as pointers (i32)
    }

    private visitBinaryExpression(expression: BinaryExpression): DataType {
        const leftType = this.visitExpression(expression.left)
        const rightType = this.visitExpression(expression.right)
    
        if (leftType !== rightType) {
            throw new Error(`Type mismatch: Cannot perform binary operation on types ${leftType} and ${rightType}`)
        }
    
        return leftType
    }

    private visitUnaryExpression(expression: UnaryExpression): DataType {
        const rightType = this.visitExpression(expression.right)

        if (expression.operator === TokenType.Minus && rightType !== DataType.i32 && rightType !== DataType.f32) {
            throw new Error(`Invalid unary operator '-' for type ${rightType}`)
        }

        return rightType
    }
    
private visitCallExpression(expression: CallExpression): DataType {
        const functionInfo = this.symbolTable.getFunction(expression.callee.value)

        if (!functionInfo) {
            throw new Error(`Undefined function '${expression.callee.value}'`)
        }

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
}