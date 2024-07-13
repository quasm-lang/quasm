import {
    Token,
    TokenType,
    DataTypeToken
} from '../lexer/token.ts'

import { Lexer } from '../lexer/mod.ts'

import { AstType } from './ast.ts'
import * as Ast from './ast.ts'

import { SymbolTable } from '../compiler/symbolTable.ts'

export class Parser {
    curToken: Token
    
    constructor(private lexer: Lexer, public symbolTable: SymbolTable) {
        this.curToken = this.lexer.nextToken()
    }

    private eof() {
        return this.curToken.type == TokenType.EOF
    }

    consume(): Token {
        const prev = this.curToken
        this.curToken = this.lexer.nextToken()
        return prev
    }

    eq(type: TokenType): boolean {
        return this.curToken.type == type
    }

    peekEq(token: TokenType): boolean {
        return this.lexer.peekToken().type === token
    }

    match(type: TokenType): Token {
        if (this.eq(type)) {
            return this.consume()
        }
        throw Error(`Parser error: Expected '${type}', but got '${this.curToken.type}' at line ${this.curToken.line} column ${this.curToken.column}`)
    }

    eqDataType(): boolean {
        return this.curToken.type === TokenType.DataType
    }

    matchDataType(): DataTypeToken {
        if (this.curToken.type === TokenType.DataType) {
            return this.consume() as DataTypeToken
        }
        throw new Error(`Parser error: Expected a data type, but got '${this.curToken.type}'`)
    }

    getLocation(): Ast.SourceLocation {
        return {
            start: {
                column: this.curToken.column,
                line: this.curToken.line
            },
            end: {
                column: this.curToken.column,
                line: this.curToken.line
            }
        }
    }

    parseProgram(): Ast.Program {
        const statements: Ast.Statement[] = []
        try {
            while (!this.eof()) {
                const statement = this.parseStatement()
                statements.push(statement)
            }
    
            return {
                type: AstType.Program,
                statements,
                location: this.getLocation()
            }
        } catch (err) {
            const error = err as Error
            console.log(error.message)
            Deno.exit(1)
        }
    }

    parseStatement(): Ast.Statement {
        if (this.eq(TokenType.Export)) {
            return this.parseExport()
        } else if (this.eq(TokenType.Func)) {
            return this.parseFuncStatement()
        } else if (this.eq(TokenType.Return)) {
            return this.parseReturnStatement()
        } else if (this.eq(TokenType.Let)) {
            return this.parseLetStatement()
        } else if (this.eq(TokenType.If)) {
            return this.parseIfStatement()
        } else if (this.eq(TokenType.While)) {
            return this.parseWhileStatement()
        } else if (this.eq(TokenType.Print)) {
            return this.parsePrintStatement()
        } else {
            const expr = this.parseExpression(0)
            if (this.eq(TokenType.Assignment)) {
                return this.parseAssignmentStatement(expr)
            } else {
                return this.parseExpressionStatement(expr)
            }
        }
    }

    // Misc
    parseExport(): Ast.FuncStatement {
        this.match(TokenType.Export)
        
        if (this.eq(TokenType.Func)) {
            const statement = this.parseFuncStatement()
            statement.exported = true
            return statement
        }

        throw new Error('Parser error: Unexpected token after export.')
    }
}