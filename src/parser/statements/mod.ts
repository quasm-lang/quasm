import { Parser } from '../parser.ts'
import * as Token from '../../lexer/token.ts'
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
    this.match(Token.Type.Semicolon)

    while (this.eq(Token.Type.Semicolon)) {
        this.consume()
    }

    return {
        type: Ast.Type.ExpressionStatement,
        expression,
        location: this.getLocation()
    }
}

Parser.prototype.parseBlockStatement = function () {
    this.match(Token.Type.LeftBrace)
 
    const statements: Ast.Statement[] = []
    
    while (
        !this.eq(Token.Type.RightBrace) &&
        !this.eq(Token.Type.EOF)
    ) {
        const statement = this.parseStatement()
        statements.push(statement)
    }
    
    this.match(Token.Type.RightBrace)

    return {
        type: Ast.Type.BlockStatement,
        statements,
        location: this.getLocation()
    }
}

Parser.prototype.parsePrintStatement = function () {
    this.match(Token.Type.Print)
    const expression = this.parseExpression(0)
    this.match(Token.Type.Semicolon)

    return {
        type: Ast.Type.PrintStatement,
        expression,
        location: this.getLocation()
    }
}