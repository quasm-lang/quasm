import {
    Token,
    TokenType,
    DataTypeToken
} from '../lexer/token.ts'

import { Lexer } from '../lexer/mod.ts'

import {
    Program,
    Statement,
    FuncStatement,
    Field,
    SourceLocation,
    AstType
} from './ast.ts'
import { parseIdentifier} from './expressions/core.ts'

import {
    parseFuncStatement,
    parseReturnStatement,
    parseLetStatement,
    parseAssignmentStatement,
    parseExpressionStatement,
    parseStructStatement,
    parseWhileStatement,
    parseIfStatement
} from './statements/mod.ts'

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

    getLocation(): SourceLocation {
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

    parseProgram(): Program {
        const statements: Statement[] = []
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

    parseStatement(): Statement {
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
        }else if (this.eq(TokenType.While)) {
            return parseWhileStatement(this)
        } else if (this.peekEq(TokenType.Assignment)) {
            return parseAssignmentStatement(this)
        } else {
            return parseExpressionStatement(this)
        }
    }

    // Misc
    parseExport(): FuncStatement {
        this.match(TokenType.Export)
        
        if (this.eq(TokenType.Func)) {
            const statement = parseFuncStatement(this)
            statement.exported = true
            return statement
        }

        throw new Error('Parser error: Unexpected token after export.')
    }

    parseFields(delimiter: TokenType | null, closingToken: TokenType): Field[] {
        const parameters: Field[] = []

        while (!this.eq(closingToken)) {
            const name = parseIdentifier(this)

            const dataTypeToken = this.matchDataType()

            const param: Field = {
                type: AstType.Field,
                name: name,
                dataType: dataTypeToken.literal,
                location: this.getLocation()
            }
            parameters.push(param)
    
            if (!this.eq(closingToken) && delimiter !== null) {
                this.match(delimiter)
            }
        }

        return parameters
    }
}