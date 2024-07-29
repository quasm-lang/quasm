import { AstType } from '../ast.ts'
import * as Ast from '../ast.ts'
import { Parser } from '../mod.ts'
import { TokenType } from '../../lexer/token.ts'

import './core.ts'

const precedenceMap: Partial<Record<TokenType, number>> = {
    [TokenType.Dot]: 5,
    [TokenType.Asterisk]: 4,
    [TokenType.Slash]: 4,
    [TokenType.Plus]: 3,
    [TokenType.Minus]: 3,
    [TokenType.Equality]: 2,
    [TokenType.LessThan]: 2,
    [TokenType.GreaterThan]: 2,
    [TokenType.GreaterThanOrEqual]: 2,
    [TokenType.LessThanOrEqual]: 2,
    [TokenType.LeftParen]: 1,
};

function getPrecedence(type: TokenType): number {
    return precedenceMap[type] || 0
}

declare module '../parser.ts' {
    interface Parser {
        parseExpression(precedence: number): Ast.Expression
        parsePrefixExpression(): Ast.Expression
        parseInfixExpression(left: Ast.Expression): Ast.Expression
        parseIdentifierOrCallExpression(): Ast.Expression
        parseUnaryExpression(): Ast.UnaryExpression
        parseGroupedExpression(): Ast.Expression
        parseBinaryExpression(left: Ast.Expression): Ast.BinaryExpression
        parseCallExpression(identifier: Ast.Identifier): Ast.CallExpression
        parseCallArguments(): Ast.Expression[]
        parseFields(delimiter: TokenType | null, closingToken: TokenType): Ast.Field[]
    }
}

Parser.prototype.parseExpression = function (precedence = 0) {
    let left = this.parsePrefixExpression()

    while (precedence < getPrecedence(this.curToken.type)) {
        left = this.parseInfixExpression(left)
    }

    return left
}

Parser.prototype.parsePrefixExpression = function () {
    switch (this.curToken.type) {
        case TokenType.Integer:
            return this.parseIntegerLiteral()
        case TokenType.Float:
            return this.parseFloatLiteral()
        case TokenType.String:
            return this.parseStringLiteral()
        case TokenType.Identifier:
            return this.parseIdentifierOrCallExpression()
        case TokenType.Minus:
            return this.parseUnaryExpression()
        case TokenType.LeftParen:
            return this.parseGroupedExpression()
    }
    throw new Error(`Parser error: No prefix found for ${this.curToken.literal}`)
}

Parser.prototype.parseInfixExpression = function (left) {
    switch (this.curToken.type) {
        case TokenType.Plus:
        case TokenType.Minus:
        case TokenType.Asterisk:
        case TokenType.Slash:
        case TokenType.GreaterThan:
        case TokenType.LessThan:
        case TokenType.Equality:
        case TokenType.LessThanOrEqual:
        case TokenType.GreaterThanOrEqual:
            return this.parseBinaryExpression(left)
        case TokenType.LeftParen:
            return this.parseCallExpression(left as Ast.Identifier)
        case TokenType.Dot: {
            this.match(TokenType.Dot)
            const member = this.parseIdentifier()
            return {
                type: AstType.MemberAccessExpression,
                base: left,
                member,
                location: this.getLocation()
            } as Ast.MemberAccessExpression
        }   
        default:
            return left
    }
}

Parser.prototype.parseIdentifierOrCallExpression = function () {
    const identifier = this.parseIdentifier()

    if (this.eq(TokenType.LeftParen)) {
        return this.parseCallExpression(identifier)
    }
    return identifier
}

Parser.prototype.parseUnaryExpression = function () {
    return {
        type: AstType.UnaryExpression,
        operator: this.consume().type,
        right: this.parseExpression(0),
        location: this.getLocation()
    }
}

Parser.prototype.parseGroupedExpression = function() {
    this.match(TokenType.LeftParen)
    const expression = this.parseExpression(0)
    this.match(TokenType.RightParen)
    return expression
}

Parser.prototype.parseBinaryExpression = function (left) {
    const operator = this.consume().type
    const precedence = getPrecedence(operator)
    const right = this.parseExpression(precedence)

    return {
        type: AstType.BinaryExpression,
        left,
        operator,
        right,
        location: this.getLocation()
    } as Ast.BinaryExpression
}

Parser.prototype.parseCallExpression = function (identifier) {
    this.match(TokenType.LeftParen)
    const args: Ast.Expression[] = this.parseCallArguments()
    this.match(TokenType.RightParen)

    return {
        type: AstType.CallExpression,
        callee: identifier,
        arguments: args,
        location: this.getLocation()
    }
}

Parser.prototype.parseCallArguments = function () {
    const args: Ast.Expression[] = []

    while (!this.eq(TokenType.RightParen)) {
        args.push(this.parseExpression(0))

        if (!this.eq(TokenType.RightParen)) {
            this.match(TokenType.Comma)
        }
    }

    return args
}

Parser.prototype.parseFields = function (delimiter, closingToken) {
    const parameters: Ast.Field[] = []

    while (!this.eq(closingToken)) {
        const name = this.parseIdentifier()
        this.match(TokenType.Colon)
        const dataType = this.parseIdentifierType()

        const param: Ast.Field = {
            type: AstType.Field,
            name: name,
            dataType,
            location: this.getLocation()
        }
        parameters.push(param)

        if (!this.eq(closingToken) && delimiter !== null) {
            this.match(delimiter)
        }
    }

    return parameters
}