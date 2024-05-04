import { binaryen } from '../deps.ts'

import {
    Node,
    AstType,
    Program,
    Statement,
    Expression,
    LetStatement,
    FnStatement,
    ReturnStatement,
    ExpressionStatement,
    BinaryExpression,
    CallExpression,
    IntegerLiteral,
    Identifier,
    StringLiteral,
    AssignmentStatement,
    UnaryExpression
} from '../parser/ast.ts'
import { TokenType, DataType } from '../parser/token.ts'
import { getWasmType } from './utils.ts'
import { VariableInfo, SymbolTable } from './symbolTable.ts'

export class CodegenVisitor {
    private module: binaryen.Module
    private symbolTable: SymbolTable
    private memoryOffset = 0
    private segment: binaryen.MemorySegment[] = []

    constructor() {
        this.module = new binaryen.Module()
        this.symbolTable = new SymbolTable()
        
        this.module.addFunctionImport(
            'println',
            'env',
            'println',
            binaryen.i32,
            binaryen.none
        )
        
        this.module.addFunctionImport(
            'printstr',
            'env',
            'printstr',
            binaryen.createType([binaryen.i32]),
            binaryen.none
        )

        this.symbolTable.addFunction('println', [binaryen.i32], binaryen.none)
        this.symbolTable.addFunction('printstr', [binaryen.i32], binaryen.none)
    }
    
    public visit(node: Node) {
        if (node.type !== AstType.Program) {
            throw new Error(`Not valid program: ${node.type}`)
        }
        try {
            // First pass: Collect function declarations
            this.collectFunctionDeclarations(node as Program)

            const _program = this.visitProgram(node as Program)
            // console.log(_program)
        } catch (err) {
            const error = err as Error
            console.log(error)
            Deno.exit(1)
        }
        this.module.setMemory(1, 1, 'memory', this.segment)
        return this.module
    }

    private collectFunctionDeclarations(program: Program) {
        for (const statement of program.statements) {
            if (statement.type == AstType.FnStatement) {
                const func = statement as FnStatement
                const name = func.name.value
                const params = func.parameters.map(param => getWasmType(param.dataType))
                const returnType = getWasmType(func.returnType)

                // Add the function information to the symbol table
                this.symbolTable.addFunction(name, params, returnType)
            }
        }
    }

    private visitProgram(program: Program): binaryen.ExpressionRef[] {
        const statements: binaryen.ExportRef[] = []
        for (const statement of program.statements) {
            if (statement.type !== AstType.FnStatement) {
                throw new Error(`Invalid statement outside of function at line ${statement.location.start.line}`)
            }
            statements.push(this.visitStatement(statement))
        }
        return statements
    }

    private visitStatement(statement: Statement): binaryen.ExpressionRef {
        switch (statement.type) {
            case AstType.ExpressionStatement:
                return this.visitExpressionStatement(statement as ExpressionStatement)
            case AstType.LetStatement:
                return this.visitLetStatement(statement as LetStatement)
            case AstType.FnStatement:
                return this.visitFnStatement(statement as FnStatement)
            case AstType.ReturnStatement:
                return this.visitReturnStatement(statement as ReturnStatement)
            case AstType.AssignmentStatement:
                return this.visitAssignmentStatement(statement as AssignmentStatement)
            default:
                throw new Error(`Unhandled statement type: ${statement.type}`)
        }
    }

    private visitLetStatement(statement: LetStatement): binaryen.ExpressionRef {
        const name = statement.spec.name.value
        const dataType = statement.spec.dataType
        const value = statement.spec.value
        
        if (dataType === undefined && value === undefined) {
            throw new Error(`Illegal let declaration!`)
        }
        
        let initExpr: binaryen.ExpressionRef
        if (value) {
            initExpr = this.visitExpression(value)
        } else {
            initExpr = this.module.i32.const(0) // Initialize to zero if no value is provided
        }
        
        const index = this.symbolTable.currentScopeLastIndex()
        this.symbolTable.addVariable(name, dataType || DataType.i32, index, 'declaration')
        
        return this.module.local.set(index, initExpr)
    }

