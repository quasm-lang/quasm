import { Lexer } from '../lexer/mod.ts'
import { SymbolTable } from '../symbolTable.ts'
import * as Ast from './ast.ts'
import * as Token from '../lexer/token.ts'

export class Parser {
    curToken: Token.Token
    
    constructor(private lexer: Lexer, public symbolTable: SymbolTable) {
        this.curToken = this.lexer.nextToken()
    }

    private eof() {
        return this.curToken.type === Token.Type.EOF
    }

    consume(): Token.Token {
        const prev = this.curToken
        this.curToken = this.lexer.nextToken()
        return prev
    }

    eq(type: Token.Type): boolean {
        return this.curToken.type === type
    }

    peekEq(token: Token.Type): boolean {
        return this.lexer.peekToken().type === token
    }

    match(type: Token.Type): Token.Token {
        if (this.eq(type)) {
            return this.consume()
        }
        throw Error(`Parser error: Expected '${type}', but got '${this.curToken.type}' at line ${this.curToken.line} column ${this.curToken.column}`)
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
                type: Ast.Type.Program,
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
        if (this.eq(Token.Type.Export)) {
            return this.parseExport()
        } else if (this.eq(Token.Type.Func)) {
            return this.parseFuncStatement()
        } else if (this.eq(Token.Type.Return)) {
            return this.parseReturnStatement()
        } else if (this.eq(Token.Type.Let)) {
            return this.parseLetStatement()
        } else if (this.eq(Token.Type.If)) {
            return this.parseIfStatement()
        } else if (this.eq(Token.Type.While)) {
            return this.parseWhileStatement()
        } else if (this.eq(Token.Type.Print)) {
            return this.parsePrintStatement()
        } else {
            const expr = this.parseExpression(0)
            if (this.eq(Token.Type.Assignment)) {
                return this.parseAssignmentStatement(expr)
            } else {
                return this.parseExpressionStatement(expr)
            }
        }
    }

    // Misc
    parseExport(): Ast.FuncStatement {
        this.match(Token.Type.Export)
        
        if (this.eq(Token.Type.Func)) {
            const statement = this.parseFuncStatement()
            statement.exported = true
            return statement
        }

        throw new Error('Parser error: Unexpected token after export.')
    }
}