import * as Ast from '../parser/ast.ts'
import * as Type from '../datatype/mod.ts'  
import * as Token from '../lexer/token.ts'
import * as Symbol from '../symbolTable.ts'
import * as DataType from '../datatype/mod.ts'

export class SemanticAnalyzer {
    constructor(private symbolTable: Symbol.SymbolTable) {}

    check(ast: Ast.Program) {
        this.visitProgram(ast)
    }

    visitProgram(program: Ast.Program) {
        for (const statement of program.statements) {
            this.visitStatement(statement)
        }
    }

    visitStatement(statement: Ast.Statement) {
        switch (statement.type) {
            case Ast.Type.VarStatement:
                this.visitVarStatement(statement as Ast.VarStatement)
                break
            case Ast.Type.FuncStatement:
                this.visitFuncStatement(statement as Ast.FuncStatement)
                break
            case Ast.Type.ReturnStatement:
                this.visitReturnStatement(statement as Ast.ReturnStatement)
                break
            case Ast.Type.AssignmentStatement:
                this.visitAssignmentStatement(statement as Ast.AssignmentStatement)
                break
            case Ast.Type.IfStatement:
                this.visitIfStatement(statement as Ast.IfStatement)
                break
            case Ast.Type.WhileStatement:
                this.visitWhileStatement(statement as Ast.WhileStatement)
                break
            case Ast.Type.ExpressionStatement:
                this.visitExpressionStatement(statement as Ast.ExpressionStatement)
                break
        }
    }

    visitVarStatement(statement: Ast.VarStatement) {
        const { specs, value } = statement
        const inferredType = this.visitExpression(value)
        statement.dataType = inferredType

        if (inferredType.kind === Type.TypeKind.Tuple) {
            const tupleType = inferredType as Type.TupleType
            if (specs.length !== tupleType.elementTypes.length) {
                throw new Error(`Tuple type mismatch: Can't extract ${tupleType.elementTypes.length} elements into ${specs.length}`)
            }

            for (const [i, spec] of specs.entries()) {
                const elementType = tupleType.elementTypes[i]
                if (spec.dataType && !spec.dataType.eq(elementType)) {
                    throw new Error(`Type mismatch for ${spec.name.value}: expected ${spec.dataType}, got ${elementType}`)
                }
                this.symbolTable.defineVariable(
                    spec.name.value,
                    spec.dataType || elementType,
                    Symbol.VariableReason.Declaration
                )
            }
        } else {
            if (specs.length !== 1) {
                throw new Error(`Cannot unpack non-tuple value into multiple variables`)
            }
    
            const spec = specs[0]
            if (spec.dataType && !spec.dataType.eq(inferredType)) {
                throw new Error(`Type mismatch for ${spec.name.value}: expected ${spec.dataType}, got ${inferredType}`)
            }
            
            this.symbolTable.defineVariable(
                spec.name.value,
                spec.dataType || inferredType,
                Symbol.VariableReason.Declaration
            )
        }
    }

    visitFuncStatement(func: Ast.FuncStatement) {
        const { parameters, /* TODO: validate return type */ body } = func
    
        // Create a new scope for the function
        this.symbolTable.enterFunc()
    
        // Add function parameters to the symbol table
        for (const param of parameters) {
            this.symbolTable.defineVariable(
                param.name.value,
                param.dataType,
                Symbol.VariableReason.Parameter
            )
        }
    
        // Visit the function body
        for (const bodyStatement of body.statements) {
            this.visitStatement(bodyStatement)
        }
    
        /* TODO: Validate the return type of the function
            Has to validate all the existing return in the function
            1. return statement could be a tuple, so we need to validate each element of the tuple
            2. return statement could be inside child nodes recursively (if, while, etc but not limited to)
        */ 
    
        // Exit the function scope
        this.symbolTable.exitFunc()
    }

    visitReturnStatement(statement: Ast.ReturnStatement) {
        this.visitExpression(statement.value)
    }

    visitAssignmentStatement(statement: Ast.AssignmentStatement) {
        const { left, value } = statement

        switch (left.type) {
            case Ast.Type.Identifier: {
                const left_ = left as Ast.Identifier
                const variableType = (this.symbolTable.lookup(Symbol.Type.Variable, left_.value) as Symbol.Variable)?.dataType
                const valueType = this.visitExpression(value)
                
                if (!variableType) {
                    throw new Error(`Undefined variable '${left_.value}'`)
                }
        
                if (variableType.kind !== valueType.kind) {
                    throw new Error(`Type mismatch: Cannot assign value of type ${valueType} to variable '${left_.value}' of type ${variableType}`)
                }
                break
            }
        }
    }

