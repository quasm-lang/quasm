import { binaryen } from '../deps.ts'

import { AstType } from '../parser/ast.ts'
import * as Ast from '../parser/ast.ts'

import { TokenType, DataType } from '../lexer/token.ts'
import { getWasmType } from './utils.ts'
import { FunctionSymbol, StructSymbol, SymbolTable, SymbolType, VariableSymbol } from './symbolTable.ts'
import { SemanticAnalyzer } from './semanticAnalyzer.ts'

export class CodeGenerator {
    private module: binaryen.Module
    private symbolTable: SymbolTable
    private memoryOffset = 0
    private segment: binaryen.MemorySegment[] = []
    private semanticAnalyzer: SemanticAnalyzer

    constructor() {
        this.module = new binaryen.Module()
        this.symbolTable = new SymbolTable()
        this.semanticAnalyzer = new SemanticAnalyzer(this.symbolTable)
        
        this.module.addFunctionImport(
            '__print_i32',
            'env',
            '__print_i32',
            binaryen.i32,
            binaryen.none
        )
        
        this.module.addFunctionImport(
            '__printstr',
            'env',
            '__printstr',
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
            this.module.setMemory(1, 16, 'memory', this.segment)
            this.module.addGlobal('_memoryOffset', binaryen.i32, true, this.module.i32.const(0))

            // First pass: Collect function and struct declarations
            this.collectFirstPass(node as Ast.Program)

            // Second pass: Semantic Analyzer
            const semanticAnalyzer = new SemanticAnalyzer(this.symbolTable)
            semanticAnalyzer.check(node as Ast.Program)
            
            // Third pass: Generate WebAssembly code
            const _program = this.visitProgram(node as Ast.Program)
            // console.log(_program)
        } catch (err) {
            const error = err as Error
            console.log(error)
            Deno.exit(1)
        }

        this.module.autoDrop()
        
        return this.module
    }

