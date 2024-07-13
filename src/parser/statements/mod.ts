import { Parser } from '../parser.ts'
import { TokenType } from '../../lexer/token.ts'
import { AstType } from '../ast.ts'
import * as Ast from '../ast.ts'

import './controlFlow.ts'
import './function.ts'
import './variable.ts'

declare module '../parser.ts' {
    interface Parser {
        parseExpressionStatement(expression: Ast.Expression): Ast.ExpressionStatement
        parseBlockStatement(): Ast.BlockStatement
        parsePrintStatement(): Ast.PrintStatement
    }
}

Parser.prototype.parseExpressionStatement = function (expression) {
    this.match(TokenType.Semicolon)

    while (this.eq(TokenType.Semicolon)) {
        this.consume()
    }

    return {
        type: AstType.ExpressionStatement,
        expression,
        location: this.getLocation()
    }
}

Parser.prototype.parseBlockStatement = function () {
    this.match(TokenType.LeftBrace)
 
    const statements: Ast.Statement[] = []
    
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

Parser.prototype.parsePrintStatement = function () {
    this.match(TokenType.Print)
    const expression = this.parseExpression(0)
    this.match(TokenType.Semicolon)

    return {
        type: AstType.PrintStatement,
        expression,
        location: this.getLocation()
    }
}