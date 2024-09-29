import * as Token from '../lexer/token.ts'

const precedenceMap: Partial<Record<Token.Type, number>> = {
    [Token.Type.LeftParen]: 8,
    [Token.Type.LeftBracket]: 7,
    [Token.Type.Dot]: 6,
    [Token.Type.Asterisk]: 5,
    [Token.Type.Slash]: 5,
    [Token.Type.Plus]: 4,
    [Token.Type.Minus]: 4,
    [Token.Type.Equality]: 3,
    [Token.Type.LessThan]: 3,
    [Token.Type.GreaterThan]: 3,
    [Token.Type.GreaterThanOrEqual]: 3,
    [Token.Type.LessThanOrEqual]: 3,
    [Token.Type.LogicalAnd]: 2,
    [Token.Type.LogicalOr]: 1
}

export function getPrecedence(type: Token.Type): number {
    return precedenceMap[type] || 0
}