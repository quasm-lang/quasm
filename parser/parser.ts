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
    AstType,
    UnaryExpression
} from './ast.ts'

export class Parser {
    private curToken: Token
    
    constructor(private lexer: Lexer) {
        this.curToken = this.lexer.nextToken()
    }

    private eof() {
        return this.curToken.type == TokenType.EOF
    }

    private peek(): Token {
        return this.lexer.peekToken()
    }

    private consume(): Token {
        const prev = this.curToken
        this.curToken = this.lexer.nextToken()
        return prev
    }

    private eq(type: TokenType): boolean {
        return this.curToken.type == type
    }

    private eqAny(types: TokenType[]): Token | null {
        return types.includes(this.curToken.type) ? this.curToken : null
    }

    private peekEq(token: TokenType): boolean {
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
        const token = this.eqAny([TokenType.Int32, TokenType.Float32, TokenType.None])
        return token !== null ? true : false
    }

    private matchDataType(): DataTypeToken {
        return this.matchAny([TokenType.Int32, TokenType.Float32, TokenType.None]) as DataTypeToken
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
            statement = this.parseFnStatement()
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

    private parseFnStatement(): FnStatement {
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

        this.match(TokenType.Semicolon)

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
    
        if (this.eq(TokenType.Assignment)) {
            this.match(TokenType.Assignment)
            value = this.parseExpression()
        }

        const spec: Spec = {
            type: AstType.Spec,
            name,
            dataType,
            value,
            location: this.getLocation()
        }

        this.match(TokenType.Semicolon)

        return {
            type: AstType.LetStatement,
            spec,
            location: this.getLocation()
        }
    }

    private parseExpressionStatement(): ExpressionStatement {
        const expression = this.parseExpression()
        this.match(TokenType.Semicolon)

        return {
            type: AstType.ExpressionStatement,
            expression,
            location: this.getLocation()
        }
    }

    private precedence(type: TokenType): number {
        switch (type) {
          case TokenType.Asterisk:
          case TokenType.Slash:
            return 3;
          case TokenType.Plus:
          case TokenType.Minus:
            return 2;
          case TokenType.LeftParen:
            return 1;
          default:
            return 0;
        }
    }

    private parseExpression(precedence = 0): Expression {
        let left = this.parsePrefixExpression()

        while (precedence < this.precedence(this.curToken.type)) {
            left = this.parseInfixExpression(left)
        }

        return left
    }

    private parsePrefixExpression(): Expression {
        switch (this.curToken.type) {
            case TokenType.Number:
                return this.parseIntegerLiteral()
            case TokenType.Identifier:
                return this.parseIdentifier()
            case TokenType.Minus:
                return this.parseUnaryExpression()
            case TokenType.LeftParen:
                return this.parseGroupedExpression()
        }
        throw new Error('Error')
    }

    private parseInfixExpression(left: Expression): Expression {
        switch (this.curToken.type) {
            case TokenType.Plus:
            case TokenType.Minus:
            case TokenType.Asterisk:
            case TokenType.Slash: {
                const operator = this.match(this.curToken.type).type
                const precedence = this.precedence(operator)
                const right = this.parseExpression(precedence)
                return {
                    type: AstType.BinaryExpression,
                    left,
                    operator,
                    right,
                    location: this.getLocation()
                } as BinaryExpression
            }
            case TokenType.LeftParen:
                return this.parseCallExpression(left as Identifier)
            default:
                return left
        }
    }

    private parseGroupedExpression(): Expression {
        this.match(TokenType.LeftParen)
        const expression = this.parseExpression()
        this.match(TokenType.RightParen)
        return expression
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

    private parseIntegerLiteral(): IntegerLiteral {
        return {
            type: AstType.IntegerLiteral,
            value: parseInt(this.consume().literal),
            location: this.getLocation()
        }
    }

    private parseIdentifier(): Identifier {
        return {
            type: AstType.Identifier,
            value: this.consume().literal,
            location: this.getLocation()
        }
    }

    private parseUnaryExpression(): UnaryExpression {
        return {
            type: AstType.UnaryExpression,
            operator: this.curToken.type,
            right: this.parseExpression(),
            location: this.getLocation()
        }
    }
}