    private visitFnStatement(func: FnStatement): binaryen.ExpressionRef {
        const name = func.name.value

        // handle parameters
        const params = []
        const newScope = new Map<string, VariableInfo>()
        this.symbolTable.enterScope(newScope)

        for (const [index, param] of func.parameters.entries()) {
            params.push(getWasmType(param.dataType))
            this.symbolTable.addVariable(param.name.value, param.dataType, index, 'parameter')
        }

        // handle return type
        const returnType = getWasmType(func.returnType)

        // handle body
        const statements = func.body.statements.map(statement => this.visitStatement(statement))
        const block = this.module.block(null, statements)

        // handles declared variables in the body
        const vars: binaryen.ExpressionRef[] = []
        for (const [_name, value] of this.symbolTable.last()) {
            if (value.reason === 'declaration') {
                vars.push(getWasmType(value.type))
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

    private visitReturnStatement(statement: ReturnStatement): binaryen.ExpressionRef {
        return this.module.return(this.visitExpression(statement.value))
    }

    private visitAssignmentStatement(statement: AssignmentStatement): binaryen.ExpressionRef {
        const name = statement.name.value
        const value = this.visitExpression(statement.value)

        // Find the identifier in the current scope stack
        const index = this.symbolTable.findIndex(name)
        return this.module.local.set(index, value)
    }

    private visitExpressionStatement(statement: ExpressionStatement): binaryen.ExpressionRef {
        const expression = this.visitExpression(statement.expression)

        switch (statement.expression.type) {
            case AstType.Identifier:
            case AstType.IntegerLiteral:
            case AstType.BinaryExpression: {
                return this.module.drop(expression)
            }
        }

        return expression
    }
    
    private visitExpression(expr: Expression): binaryen.ExpressionRef {
        switch (expr.type) {
            case AstType.UnaryExpression:
                return this.visitUnaryExpression(expr as UnaryExpression)
            case AstType.BinaryExpression:
                return this.visitBinaryExpression(expr as BinaryExpression)
            case AstType.IntegerLiteral:
                return this.visitNumerical(expr as IntegerLiteral)
            case AstType.StringLiteral:
                return this.visitStringLiteral(expr as StringLiteral)
            case AstType.Identifier:
                    return this.visitIdentifier(expr as Identifier)
            case AstType.CallExpression:
                return this.visitCallExpression(expr as CallExpression)
            // Add cases for other expression types as needed
            default:
                throw new Error(`Unhandled expression type: ${expr.type}`)
        }
    }

    // TODO (IMPORTANT!): Need to distinguish between function call into assignment vs just calling the function, if it's just calling the function module has to drop
    private visitCallExpression(expression: CallExpression): binaryen.ExpressionRef {
        // const args = expression.arguments.map(arg => this.visitExpression(arg))
        // const returnType = binaryen.getFunctionInfo(this.module.getFunction(expression.callee.value)).results
        // const callExpr = this.module.call(expression.callee.value, args, returnType)
        // return callExpr
        const name = expression.callee.value

        // Check if the function is declared in the symbol table
        const functionInfo = this.symbolTable.getFunction(name)
        if (!functionInfo) {
            throw new Error(`Undefined function: ${name}`)
        }

        const args = expression.arguments.map(arg => this.visitExpression(arg))
        const callExpr = this.module.call(name, args, functionInfo.returnType)
        return callExpr
    }
    
    private visitUnaryExpression(expr: UnaryExpression): binaryen.ExpressionRef {
        const right = this.visitExpression(expr.right)
        
        switch (expr.operator) {
            case TokenType.Minus:
                return this.module.i32.sub(this.module.i32.const(0), right)
            default:
                throw new Error(`Unhandled unary operator ${expr.operator}`)
        }
    }
    
    private visitBinaryExpression(node: BinaryExpression): binaryen.ExpressionRef {
        const left = this.visitExpression(node.left)
        const right = this.visitExpression(node.right)
    
        switch (node.operator) {
            case TokenType.Plus:
                return this.module.i32.add(left, right)
            case TokenType.Minus:
                return this.module.i32.sub(left, right)
            case TokenType.Asterisk:
                return this.module.i32.mul(left, right)
            case TokenType.Slash:
                return this.module.i32.div_s(left, right)
            default:
                throw new Error(`Unhandled binary operator: ${node.operator}`)
        }
    }
    
    private visitNumerical(node: IntegerLiteral): binaryen.ExpressionRef {
        return this.module.i32.const(node.value)
    }

    // Returns initial pointer of string
    private visitStringLiteral(node: StringLiteral): binaryen.ExpressionRef {
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
    

    private visitIdentifier(identifier: Identifier): binaryen.ExpressionRef {
        const index = this.symbolTable.findIndex(identifier.value)
        return this.module.local.get(index, binaryen.i32) // Assuming i32 for simplicity
    }
}