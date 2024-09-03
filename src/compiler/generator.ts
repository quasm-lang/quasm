import { binaryen } from '../deps.ts'

import * as Ast from '../parser/ast.ts'
import * as Type from '../datatype/mod.ts'
import * as Token from '../lexer/token.ts'
import * as Symbol from '../symbolTable.ts'
import { SemanticAnalyzer } from './semanticAnalyzer.ts'

export class CodeGenerator {
    private module: binaryen.Module
    private semanticAnalyzer: SemanticAnalyzer
    private segment: binaryen.MemorySegment[] = [] 

    constructor(private symbolTable: Symbol.SymbolTable) {
        this.module = new binaryen.Module()
        this.semanticAnalyzer = new SemanticAnalyzer(this.symbolTable)
        
        this.module.addFunctionImport(
            '__print_i32',
            'env',
            '__print_primitive',
            binaryen.i32,
            binaryen.none
        )

        this.module.addFunctionImport(
            '__print_f64',
            'env',
            '__print_primitive',
            binaryen.f64,
            binaryen.none
        )
        
        this.module.addFunctionImport(
            '__print_str',
            'env',
            '__print_str',
            binaryen.i32,
            binaryen.none
        )
    }
    
    public visit(node: Ast.Node) {
        if (node.type !== Ast.Type.Program) 
            throw new Error(`Not valid program: ${node.type}`)

        try {
            this.module.setFeatures(binaryen.Features.All)
            this.prepareStringSegments()

            // Analyze semantics
            const semanticAnalyzer = new SemanticAnalyzer(this.symbolTable)
            semanticAnalyzer.check(node as Ast.Program)
            
            // Generate WebAssembly code
            this.visitProgram(node as Ast.Program) 
        } catch (err) {
            const error = err as Error
            console.log(error)
            Deno.exit(1)
        }
        
        this.module.autoDrop()
        return this.module
    }

    private prepareStringSegments() {
        for (const segment of this.symbolTable.segment) {
            this.segment.push({
                offset: this.module.i32.const(segment.offset),
                data: segment.data,
                passive: false
            })
        }

        this.module.setMemory(1, 16, 'memory', this.segment)
    }

    private visitProgram(program: Ast.Program): binaryen.ExpressionRef[] {
        const statements: binaryen.ExportRef[] = []
        for (const statement of program.statements) {
            if (statement.type !== Ast.Type.FuncStatement) {
                throw new Error(`Invalid statement outside of function at line ${statement.location.start.line}`)
            }
            statements.push(this.visitStatement(statement))
        }
        return statements
    }

    private visitStatement(statement: Ast.Statement): binaryen.ExpressionRef {
        switch (statement.type) {
            case Ast.Type.ExpressionStatement:
                return this.visitExpressionStatement(statement as Ast.ExpressionStatement)
            case Ast.Type.VarStatement:
                return this.visitVarStatement(statement as Ast.VarStatement)
            case Ast.Type.FuncStatement:
                return this.visitFuncStatement(statement as Ast.FuncStatement)
            case Ast.Type.ReturnStatement:
                return this.visitReturnStatement(statement as Ast.ReturnStatement)
            case Ast.Type.AssignmentStatement:
                return this.visitAssignmentStatement(statement as Ast.AssignmentStatement)
            case Ast.Type.IfStatement:
                return this.visitIfStatement(statement as Ast.IfStatement)
            case Ast.Type.WhileStatement:
                return this.visitWhileStatement(statement as Ast.WhileStatement)
            case Ast.Type.PrintStatement:
                return this.visitPrintStatement(statement as Ast.PrintStatement)
            default:
                throw new Error(`Unhandled statement type: ${statement.type}`)
        }
    } 

