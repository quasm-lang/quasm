import { binaryen } from '../deps.ts'

import { AstType } from '../parser/ast.ts'
import * as Ast from '../parser/ast.ts'

import { DataType, TokenType } from '../lexer/token.ts'
import { getWasmType } from './utils.ts'
import { FunctionSymbol, StringLiteralSymbol, StructSymbol, SymbolTable, SymbolType, VariableSymbol } from './symbolTable.ts'
import { SemanticAnalyzer } from './semanticAnalyzer.ts'

export class CodeGenerator {
    private module: binaryen.Module
    // private symbolTable: SymbolTable
    private semanticAnalyzer: SemanticAnalyzer
    private memoryOffset = 0
    private segment: binaryen.MemorySegment[] = []

    constructor(private symbolTable: SymbolTable) {
        this.module = new binaryen.Module()
        // this.symbolTable = new SymbolTable()
        this.semanticAnalyzer = new SemanticAnalyzer(this.symbolTable)
        
        this.module.addFunctionImport(
            '__print_i32',
            'env',
            '__print_i32',
            binaryen.i32,
            binaryen.none
        )
        
        this.module.addFunctionImport(
            '__print_str',
            'env',
            '__print_str',
            binaryen.createType([binaryen.i32]),
            binaryen.none
        )
        
        // this.symbolTable.addFunction({ type: SymbolType.Function, name: 'print', params: [DataType.i32], returnType: DataType.none } as FunctionSymbol)
        // this.symbolTable.addFunction({ type: SymbolType.Function, name: 'printstr', params: [DataType.i32], returnType: DataType.none } as FunctionSymbol)
    }
    
    public visit(node: Ast.Node) {
        if (node.type !== AstType.Program) 
            throw new Error(`Not valid program: ${node.type}`)

        try {
            this.module.setFeatures(binaryen.Features.All)
            this.prepareStringSegments()
            this.module.setMemory(1, 16, 'memory', this.segment)
            
            // First pass: Collect function declarations
            this.collectFirstPass(node as Ast.Program)
            
            // Second pass: Semantic Analyzer
            const semanticAnalyzer = new SemanticAnalyzer(this.symbolTable)
            semanticAnalyzer.check(node as Ast.Program)
            
            // Third pass: Generate WebAssembly code
            this.visitProgram(node as Ast.Program)
            
            this.module.autoDrop()
        } catch (err) {
            const error = err as Error
            console.log(error)
            Deno.exit(1)
        }
        
        return this.module
    }

    private prepareStringSegments() {
        let currentOffset = 0;
        for (const value of this.symbolTable.getStringLiterals()) {
            const strBytes = new TextEncoder().encode(value)
            const lengthBytes = new Uint8Array(4)
            new DataView(lengthBytes.buffer).setUint32(0, strBytes.length, true)
            
            const fullData = new Uint8Array(4 + strBytes.length)
            fullData.set(lengthBytes)
            fullData.set(strBytes, 4)

            this.segment.push({
                offset: this.module.i32.const(currentOffset),
                data: fullData,
                passive: false
            })

            this.symbolTable.updateStringLiteralOffset(value, currentOffset)
            currentOffset += fullData.length
        }
        this.memoryOffset = currentOffset
    }

    private collectFirstPass(program: Ast.Program) {
        for (const statement of program.statements) {
            if (statement.type === AstType.FuncStatement) {
                const func = statement as Ast.FuncStatement
                const name = func.name.value
                const params = func.parameters.map(param => param.dataType)
                const returnType = func.returnType

                // Add the function information to the symbol table
                this.symbolTable.define({ type: SymbolType.Function, name, params, returnType } as FunctionSymbol)
            }
        }
    }

