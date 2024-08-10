import * as Ast from '../ast.ts'
import { Parser } from '../mod.ts'
import * as Token from '../../lexer/token.ts'

import './core.ts'
import './sequence.ts'

const precedenceMap: Partial<Record<Token.Type, number>> = {
    [Token.Type.LeftParen]: 7,
    [Token.Type.LeftBracket]: 6,
    [Token.Type.Dot]: 5,
    [Token.Type.Asterisk]: 4,
    [Token.Type.Slash]: 4,
    [Token.Type.Plus]: 3,
    [Token.Type.Minus]: 3,
    [Token.Type.Equality]: 2,
    [Token.Type.LessThan]: 2,
    [Token.Type.GreaterThan]: 2,
    [Token.Type.GreaterThanOrEqual]: 2,
    [Token.Type.LessThanOrEqual]: 2,
}

function getPrecedence(type: Token.Type): number {
    return precedenceMap[type] || 0
}

declare module '../parser.ts' {
    interface Parser {
        parseExpression(precedence: number): Ast.Expression
        parsePrefixExpression(): Ast.Expression
        parseInfixExpression(left: Ast.Expression): Ast.Expression
        parseUnaryExpression(): Ast.UnaryExpression
        parseGroupedExpression(): Ast.Expression
        parseBinaryExpression(left: Ast.Expression): Ast.BinaryExpression
        parseCallExpression(identifier: Ast.Identifier): Ast.CallExpression
        parseCallArguments(): Ast.Expression[]
        parseFields(delimiter: Token.Type | null, closingToken: Token.Type): Ast.Field[]
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
        case Token.Type.Integer:
            return this.parseIntegerLiteral()
        case Token.Type.Float:
            return this.parseFloatLiteral()
        case Token.Type.String:
            return this.parseStringLiteral()
        case Token.Type.Identifier:
            return this.parseIdentifier()
        case Token.Type.Minus:
            return this.parseUnaryExpression()
        case Token.Type.LeftParen:
            return this.parseGroupedExpression()
        case Token.Type.LeftBracket:
            return this.parseArrayLiteral()
    }
    throw new Error(`Parser error: No prefix found for ${this.curToken.literal}`)
}

Parser.prototype.parseInfixExpression = function (left) {
    switch (this.curToken.type) {
        case Token.Type.Plus:
        case Token.Type.Minus:
        case Token.Type.Asterisk:
        case Token.Type.Slash:
        case Token.Type.GreaterThan:
        case Token.Type.LessThan:
        case Token.Type.Equality:
        case Token.Type.LessThanOrEqual:
        case Token.Type.GreaterThanOrEqual:
            return this.parseBinaryExpression(left)
        case Token.Type.LeftParen:
            return this.parseCallExpression(left as Ast.Identifier)
        case Token.Type.LeftBracket:
            return this.parseIndexExpression(left)
        case Token.Type.Dot: {
            this.match(Token.Type.Dot)
            const member = this.parseIdentifier()
            return {
                type: Ast.Type.MemberAccessExpression,
                base: left,
                member,
                location: this.getLocation()
            } as Ast.MemberAccessExpression
        }   
        default:
            return left
    }
}

Parser.prototype.parseUnaryExpression = function () {
    return {
        type: Ast.Type.UnaryExpression,
        operator: this.consume().type,
        right: this.parseExpression(0),
        location: this.getLocation()
    }
}

Parser.prototype.parseGroupedExpression = function () {
    this.match(Token.Type.LeftParen)
    const firstExpression = this.parseExpression(0)
    
    // It's a tuple
    if (this.eq(Token.Type.Comma)) {
        this.match(Token.Type.Comma)
        const elements = [firstExpression, this.parseExpression(0)]
        
        while (this.eq(Token.Type.Comma)) {
            this.match(Token.Type.Comma)
            elements.push(this.parseExpression(0))
        }
        
        this.match(Token.Type.RightParen)
        return {
            type: Ast.Type.TupleLiteral,
            elements,
            location: this.getLocation()
        }
    }

    // It's a grouped expression
    this.match(Token.Type.RightParen)
    return firstExpression
}

Parser.prototype.parseBinaryExpression = function (left) {
    const operator = this.consume().type
    const precedence = getPrecedence(operator)
    const right = this.parseExpression(precedence)

    return {
        type: Ast.Type.BinaryExpression,
        left,
        operator,
        right,
        location: this.getLocation()
    } as Ast.BinaryExpression
}

Parser.prototype.parseCallExpression = function (identifier) {
    this.match(Token.Type.LeftParen)
    const args: Ast.Expression[] = this.parseCallArguments()
    this.match(Token.Type.RightParen)

    return {
        type: Ast.Type.CallExpression,
        callee: identifier,
        arguments: args,
        location: this.getLocation()
    }
}

Parser.prototype.parseCallArguments = function () {
    const args: Ast.Expression[] = []

    while (!this.eq(Token.Type.RightParen)) {
        args.push(this.parseExpression(0))

        if (!this.eq(Token.Type.RightParen)) {
            this.match(Token.Type.Comma)
        }
    }

    return args
}

Parser.prototype.parseFields = function (delimiter, closingToken) {
    const parameters: Ast.Field[] = []

    while (!this.eq(closingToken)) {
        const name = this.parseIdentifier()
        this.match(Token.Type.Colon)
        const dataType = this.parseIdentifierType()

        const param: Ast.Field = {
            type: Ast.Type.Field,
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