    private visitVarStatement(statement: Ast.VarStatement): binaryen.ExpressionRef {
        const { value, dataType } = statement
        
        const initExpr = this.visitExpression(value)
        const exprType = dataType!

        if (exprType.kind === Type.TypeKind.Tuple) {
            const setLocals: binaryen.ExpressionRef[] = []
            const tupleType = exprType as Type.TupleType

            statement.specs.forEach((spec, index) => {
                const localIndex = this.symbolTable.defineVariable(
                    spec.name.value,
                    tupleType.elementTypes[index],
                    Symbol.VariableReason.Declaration
                )

                setLocals.push(
                    this.module.local.set(
                        localIndex,
                        this.module.tuple.extract(this.visitExpression(value), index)
                    )
                )

            })
            
            return this.module.block(null, setLocals)
        }

        const spec = statement.specs[0]
        const localIndex = this.symbolTable.defineVariable(
            spec.name.value,
            exprType,
            Symbol.VariableReason.Declaration
        )

        return this.module.local.set(localIndex, initExpr)
    }

    private visitFuncStatement(func: Ast.FuncStatement): binaryen.ExpressionRef {
        const name = func.name.value

        // handle parameters
        this.symbolTable.enterFunc()
        const params = []
        const funcSymbol = this.symbolTable.lookup(Symbol.Type.Function, name) as Symbol.Function

        for (const [index, param] of func.parameters.entries()) {
            params.push(funcSymbol.params[index].toWasmType())
            this.symbolTable.defineVariable(
                param.name.value,
                param.dataType,
                Symbol.VariableReason.Parameter
            )
        }

        // handle return type
        const returnType = func.returnType.toWasmType()

        // handle body
        const statements = func.body.statements.map(statement => this.visitStatement(statement))
        const block = this.module.block(null, statements)

        // handles declared variables in the body
        const allVars = this.symbolTable.exitFunc()
        const vars: binaryen.Type[] = allVars.map(v => v.dataType.toWasmType())
        
        const wasmFunc = this.module.addFunction(
            name,
            binaryen.createType(params),
            returnType,
            vars,
            block
        )
        
        this.symbolTable.exitScope()

        // dynamically export based on modifier
        if (name === 'main' || func.exported) {
            this.module.addFunctionExport(name, name)
        }

        return wasmFunc
    }

    private visitReturnStatement(statement: Ast.ReturnStatement): binaryen.ExpressionRef {
        return this.module.return(this.visitExpression(statement.value))
    }

    private visitAssignmentStatement(statement: Ast.AssignmentStatement): binaryen.ExpressionRef {
        switch (statement.left.type) {
            case Ast.Type.Identifier: {
                const name = (statement.left as Ast.Identifier).value
                const value = this.visitExpression(statement.value)
        
                // Find the identifier in the current scope stack
                const variable = this.symbolTable.lookup(Symbol.Type.Variable, name) as Symbol.Variable
        
                if (variable === undefined) {
                    throw new Error(`Variable ${name} doesn\'t exist`)
                }
                
                return this.module.local.set(variable.index, value)
            }
            default:
                throw new Error(`Invalid left-hand side of assignment: ${statement.left.type}`)
        }
    }

    private visitIfStatement(statement: Ast.IfStatement): binaryen.ExpressionRef {
        const condition = this.visitExpression(statement.condition)

        this.symbolTable.enterScope()
        const body = statement.body.statements.map(statement => this.visitStatement(statement))
        this.symbolTable.exitScope()

        let alternate: binaryen.ExpressionRef | undefined
        if (statement.alternate) {
            this.symbolTable.enterScope()
            if (statement.alternate.type === Ast.Type.IfStatement) { // else if block
                alternate = this.visitIfStatement(statement.alternate as Ast.IfStatement)
            } else {
                const elseStatements = (statement.alternate as Ast.BlockStatement).statements.map(stmt => this.visitStatement(stmt))
                alternate = this.module.block(null, elseStatements)
            }
            this.symbolTable.exitScope()
        }

        return this.module.if(
            condition,
            this.module.block(null, body),
            alternate
        )
    }