    private visitProgram(program: Ast.Program): binaryen.ExpressionRef[] {
        const statements: binaryen.ExportRef[] = []
        for (const statement of program.statements) {
            if (statement.type === AstType.StructDeclaration) {
                continue
            }
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
        const { name, value } = statement.spec
        
        let initExpr: binaryen.ExpressionRef
        // let inferredType: DataType | undefined

        if (value) {
            initExpr = this.visitExpression(value)
            // inferredType = this.inferDataType(value)
        } else {
            initExpr = this.module.i32.const(0) // Initialize to zero if no value is provided
            // inferredType = DataType.i32
        }
        
        // const index = this.symbolTable.currentScopeLastIndex()
        const finalType = this.semanticAnalyzer.visitLetStatement(statement)

        const index = this.symbolTable.currentScopeLastIndex()
        this.symbolTable.define({ type: SymbolType.Variable, name: name.value, dataType: finalType, index, reason: 'declaration' } as VariableSymbol)
        
        return this.module.local.set(index, initExpr)
    }

    private visitFuncStatement(func: Ast.FuncStatement): binaryen.ExpressionRef {
        const name = func.name.value

        // handle parameters
        const params = []
        this.symbolTable.enterScope()

        for (const [index, param] of func.parameters.entries()) {
            params.push(getWasmType(param.dataType))
            this.symbolTable.define({ type: SymbolType.Variable, name: param.name.value, dataType: param.dataType, index, reason: 'parameter' } as VariableSymbol)
        }

        // handle return type
        const returnType = getWasmType(func.returnType)

        // handle body
        const statements = func.body.statements.map(statement => this.visitStatement(statement))
        const block = this.module.block(null, statements)

        // handles declared variables in the body
        const vars: binaryen.ExpressionRef[] = []
        for (const [_name, value] of this.symbolTable.last().symbols) {
            switch (value.type) {
                case SymbolType.Variable:
                    if ((value as VariableSymbol).reason === 'declaration') {
                        vars.push(getWasmType((value as VariableSymbol).dataType))
                    }
            }
        }
        
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
        const consequent = statement.consequent.statements.map(statement => this.visitStatement(statement))

        // TODO: possibly nest the if blocks to achieve if-else blocks
        let alternate: binaryen.ExpressionRef[] = []
        if (statement.alternate) {
            alternate = (statement.alternate as Ast.BlockStatement).statements.map(statement => this.visitStatement(statement))
        }

        return this.module.if(
            condition,
            this.module.block(null, consequent),
            alternate.length > 0 ? this.module.block(null, alternate) : undefined
        )
    }

    private visitWhileStatement(statement: Ast.WhileStatement): binaryen.ExpressionRef {
        const condition = this.visitExpression(statement.condition)
        const body = statement.body.statements.map(statement => this.visitStatement(statement))
        
        const loopBlock = this.module.loop("loop", this.module.block(null, [
            // Check the condition: if it's false, break out of the loop to the 'while' block
            this.module.br_if('while', this.module.i32.eqz(condition)),
            // Loop body
            this.module.block(null, body),
            // Continue at the top of the loop body
            this.module.br("loop")
        ]))

        return this.module.block("while", [loopBlock], binaryen.none)
    }

    private visitPrintStatement(statement: Ast.PrintStatement): binaryen.ExpressionRef {
        const dataType = this.semanticAnalyzer.visitExpression(statement.expression)
        const val = this.visitExpression(statement.expression)

        switch (dataType) {
            case DataType.string:
                return this.module.call('__print_str', [val], binaryen.none)
            default:
                return this.module.call('__print_i32', [val], binaryen.none)
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
                const functionInfo = symbol as FunctionSymbol
                const args = expression.arguments.map(arg => this.visitExpression(arg))
                return this.module.call(name, args, getWasmType(functionInfo.returnType))
            }
            case SymbolType.Struct: {
                const structSymbol = symbol as StructSymbol
                const args = expression.arguments.map(arg => this.visitExpression(arg))
                this.memoryOffset += structSymbol.size
                return this.module.call(`__newStruct_${structSymbol.name}`, args, binaryen.i32)
            }
            default:
                throw new Error('Placeholder')
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
            if (leftType === binaryen.i32 && rightType === binaryen.f32) {
                convertedLeft = this.module.f32.convert_s.i32(left)
            } else if (leftType === binaryen.f32 && rightType === binaryen.i32) {
                convertedRight = this.module.f32.convert_s.i32(right)
            } else {
                throw new Error(`Type ${leftType} and ${rightType} are not compatible for binary expression`)
            }
        }
    
        const resultType = leftType === binaryen.f32 || rightType === binaryen.f32 ? binaryen.f32 : binaryen.i32
    
        switch (node.operator) {
            case TokenType.Plus:
                return resultType === binaryen.f32 ? this.module.f32.add(convertedLeft, convertedRight) : this.module.i32.add(convertedLeft, convertedRight)
            case TokenType.Minus:
                return resultType === binaryen.f32 ? this.module.f32.sub(convertedLeft, convertedRight) : this.module.i32.sub(convertedLeft, convertedRight)
            case TokenType.Asterisk:
                return resultType === binaryen.f32 ? this.module.f32.mul(convertedLeft, convertedRight) : this.module.i32.mul(convertedLeft, convertedRight)
            case TokenType.Slash:
                return resultType === binaryen.f32 ? this.module.f32.div(convertedLeft, convertedRight) : this.module.i32.div_s(convertedLeft, convertedRight)
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
            return this.module.f32.const(node.value)
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
        
        return this.module.local.get(variable.index, getWasmType(variable.dataType))
    }
}