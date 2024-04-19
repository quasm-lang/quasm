import {
    Token,
    TokenType,
    DataType,
    DataTypeToken
} from './token.ts'

import { Lexer } from './lexer.ts'

import {
    Program,
    Statement,
    BlockStatement,
    ExpressionStatement,
    FnStatement,
    ReturnStatement,
    LetStatement,
    Expression,
    BinaryExpression,
    CallExpression,
    IntegerLiteral,
    Identifier,
    Field,
    Spec,
    SourceLocation,
    AstType
} from './ast.ts'

export class Parser {
    private curToken: Token
    
    constructor(private lexer: Lexer) {
        this.curToken = this.advance()
    }

    private eof() {
        return this.curToken.type == TokenType.EOF
    }

    private peek(): Token {
        return this.lexer.peekToken()
    }

    private advance() {
        this.curToken = this.lexer.nextToken()
        // console.log(this.curToken) // For DEBUGGING purpose
        return this.curToken
    }

    private consume(): Token {
        const prev = this.curToken
        this.curToken = this.advance()
        return prev
    }

    private eq(type: TokenType): boolean {
        return this.curToken.type == type
    }

    private eqAny(types: TokenType[]): Token | null {
        return types.includes(this.curToken.type) ? this.curToken : null
    }

    private eqPeek(token: TokenType): boolean {
        return this.lexer.peekToken().type === token
    }

    private match(type: TokenType): Token {
        if (this.eq(type)) {
            return this.consume()
        }
        throw Error(`Parser error: Expected '${type}', but got '${this.curToken.type}'`)
    }

    private matchAny(types: TokenType[]): Token {
        if (this.eqAny(types)) {
            const token = this.consume()
            return token
        }
    
        throw new Error(`Parser error: Unexpected token type. Expected one of: '${types.join(', ')}', but got '${this.curToken.type}'`)
    }

    private eqDataType(): boolean {
        const token = this.eqAny([TokenType.Int, TokenType.Float, TokenType.None])
        return token !== null ? true : false
    }

    private matchDataType(): DataTypeToken {
        return this.matchAny([TokenType.Int, TokenType.Float, TokenType.None]) as DataTypeToken
    }

    private getLocation(): SourceLocation {
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
        
        while (!this.eof()) {
            const statement = this.parseStatement()
            statements.push(statement)
        }

        return {
            type: AstType.Program,
            statements,
            location: this.getLocation()
        }
    }

    private parseStatement(): Statement {
        let statement: Statement

        if (this.eq(TokenType.Fn)) {
            statement = this.parseFunctionStatement()
        } else if (this.eq(TokenType.Return)) {
            statement = this.parseReturnStatement()
        } else if (this.eq(TokenType.Let)) {
            statement = this.parseLetStatement()
        }
        else {
            statement = this.parseExpressionStatement()
        }

        return statement
    }

    private parseBlockStatement(): BlockStatement {
        const statements: Statement[] = []
        
        while (
            !this.eq(TokenType.RightBrace) &&
            !this.eq(TokenType.EOF)
        ) {
            const statement = this.parseStatement()
            statements.push(statement)
        }
        
        this.match(TokenType.RightBrace)

        return {
            type: AstType.BlockStatement,
            statements,
            location: this.getLocation()
        }
    }

    private parseFunctionStatement(): FnStatement {
        this.match(TokenType.Fn)

        const name: Identifier = {
            type: AstType.Identifier,
            value: this.match(TokenType.Identifier).literal,
            location: this.getLocation()
        }

        this.match(TokenType.LeftParen)
        const parameters = this.parseFnDeclarationParameters()
        this.match(TokenType.RightParen)

        let returnType: DataType = TokenType.None; // Default return type
        if (this.eq(TokenType.RightArrow)) {      // scenario in which type exists
            this.consume()
            const returnToken = this.matchDataType()
            returnType = returnToken.type
        }

        this.match(TokenType.LeftBrace)
        const block = this.parseBlockStatement()

        return {
            type: AstType.FnStatement,
            name,
            parameters,
            returnType,
            body: block,
            location: this.getLocation()
        }
    }

