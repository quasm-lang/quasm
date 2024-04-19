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
    Identifier
} from '../parser/ast.ts'
import { TokenType, DataType } from '../parser/token.ts'
import { getWasmType } from './utils.ts'

export class CodegenVisitor {
    private module: binaryen.Module
    private scopes: Map<string, { type: DataType; index: number, reason: string }>[] = []
    private functionReturnTypes: Map<string, binaryen.Type> = new Map()
    
    constructor() {
        this.module = new binaryen.Module()
        this.module.addFunctionImport(
            'println',
            'env',
            'println',
            binaryen.i32,
            binaryen.none
        )
    }

    public visit(node: Node) {
        switch (node.type) {
            case AstType.Program:
                this.visitProgram(node as Program)
                break
            default:
                throw new Error(`Unhandled node type: ${node.type}`)
        }

        return this.module
    }

    private visitProgram(program: Program): binaryen.ExpressionRef[] {
        const statements: binaryen.ExportRef[] = []
        
        for (const statement of program.statements) {
            statements.push(this.visitStatement(statement))
        }

        return statements
    }

    private visitStatement(statement: Statement): binaryen.ExpressionRef {
        switch (statement.type) {
            case AstType.ExpressionStatement:
                return this.visitExpression((statement as ExpressionStatement).expression as Expression)
            case AstType.LetStatement:
                return this.visitLetStatement(statement as LetStatement)
            case AstType.FnStatement:
                return this.visitFnStatement(statement as FnStatement)
            case AstType.ReturnStatement:
                return this.visitReturnStatement(statement as ReturnStatement)
            default:
                throw new Error(`Unhandled statement type: ${statement.type}`);
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

        const index = this.scopes[this.scopes.length - 1].size
        this.scopes[this.scopes.length - 1].set(name, { type: TokenType.Int32, index, reason: 'declaration' })
        return this.module.local.set(index, initExpr)
    }

    private visitFnStatement(func: FnStatement): binaryen.ExpressionRef {
        const name = func.name.value

        // handle parameters
        const params = []
        const newScope = new Map<string, { type: DataType; index: number; reason: string }>()
        this.scopes.push(newScope)

        for (const [index, param] of func.parameters.entries()) {
            params.push(getWasmType(param.dataType))
            // locals.push(this.module.local.get(param.value, binaryen.i32));
            this.scopes[this.scopes.length-1].set(param.name.value, { type: TokenType.Int32, index, reason: 'parameter' })
        }

        // handle return type
        const returnType = getWasmType(func.returnType)
        this.functionReturnTypes.set(func.name.value, returnType)

        // handle body
        const statements = func.body.statements.map(statement => this.visitStatement(statement))
        const block = this.module.block(null, statements)

        // handles declared variables in the body
        const vars: binaryen.ExpressionRef[] = []
        for (const [_name, value] of this.scopes[this.scopes.length-1]) {
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
        
        this.scopes.pop()
        // for now all functions will be exported automatically
        this.module.addFunctionExport(name, name)

        return wasmFunc
    }

    private visitReturnStatement(statement: ReturnStatement) {
        return this.module.return(this.visitExpression(statement.value))
    }
    
    private visitExpression(expression: Expression): binaryen.ExpressionRef {
        switch (expression.type) {
            case AstType.BinaryExpression:
                return this.visitBinaryExpression(expression as BinaryExpression)
            case AstType.IntegerLiteral:
                return this.visitNumerical(expression as IntegerLiteral)
            case AstType.CallExpression:
                return this.visitCallExpression(expression as CallExpression)
            // Add cases for other expression types as needed
            case AstType.Identifier:
                return this.visitIdentifier(expression as Identifier)
            default:
                throw new Error(`Unhandled expression type: ${expression.type}`)
        }
    }

    // TODO (IMPORTANT!): Need to distinguish between function call into assignment vs just calling the function, if it's just calling the function module has to drop
    private visitCallExpression(expression: CallExpression): binaryen.ExpressionRef {
        const args = expression.arguments.map(arg => this.visitExpression(arg))
        // Look up the return type of the function being called
        const returnType = this.functionReturnTypes.get(expression.callee.value)
        
        if (expression.callee.value === 'println') {
            const printArgs = [args[0]] // Pass the first argument to the print function
            return this.module.call('println', printArgs, binaryen.none)
        } else {
            return (this.module.call(expression.callee.value, args, returnType!)) // IMPORTANT!!!!!!
        }
    }
    
    private visitBinaryExpression(node: BinaryExpression): binaryen.ExpressionRef {
        const left = this.visitExpression(node.left)
        const right = this.visitExpression(node.right)
    
        switch (node.operator) {
            case '+':
                return this.module.i32.add(left, right)
            case '-':
                return this.module.i32.sub(left, right)
            case '*':
                return this.module.i32.mul(left, right)
            case '/':
                return this.module.i32.div_s(left, right)
            default:
                throw new Error(`Unhandled binary operator: ${node.operator}`)
        }
    }
    
    private visitNumerical(node: IntegerLiteral): binaryen.ExpressionRef {
        return this.module.i32.const(node.value)
    }

    private visitIdentifier(node: Identifier): binaryen.ExpressionRef {
        // Find the identifier in the current scope stack
        for (let i = this.scopes.length - 1; i >= 0; i--) {
            if (this.scopes[i].has(node.value)) {
                const index = this.scopes[i].get(node.value)
                if (index === undefined) throw new Error(`Index for variable ${node.value} is undefined`)
                return this.module.local.get(index.index, binaryen.i32) // Assuming i32 for simplicity
            }
        }
        throw new Error(`Variable ${node.value} not found in any scope`)
    }
}