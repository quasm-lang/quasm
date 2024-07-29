import { binaryen } from '../deps.ts'

import { AstType } from '../parser/ast.ts'
import * as Ast from '../parser/ast.ts'

import { TokenType } from '../lexer/token.ts'
import * as Type from '../datatype/mod.ts'
import { FunctionSymbol, StringLiteralSymbol, SymbolTable, SymbolType, VariableReason, VariableSymbol } from '../symbolTable.ts'
import { SemanticAnalyzer } from './semanticAnalyzer.ts'

export class CodeGenerator {
    private module: binaryen.Module
    private semanticAnalyzer: SemanticAnalyzer
    private segment: binaryen.MemorySegment[] = [] 

    constructor(private symbolTable: SymbolTable) {
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
        if (node.type !== AstType.Program) 
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
            if (statement.type !== AstType.FuncStatement) {
                throw new Error(`Invalid statement outside of function at line ${statement.location.start.line}`)
            }
            statements.push(this.visitStatement(statement))
        }
        return statements
    }

    private visitStatement(statement: Ast.Statement): binaryen.ExpressionRef {
        switch (statement.type) {
            case AstType.ExpressionStatement:
                return this.visitExpressionStatement(statement as Ast.ExpressionStatement)
            case AstType.LetStatement:
                return this.visitLetStatement(statement as Ast.LetStatement)
            case AstType.FuncStatement:
                return this.visitFuncStatement(statement as Ast.FuncStatement)
            case AstType.ReturnStatement:
                return this.visitReturnStatement(statement as Ast.ReturnStatement)
            case AstType.AssignmentStatement:
                return this.visitAssignmentStatement(statement as Ast.AssignmentStatement)
            case AstType.IfStatement:
                return this.visitIfStatement(statement as Ast.IfStatement)
            case AstType.WhileStatement:
                return this.visitWhileStatement(statement as Ast.WhileStatement)
            case AstType.PrintStatement:
                return this.visitPrintStatement(statement as Ast.PrintStatement)
            default:
                throw new Error(`Unhandled statement type: ${statement.type}`)
        }
    } 

    private visitLetStatement(statement: Ast.LetStatement): binaryen.ExpressionRef {
        const { name, dataType, value } = statement.spec
        
        const initExpr = this.visitExpression(value)

        if (!dataType) {
            throw new Error(`Type inference failed for variable ${name.value}`)
        }

        this.symbolTable.define({
            type: SymbolType.Variable,
            name: name.value,
            dataType,
            reason: VariableReason.Declaration
        } as VariableSymbol)

        const index = this.symbolTable.getIndex(name.value)
        if (index === undefined) {
            throw new Error(`Failed to get index for variable ${name.value}`)
        }
        
        return this.module.local.set(index, initExpr)
    }

    private visitFuncStatement(func: Ast.FuncStatement): binaryen.ExpressionRef {
        const name = func.name.value

        // handle parameters
        this.symbolTable.enterFunc()
        const params = []
        const funcSymbol = this.symbolTable.lookup(SymbolType.Function, name) as FunctionSymbol

        for (const [index, param] of func.parameters.entries()) {
            params.push(funcSymbol.params[index].toWasmType())
            this.symbolTable.define({
                type: SymbolType.Variable,
                name: param.name.value,
                dataType: Type.fromString(param.dataType.value),
                index,
                reason: VariableReason.Parameter
            } as VariableSymbol)
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
            case AstType.Identifier: {
                const name = (statement.left as Ast.Identifier).value
                const value = this.visitExpression(statement.value)
        
                // Find the identifier in the current scope stack
                const variable = this.symbolTable.lookup(SymbolType.Variable, name) as VariableSymbol
        
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
            if (statement.alternate.type === AstType.IfStatement) { // else if block
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
            case AstType.UnaryExpression:
                return this.visitUnaryExpression(expression as Ast.UnaryExpression)
            case AstType.BinaryExpression:
                return this.visitBinaryExpression(expression as Ast.BinaryExpression)
            case AstType.IntegerLiteral:
                return this.visitNumerical(expression as Ast.IntegerLiteral)
            case AstType.FloatLiteral:
                return this.visitNumerical(expression as Ast.FloatLiteral)
            case AstType.StringLiteral:
                return this.visitStringLiteral(expression as Ast.StringLiteral)
            case AstType.Identifier:
                    return this.visitIdentifier(expression as Ast.Identifier)
            case AstType.CallExpression:
                return this.visitCallExpression(expression as Ast.CallExpression)
            // Add cases for other expression types as needed
            default:
                throw new Error(`Unhandled expression type: ${expression.type}`)
        }
    }

    private visitCallExpression(expression: Ast.CallExpression): binaryen.ExpressionRef {
        const name = expression.callee.value

        // Check if the function is declared in the symbol table
        const symbol = this.symbolTable.lookup(SymbolType.Function, name)
        if (!symbol) {
            throw new Error(`Undefined call expression: ${name}`)
        }

        switch (symbol.type) {
            case SymbolType.Function: {
                const funcSymbol = symbol as FunctionSymbol
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
            case TokenType.Minus:
                return this.module.i32.sub(this.module.i32.const(0), right)
            default:
                throw new Error(`Unhandled unary operator ${expression.operator}`)
        }
    }
    
    private visitBinaryExpression(node: Ast.BinaryExpression): binaryen.ExpressionRef {
        const left = this.visitExpression(node.left)
        const right = this.visitExpression(node.right)

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
            case TokenType.Plus:
                return resultType === binaryen.f64 ? this.module.f64.add(convertedLeft, convertedRight) : this.module.i32.add(convertedLeft, convertedRight)
            case TokenType.Minus:
                return resultType === binaryen.f64 ? this.module.f64.sub(convertedLeft, convertedRight) : this.module.i32.sub(convertedLeft, convertedRight)
            case TokenType.Asterisk:
                return resultType === binaryen.f64 ? this.module.f64.mul(convertedLeft, convertedRight) : this.module.i32.mul(convertedLeft, convertedRight)
            case TokenType.Slash:
                return resultType === binaryen.f64 ? this.module.f64.div(convertedLeft, convertedRight) : this.module.i32.div_s(convertedLeft, convertedRight)
            case TokenType.GreaterThan:
                return this.module.i32.gt_s(left, right)
            case TokenType.LessThan:
                return this.module.i32.lt_s(left, right)
            case TokenType.Equality:
                return this.module.i32.eq(left, right)
            case TokenType.GreaterThanOrEqual:
                return this.module.i32.ge_s(left, right)
            case TokenType.LessThanOrEqual:
                return this.module.i32.le_s(left, right)
            default:
                throw new Error(`Unhandled binary operator: ${node.operator}`)
        }
    }
    
    private visitNumerical(node: Ast.IntegerLiteral | Ast.FloatLiteral): binaryen.ExpressionRef {
        if (node.type === AstType.FloatLiteral) 
            return this.module.f64.const(node.value)
        return this.module.i32.const(node.value)
    }

    // Returns initial pointer of string
    private visitStringLiteral(node: Ast.StringLiteral): binaryen.ExpressionRef {
        const symbol = this.symbolTable.lookup(SymbolType.StringLiteral, node.value) as StringLiteralSymbol
        if (symbol.offset === undefined) {
            throw new Error(`String literal offset not found: ${node.value}`)
        }
        return this.module.i32.const(symbol.offset)
    }
    

    private visitIdentifier(identifier: Ast.Identifier): binaryen.ExpressionRef {
        const variable = this.symbolTable.lookup(SymbolType.Variable, identifier.value) as VariableSymbol
        if (variable === undefined) {
            throw new Error(`Variable ${identifier.value} not found in scope`)
        }
        
        return this.module.local.get(variable.index, variable.dataType.toWasmType())
    }
}