    private parseFnDeclarationParameters(): Field[] {
        const parameters: Field[] = []

        while (!this.eq(TokenType.RightParen)) {
            const name: Identifier = {
                type: AstType.Identifier,
                value: this.match(TokenType.Identifier).literal,
                location: this.getLocation()
            }

            const dataTypeToken: DataTypeToken = this.matchDataType()
            const dataType = dataTypeToken.type

            const param: Field = {
                type: AstType.Field,
                name: name,
                dataType,
                location: this.getLocation()
            }

            parameters.push(param)
    
            if (!this.eq(TokenType.RightParen)) {
                this.match(TokenType.Comma)
            }
        }
    
        return parameters
    }

    private parseReturnStatement(): ReturnStatement {
        this.match(TokenType.Return)
        const value = this.parseExpression()

        return {
            type: AstType.ReturnStatement,
            value,
            location: this.getLocation()
        }
    }

    private parseLetStatement(): LetStatement {
        this.match(TokenType.Let)

        const name: Identifier = {
            type: AstType.Identifier,
            value: this.match(TokenType.Identifier).literal,
            location: this.getLocation()
        }

        let dataType: DataType | undefined
        let value: Expression | undefined

        if (this.eqDataType()) {
            const dataTypeToken = this.matchDataType()
            dataType = dataTypeToken.type
        }
    
        if (this.eq(TokenType.EqualSign)) {
            this.match(TokenType.EqualSign)
            value = this.parseExpression()
        }

        const spec: Spec = {
            type: AstType.Spec,
            name,
            dataType,
            value,
            location: this.getLocation()
        }

        return {
            type: AstType.LetStatement,
            spec,
            location: this.getLocation()
        }
    }

    private parseExpressionStatement(): ExpressionStatement {
        const expression = this.parseExpression()

        return {
            type: AstType.ExpressionStatement,
            expression,
            location: this.getLocation()
        }
    }

    private parseExpression(): Expression {
        return this.parseTerm()
    }

    private parseCallExpression(identifier: Identifier): CallExpression {
        this.match(TokenType.LeftParen)
        const args: Expression[] = this.parseCallArguments()
        this.match(TokenType.RightParen)
    
        return {
            type: AstType.CallExpression,
            callee: identifier,
            arguments: args,
            location: this.getLocation()
        }
    }

    private parseCallArguments(): Expression[] {
        const args: Expression[] = []

        while (!this.eq(TokenType.RightParen)) {
            args.push(this.parseExpression())
    
            if (!this.eq(TokenType.RightParen)) {
                this.match(TokenType.Comma)
            }
        }

        return args
    }

    private parseTerm(): Expression {
        let left = this.parseFactor()

        while (this.eq(TokenType.Plus) || this.eq(TokenType.Minus)) {
            const operatorToken = this.consume()
            const operator = operatorToken.type
            const right = this.parseFactor()
            left = {
                type: AstType.BinaryExpression,
                left,
                operator,
                right,
                location: this.getLocation()
            } as BinaryExpression
        }

        return left
    }

    private parseFactor(): Expression {
        let left = this.parsePrimary()

        while (
            this.eq(TokenType.Asterisk) || this.eq(TokenType.Slash)
        ) {
            const operatorToken = this.consume()
            const operator = operatorToken.type
            const right = this.parsePrimary()
            left = {
                type: AstType.BinaryExpression,
                left,
                operator,
                right,
                location: this.getLocation()
            } as BinaryExpression
        }

        return left
    }

    private parsePrimary(): Expression {
        switch (this.curToken.type) {
            case TokenType.Number:
                return {
                    type: AstType.IntegerLiteral,
                    value: parseInt(this.consume().literal),
                    location: this.getLocation()
                } as IntegerLiteral
            case TokenType.Identifier: {
                const identifier: Identifier = {
                    type: AstType.Identifier,
                    value: this.consume().literal,
                    location: this.getLocation()
                }

                if (this.eq(TokenType.LeftParen)) {
                    return this.parseCallExpression(identifier)
                } else {
                    return identifier
                }
            }
            default:
                throw Error(`Parser Error: Unexpected token '${this.curToken.type}'`)
        }
    }
}