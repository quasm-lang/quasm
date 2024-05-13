import { AstType, BinaryExpression, CallExpression, Expression, Identifier, UnaryExpression } from '../ast.ts'
import { Parser } from '../parser.ts'
import { TokenType } from '../../lexer/token.ts'
import { parseFloatLiteral, parseIdentifier, parseIntegerLiteral, parseStringLiteral } from './core.ts'

function getPrecedence(type: TokenType): number {
    switch (type) {
      case TokenType.Asterisk:
      case TokenType.Slash:
        return 3
      case TokenType.Plus:
      case TokenType.Minus:
        return 2
      case TokenType.LeftParen:
        return 1
      default:
        return 0
    }
}

export function parseExpression(parser: Parser, precedence = 0): Expression {
    let left = parsePrefixExpression(parser)

    while (precedence < getPrecedence(parser.curToken.type)) {
        left = parseInfixExpression(parser, left)
    }

    return left
}

export function parsePrefixExpression(parser: Parser): Expression {
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

export function parseInfixExpression(parser: Parser, left: Expression): Expression {
    switch (parser.curToken.type) {
        case TokenType.Plus:
        case TokenType.Minus:
        case TokenType.Asterisk:
        case TokenType.Slash: {
            const operator = parser.match(parser.curToken.type).type
            const precedence = getPrecedence(operator)
            const right = parseExpression(parser, precedence)
            return {
                type: AstType.BinaryExpression,
                left,
                operator,
                right,
                location: parser.getLocation()
            } as BinaryExpression
        }
        case TokenType.LeftParen:
            return parseCallExpression(parser, left as Identifier)
        default:
            return left
    }
}

function parseUnaryExpression(parser: Parser): UnaryExpression {
    return {
        type: AstType.UnaryExpression,
        operator: parser.consume().type,
        right: parseExpression(parser),
        location: parser.getLocation()
    }
}

function parseGroupedExpression(parser: Parser): Expression {
    parser.match(TokenType.LeftParen)
    const expression = parseExpression(parser)
    parser.match(TokenType.RightParen)
    return expression
}

function parseCallExpression(parser: Parser, identifier: Identifier): CallExpression {
    parser.match(TokenType.LeftParen)
    const args: Expression[] = parseCallArguments(parser)
    parser.match(TokenType.RightParen)

    return {
        type: AstType.CallExpression,
        callee: identifier,
        arguments: args,
        location: parser.getLocation()
    }
}

export function parseCallArguments(parser: Parser): Expression[] {
    const args: Expression[] = []

    while (!parser.eq(TokenType.RightParen)) {
        args.push(parseExpression(parser))

        if (!parser.eq(TokenType.RightParen)) {
            parser.match(TokenType.Comma)
        }
    }

    return args
}