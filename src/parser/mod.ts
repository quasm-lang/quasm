import {
    Token,
    TokenType,
    DataTypeToken
} from '../lexer/token.ts'

import { Lexer } from '../lexer/mod.ts'

import { AstType } from './ast.ts'
import * as Ast from './ast.ts'

import {
    parseFuncStatement,
    parseReturnStatement,
    parseLetStatement,
    parseAssignmentStatement,
    parseExpressionStatement,
    parseStructStatement,
    parseWhileStatement,
    parseIfStatement,
    parsePrintStatement
} from './statements/mod.ts'
import { parseExpression } from "./expressions/mod.ts";

export class Parser {
    curToken: Token
    
    constructor(private lexer: Lexer) {
        this.curToken = this.lexer.nextToken()
    }

    private eof() {
        return this.curToken.type == TokenType.EOF
    }

    // private peek(): Token {
    //     return this.lexer.peekToken()
    // }

    consume(): Token {
        const prev = this.curToken
        this.curToken = this.lexer.nextToken()
        return prev
    }

    eq(type: TokenType): boolean {
        return this.curToken.type == type
    }

    // private eqAny(types: TokenType[]): Token | null {
    //     return types.includes(this.curToken.type) ? this.curToken : null
    // }

    peekEq(token: TokenType): boolean {
        return this.lexer.peekToken().type === token
    }

    match(type: TokenType): Token {
        if (this.eq(type)) {
            return this.consume()
        }
        throw Error(`Parser error: Expected '${type}', but got '${this.curToken.type}' at line ${this.curToken.line} column ${this.curToken.column}`)
    }

    // private matchAny(types: TokenType[]): Token {
    //     if (this.eqAny(types)) {
    //         const token = this.consume()
    //         return token
    //     }
    
    //     throw new Error(`Parser error: Unexpected token type. Expected one of: '${types.join(', ')}', but got '${this.curToken.type}'`)
    // }

    eqDataType(): boolean {
        return this.curToken.type === TokenType.Type
    }

    matchDataType(): DataTypeToken {
        if (this.curToken.type === TokenType.Type) {
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
            return parseFuncStatement(this)
        } else if (this.eq(TokenType.Return)) {
            return parseReturnStatement(this)
        } else if (this.eq(TokenType.Let)) {
            return parseLetStatement(this)
        } else if (this.eq(TokenType.Struct)) {
            return parseStructStatement(this)
        } else if (this.eq(TokenType.If)) {
            return parseIfStatement(this)
        } else if (this.eq(TokenType.While)) {
            return parseWhileStatement(this)
        } else if (this.eq(TokenType.Print)) {
            return parsePrintStatement(this)
        } else {
            const expr = parseExpression(this)
            if (this.eq(TokenType.Assignment)) {
                return parseAssignmentStatement(this, expr)
            } else {
                return parseExpressionStatement(this, expr)
            }
        }
    }

    // Misc
    parseExport(): Ast.FuncStatement {
        this.match(TokenType.Export)
        
        if (this.eq(TokenType.Func)) {
            const statement = parseFuncStatement(this)
            statement.exported = true
            return statement
        }

        throw new Error('Parser error: Unexpected token after export.')
    }
}