    private visitWhileStatement(statement: Ast.WhileStatement): binaryen.ExpressionRef {
        const condition = this.visitExpression(statement.condition)
        const body = statement.body.statements.map(statement => this.visitStatement(statement))
        
        const loopBlock = this.module.loop('loop', this.module.block(null, [
            // Check the condition: if it's false, break out of the loop to the 'while' block
            this.module.br_if('while', this.module.i32.eqz(condition)),
            // Loop body
            this.module.block(null, body),
            // Continue at the top of the loop body
            this.module.br('loop')
        ]))

        return this.module.block('while', [loopBlock], binaryen.none)
    }

    private visitPrintStatement(statement: Ast.PrintStatement): binaryen.ExpressionRef {
        const dataType = this.semanticAnalyzer.visitExpression(statement.expression)
        const val = this.visitExpression(statement.expression)
        
        switch (dataType.kind) {
            case Type.TypeKind.Primitive: 
                switch ((dataType as Type.PrimitiveType).primitiveKind) {
                    case Type.PrimitiveKind.String:
                        return this.module.call('__print_str', [val], binaryen.none)
                    case Type.PrimitiveKind.i32:
                        return this.module.call('__print_i32', [val], binaryen.none)
                    case Type.PrimitiveKind.f64:
                        return this.module.call('__print_f64', [val], binaryen.none)
                    default:
                        throw new Error(`Invalid primitive type for print statement: ${(dataType as Type.PrimitiveType).primitiveKind}`)
                }
            default:
                throw new Error(`Invalid print statement: ${dataType}`)
        }
    }

    private visitExpressionStatement(statement: Ast.ExpressionStatement): binaryen.ExpressionRef {
        const expression = this.visitExpression(statement.expression)
        return expression
    }
    
    private visitExpression(expression: Ast.Expression): binaryen.ExpressionRef {
        switch (expression.type) {
            case Ast.Type.UnaryExpression:
                return this.visitUnaryExpression(expression as Ast.UnaryExpression)
            case Ast.Type.BinaryExpression:
                return this.visitBinaryExpression(expression as Ast.BinaryExpression)
            case Ast.Type.IntegerLiteral:
                return this.visitNumerical(expression as Ast.IntegerLiteral)
            case Ast.Type.FloatLiteral:
                return this.visitNumerical(expression as Ast.FloatLiteral)
            case Ast.Type.StringLiteral:
                return this.visitStringLiteral(expression as Ast.StringLiteral)
            case Ast.Type.TupleLiteral:
                return this.visitTupleLiteral(expression as Ast.TupleLiteral)
            case Ast.Type.Identifier:
                    return this.visitIdentifier(expression as Ast.Identifier)
            case Ast.Type.CallExpression:
                return this.visitCallExpression(expression as Ast.CallExpression)
            // Add cases for other expression types as needed
            default:
                throw new Error(`Unhandled expression type: ${expression.type}`)
        }
    }

    private visitCallExpression(expression: Ast.CallExpression): binaryen.ExpressionRef {
        const name = expression.callee.value

        // Check if the function is declared in the symbol table
        const symbol = this.symbolTable.lookup(Symbol.Type.Function, name)
        if (!symbol) {
            throw new Error(`Undefined call expression: ${name}`)
        }

        switch (symbol.type) {
            case Symbol.Type.Function: {
                const funcSymbol = symbol as Symbol.Function
                const args = expression.arguments.map(arg => this.visitExpression(arg))
                const returnType = funcSymbol.returnType.toWasmType()
                return this.module.call(name, args, returnType)
            }
            default:
                throw new Error(`Invalid function symbol type: ${symbol.type}`)
        }

    }
    
    private visitUnaryExpression(expression: Ast.UnaryExpression): binaryen.ExpressionRef {
        const right = this.visitExpression(expression.right)
        
        switch (expression.operator) {
            case Token.Type.Minus:
                return this.module.i32.sub(this.module.i32.const(0), right)
            case Token.Type.LogicalNot:
                return this.module.i32.eqz(right)
            default:
                throw new Error(`Unhandled unary operator ${expression.operator}`)
        }
    }
    