    visitIfStatement(statement: Ast.IfStatement) {
        const conditionType = this.visitExpression(statement.condition)
        if (!conditionType.eq(Type.i32)) {
            throw new Error(`Condition in if statement must be of type i32, got ${conditionType}`)
        }

        this.symbolTable.enterScope()
        for (const stmt of statement.body.statements) {
            this.visitStatement(stmt)
        }
        this.symbolTable.exitScope()

        if (statement.alternate) {
            this.symbolTable.enterScope()
            if (statement.alternate.type === Ast.Type.IfStatement) { 
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
        if (!conditionType.eq(Type.i32)) {
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

    visitExpression(expression: Ast.Expression): Type.DataType {
        switch (expression.type) {
            case Ast.Type.Identifier:
                return this.visitIdentifier(expression as Ast.Identifier)
            case Ast.Type.IntegerLiteral:
                return this.visitIntegerLiteral(expression as Ast.IntegerLiteral)
            case Ast.Type.FloatLiteral:
                return this.visitFloatLiteral(expression as Ast.FloatLiteral)
            case Ast.Type.StringLiteral:
                return this.visitStringLiteral(expression as Ast.StringLiteral)
            case Ast.Type.TupleLiteral:
                return this.visitTupleLiteral(expression as Ast.TupleLiteral)
            case Ast.Type.BinaryExpression:
                return this.visitBinaryExpression(expression as Ast.BinaryExpression)
            case Ast.Type.UnaryExpression:
                return this.visitUnaryExpression(expression as Ast.UnaryExpression)
            case Ast.Type.CallExpression:
                return this.visitCallExpression(expression as Ast.CallExpression)
            default:
                throw new Error(`Unhandled expression type: ${expression.type}`)
        }
    }

    visitIdentifier(identifier: Ast.Identifier): Type.DataType {
        const variable = this.symbolTable.lookup(Symbol.Type.Variable, identifier.value) as Symbol.Variable
        
        if (!variable) {
            throw new Error(`Undefined variable '${identifier.value}'`)
        }
        return variable.dataType
    }

    visitIntegerLiteral(_integer: Ast.IntegerLiteral): Type.DataType {
        return Type.i32
    }

    visitFloatLiteral(_float: Ast.FloatLiteral): Type.DataType {
        return Type.f64
    }

    visitStringLiteral(_str: Ast.StringLiteral): Type.DataType {
        return Type.String
    }

    visitTupleLiteral(expression: Ast.TupleLiteral): Type.DataType {
        const types = expression.elements.map(element => this.visitExpression(element))
        return Type.createTupleType(types)
    }

    visitBinaryExpression(expression: Ast.BinaryExpression): Type.DataType {
        const left = this.visitExpression(expression.left)
        const right = this.visitExpression(expression.right)

        const result = DataType.checkBinaryOperation(left, expression.operator, right)
        
        if (result === null)
            throw new Error(`Invalid binary operation: ${left} ${expression.operator} ${right}`)

        return result
    }

    visitUnaryExpression(expression: Ast.UnaryExpression): Type.DataType {
        const rightType = this.visitExpression(expression.right)

        if (expression.operator === Token.Type.Minus && !rightType.eq(Type.i32) && !rightType.eq(Type.f64)) {
            throw new Error(`Invalid unary operator '-' for type ${rightType}`)
        }

        return rightType
    }
    
    visitCallExpression(expression: Ast.CallExpression): Type.DataType {
        const symbol = this.symbolTable.lookup(Symbol.Type.Function, expression.callee.value)

        if (!symbol) {
            throw new Error(`Undefined function '${expression.callee.value}'`)
        }

        switch (symbol.type) {
            case Symbol.Type.Function: {
                const functionInfo = symbol as Symbol.Function
                if (expression.arguments.length !== functionInfo.params.length) {
                    throw new Error(`Incorrect number of arguments for function '${expression.callee.value}'. Expected ${functionInfo.params.length}, but got ${expression.arguments.length}`)
                }
        
                for (let i = 0; i < expression.arguments.length; i++) {
                    const argType = this.visitExpression(expression.arguments[i])
                    const paramType = functionInfo.params[i]
            
                    if (!argType.eq(paramType)) {
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