    private collectFirstPass(program: Ast.Program) {
        for (const statement of program.statements) {
            if (statement.type === AstType.FuncStatement) {
                const func = statement as Ast.FuncStatement
                const name = func.name.value
                const params = func.parameters.map(param => param.dataType)
                const returnType = func.returnType

                // Add the function information to the symbol table
                this.symbolTable.addFunction({ type: SymbolType.Function, name, params, returnType } as FunctionSymbol)
            } else if (statement.type === AstType.StructDeclaration) {
                const struct = statement as Ast.StructDeclaration
                const name = struct.name.value
                const members = new Map<string, DataType>()

                let size = 0
                for (const field of struct.fields) {
                    if (field.dataType === DataType.i32) {
                        size = size + 4
                    }
                    members.set(field.name.value, field.dataType)
                }
                this.symbolTable.addFunction({ type: SymbolType.Struct, name, members, size } as StructSymbol)

                // Generate a function that creates a pointer to the struct
                const functionName = `__newStruct_${name}`
                const wasmParams = struct.fields.map(field => getWasmType(field.dataType))
                const block: binaryen.ExpressionRef[] = []

                const memoryOffset = this.module.global.get('_memoryOffset', binaryen.i32)
                const structPointer = this.module.local.tee(wasmParams.length, memoryOffset, binaryen.i32)

                let offset = 0
                for (let i = 0; i < wasmParams.length; i++) {
                    const param = this.module.local.get(i, wasmParams[i])
                    block.push(this.module.i32.store(offset, 4, structPointer, param))
                    offset += 4
                }
                // Update the memory offset in the WebAssembly module
                block.push(this.module.global.set('_memoryOffset', this.module.i32.add(memoryOffset, this.module.i32.const(size))))
                block.push(this.module.return(this.module.local.get(wasmParams.length, binaryen.i32)))

                this.module.addFunction(
                    functionName,
                    binaryen.createType(wasmParams),
                    binaryen.i32,
                    [binaryen.i32],
                    this.module.block(null, block, binaryen.i32)
                )
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
                return this.visitFnStatement(statement as Ast.FuncStatement)
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

    // private inferDataType(expression: Ast.Expression): DataType {
    //     return this.semanticAnalyzer.visitExpression(expression)
    // }    

    private visitLetStatement(statement: Ast.LetStatement): binaryen.ExpressionRef {
        const { value } = statement.spec
        
        let initExpr: binaryen.ExpressionRef
        // let inferredType: DataType | undefined

        if (value) {
            initExpr = this.visitExpression(value)
            // inferredType = this.inferDataType(value)
        } else {
            initExpr = this.module.i32.const(0) // Initialize to zero if no value is provided
            // inferredType = DataType.i32
        }

        // finalize the data type
        // const finalType = dataType || inferredType
        
        // const index = this.symbolTable.currentScopeLastIndex()
        const index = this.semanticAnalyzer.visitLetStatement(statement)
        
        return this.module.local.set(index, initExpr)
    }

    private visitFnStatement(func: Ast.FuncStatement): binaryen.ExpressionRef {
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
                const variable = this.symbolTable.lookup(name) as VariableSymbol
        
                if (variable === undefined) {
                    throw new Error(`Variable ${name} doesn\'t exist`)
                }
                
                return this.module.local.set(variable.index, value)
            }
            case AstType.MemberAccessExpression: {
                const memberAccess = statement.left as Ast.MemberAccessExpression
                const structPointer = this.visitExpression(memberAccess.base)
                const value = this.visitExpression(statement.value)

                const symbol = this.symbolTable.lookup((memberAccess.base as Ast.Identifier).value)
                const structName = (symbol as VariableSymbol).instanceOf
                const structSymbol = this.symbolTable.getFunction(structName!) as StructSymbol
                const memberIndex = Array.from(structSymbol.members.keys()).indexOf(memberAccess.member.value)

                if (memberIndex === -1) {
                    throw new Error(`Member '${memberAccess.member.value}' not found in struct '${structSymbol.name}'`)
                }

                const offset = memberIndex * 4 // Assuming each member is 4 bytes (i32)

                return this.module.i32.store(offset, 4, structPointer, value)
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
        const dataType = this.semanticAnalyzer.visitExpression(statement.expression) // TODO: call specific print function based on data type
        const val = this.visitExpression(statement.expression)
        return this.module.call('__print_i32', [val], binaryen.none)
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
            case AstType.MemberAccessExpression:
                return this.visitMemberAccessExpression(expression as Ast.MemberAccessExpression)
            // Add cases for other expression types as needed
            default:
                throw new Error(`Unhandled expression type: ${expression.type}`)
        }
    }

    private visitCallExpression(expression: Ast.CallExpression): binaryen.ExpressionRef {
        const name = expression.callee.value

        // Check if the function is declared in the symbol table
        const symbol = this.symbolTable.getFunction(name)
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

    private visitMemberAccessExpression(expression: Ast.MemberAccessExpression): binaryen.ExpressionRef {
        const symbol = this.symbolTable.lookup((expression.base as Ast.Identifier).value)
        const structName = (symbol as VariableSymbol).instanceOf
        const structSymbol = this.symbolTable.getFunction(structName!) as StructSymbol
        const memberIndex = Array.from(structSymbol.members.keys()).indexOf(expression.member.value)

        if (memberIndex === -1) {
            throw new Error(`Member '${expression.member.value}' not found in struct '${structSymbol.name}'`)
        }

        const offset = memberIndex * 4 // Assuming each member is 4 bytes (i32)

        const structPointer = this.visitExpression(expression.base)
        const memberPointer = this.module.i32.add(structPointer, this.module.i32.const(offset))

        
        const memberType = structSymbol.members.get(expression.member.value)!
        return this.module.i32.load(offset, 4, structPointer)
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
        const encodedString = new TextEncoder().encode(node.value + '\0') // includes the null terminator
        const stringPointer = this.module.i32.const(this.memoryOffset)

        // Append the string segment to the existing segment array
        this.segment.push({
            offset: stringPointer,
            data: encodedString
        })

        // Update the memory offset
        this.memoryOffset += encodedString.length
        
        return stringPointer
    }
    

    private visitIdentifier(identifier: Ast.Identifier): binaryen.ExpressionRef {
        const variable = this.symbolTable.lookup(identifier.value) as VariableSymbol
        if (variable === undefined) {
            throw new Error(`Variable ${identifier.value} not found in scope`)
        }
        
        return this.module.local.get(variable.index, getWasmType(variable.dataType))
    }
}