    private visitBinaryExpression(node: Ast.BinaryExpression): binaryen.ExpressionRef {
        const left = this.visitExpression(node.left)
        const right = this.visitExpression(node.right)

        /** TODO: Remove deprecated type code in binary expression */
        const leftType = binaryen.getExpressionType(left)
        const rightType = binaryen.getExpressionType(right)

        // Perform type conversion if necessary
        let convertedLeft = left
        let convertedRight = right

        if (leftType !== rightType) {
            if (leftType === binaryen.i32 && rightType === binaryen.f64) {
                convertedLeft = this.module.f64.convert_s.i32(left)
            } else if (leftType === binaryen.f64 && rightType === binaryen.i32) {
                convertedRight = this.module.f64.convert_s.i32(right)
            } else {
                throw new Error(`Type ${leftType} and ${rightType} are not compatible for binary expression`)
            }
        }
    
        const resultType = leftType === binaryen.f64 || rightType === binaryen.f64 ? binaryen.f64 : binaryen.i32
    
        switch (node.operator) {
            case Token.Type.Plus:
                return resultType === binaryen.f64 ? this.module.f64.add(convertedLeft, convertedRight) : this.module.i32.add(convertedLeft, convertedRight)
            case Token.Type.Minus:
                return resultType === binaryen.f64 ? this.module.f64.sub(convertedLeft, convertedRight) : this.module.i32.sub(convertedLeft, convertedRight)
            case Token.Type.Asterisk:
                return resultType === binaryen.f64 ? this.module.f64.mul(convertedLeft, convertedRight) : this.module.i32.mul(convertedLeft, convertedRight)
            case Token.Type.Slash:
                return resultType === binaryen.f64 ? this.module.f64.div(convertedLeft, convertedRight) : this.module.i32.div_s(convertedLeft, convertedRight)
            case Token.Type.GreaterThan:
                return this.module.i32.gt_s(left, right)
            case Token.Type.LessThan:
                return this.module.i32.lt_s(left, right)
            case Token.Type.Equality:
                return this.module.i32.eq(left, right)
            case Token.Type.GreaterThanOrEqual:
                return this.module.i32.ge_s(left, right)
            case Token.Type.LessThanOrEqual:
                return this.module.i32.le_s(left, right)
            case Token.Type.LogicalAnd:
                return this.module.i32.and(left, right)
            case Token.Type.LogicalOr:
                return this.module.i32.or(left, right)
            default:
                throw new Error(`Unhandled binary operator: ${node.operator}`)
        }
    }
    
    private visitNumerical(node: Ast.IntegerLiteral | Ast.FloatLiteral): binaryen.ExpressionRef {
        if (node.type === Ast.Type.FloatLiteral) 
            return this.module.f64.const(node.value)
        return this.module.i32.const(node.value)
    }

    // Returns initial pointer of string
    private visitStringLiteral(node: Ast.StringLiteral): binaryen.ExpressionRef {
        const symbol = this.symbolTable.lookup(Symbol.Type.StringLiteral, node.value) as Symbol.StringLiteral
        if (symbol.offset === undefined) {
            throw new Error(`String literal offset not found: ${node.value}`)
        }
        return this.module.i32.const(symbol.offset)
    }
    
    private visitTupleLiteral(tuple: Ast.TupleLiteral): binaryen.ExpressionRef {
        const elements = tuple.elements.map(element => this.visitExpression(element))
        return this.module.tuple.make(elements)
    }

    private visitIdentifier(identifier: Ast.Identifier): binaryen.ExpressionRef {
        const variable = this.symbolTable.lookup(Symbol.Type.Variable, identifier.value) as Symbol.Variable
        if (variable === undefined) {
            throw new Error(`Variable ${identifier.value} not found in scope`)
        }
        
        return this.module.local.get(variable.index, variable.dataType.toWasmType())
    }
}