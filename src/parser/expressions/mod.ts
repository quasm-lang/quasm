import { AstType } from '../ast.ts'
import * as Ast from '../ast.ts'
import { Parser } from '../mod.ts'
import { TokenType } from '../../lexer/token.ts'
import { parseFloatLiteral, parseIdentifier, parseIntegerLiteral, parseStringLiteral } from './core.ts'

function getPrecedence(type: TokenType): number {
    switch (type) {
        case TokenType.Dot:
            return 5
        case TokenType.Asterisk:
        case TokenType.Slash:
            return 4
        case TokenType.Plus:
        case TokenType.Minus:
            return 3
        case TokenType.Equality:
        case TokenType.LessThan:
        case TokenType.GreaterThan:
        case TokenType.GreaterThanOrEqual:
        case TokenType.LessThanOrEqual:
            return 2
        case TokenType.LeftParen:
            return 1
        default:
            return 0
    }
}

export function parseExpression(parser: Parser, precedence = 0): Ast.Expression {
    let left = parsePrefixExpression(parser)

    while (precedence < getPrecedence(parser.curToken.type)) {
        left = parseInfixExpression(parser, left)
    }

    return left
}

export function parsePrefixExpression(parser: Parser): Ast.Expression {
    switch (parser.curToken.type) {
        case TokenType.Integer:
            return parseIntegerLiteral(parser)
        case TokenType.Float:
            return parseFloatLiteral(parser)
        case TokenType.String:
            return parseStringLiteral(parser)
        case TokenType.Identifier:
            return parseIdentifier(parser)
        case TokenType.Minus:
            return parseUnaryExpression(parser)
        case TokenType.LeftParen:
            return parseGroupedExpression(parser)
    }
    throw new Error(`Parser error: No prefix found for ${parser.curToken.literal}`)
}

export function parseInfixExpression(parser: Parser, left: Ast.Expression): Ast.Expression {
    switch (parser.curToken.type) {
        case TokenType.Plus:
        case TokenType.Minus:
        case TokenType.Asterisk:
        case TokenType.Slash:
        case TokenType.GreaterThan:
        case TokenType.LessThan:
        case TokenType.Equality:
        case TokenType.LessThanOrEqual:
        case TokenType.GreaterThanOrEqual: {
            const operator = parser.match(parser.curToken.type).type
            const precedence = getPrecedence(operator)
            const right = parseExpression(parser, precedence)
            return {
                type: AstType.BinaryExpression,
                left,
                operator,
                right,
                location: parser.getLocation()
            } as Ast.BinaryExpression
        }
        case TokenType.LeftParen:
            return parseCallExpression(parser, left as Ast.Identifier)
        case TokenType.Dot: {
            parser.match(TokenType.Dot)
            const member = parseIdentifier(parser)
            return {
                type: AstType.MemberAccessExpression,
                base: left,
                member,
                location: parser.getLocation()
            } as Ast.MemberAccessExpression
        }   
        default:
            return left
    }
}

function parseUnaryExpression(parser: Parser): Ast.UnaryExpression {
    return {
        type: AstType.UnaryExpression,
        operator: parser.consume().type,
        right: parseExpression(parser),
        location: parser.getLocation()
    }
}

function parseGroupedExpression(parser: Parser): Ast.Expression {
    parser.match(TokenType.LeftParen)
    const expression = parseExpression(parser)
    parser.match(TokenType.RightParen)
    return expression
}

function parseCallExpression(parser: Parser, identifier: Ast.Identifier): Ast.CallExpression {
    parser.match(TokenType.LeftParen)
    const args: Ast.Expression[] = parseCallArguments(parser)
    parser.match(TokenType.RightParen)

    return {
        type: AstType.CallExpression,
        callee: identifier,
        arguments: args,
        location: parser.getLocation()
    }
}

export function parseCallArguments(parser: Parser): Ast.Expression[] {
    const args: Ast.Expression[] = []

    while (!parser.eq(TokenType.RightParen)) {
        args.push(parseExpression(parser))

        if (!parser.eq(TokenType.RightParen)) {
            parser.match(TokenType.Comma)
        }
    }

    return args
}

export function parseFields(parser: Parser, delimiter: TokenType | null, closingToken: TokenType): Ast.Field[] {
    const parameters: Ast.Field[] = []

    while (!parser.eq(closingToken)) {
        const name = parseIdentifier(parser)
        parser.match(TokenType.Colon)
        const dataTypeToken = parser.matchDataType()

        const param: Ast.Field = {
            type: AstType.Field,
            name: name,
            dataType: dataTypeToken.literal,
            location: parser.getLocation()
        }
        parameters.push(param)

        if (!parser.eq(closingToken) && delimiter !== null) {
            parser.match(delimiter)
        }
    }

    return parameters
}