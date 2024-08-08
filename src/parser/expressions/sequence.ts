import { Parser } from '../parser.ts'
import * as Ast from '../ast.ts'
import * as Token from '../../lexer/token.ts'

declare module '../parser.ts' {
    interface Parser {
        parseListLiteral(openToken: Token.Type, closeToken: Token.Type): Ast.Expression[]
        parseArrayLiteral(): Ast.ArrayLiteral
        // parseTupleLiteral():
        parseIndexExpression(left: Ast.Expression): Ast.IndexExpression
    }
}

Parser.prototype.parseListLiteral = function (openToken, closeToken) {
    this.match(openToken)

    const elements: Ast.Expression[] = []

    while (!this.eq(closeToken)) {
        elements.push(this.parseExpression(0))

        if (this.eq(Token.Type.Comma)) {
            this.match(Token.Type.Comma)
        }
    }

    this.match(Token.Type.RightBracket)

    return elements
}

Parser.prototype.parseArrayLiteral = function (): Ast.ArrayLiteral {
    const elements = this.parseListLiteral(Token.Type.LeftBracket, Token.Type.RightBracket)

    return {
        type: Ast.Type.ArrayLiteral,
        elements,
        location: this.getLocation()
    }
}

// Parser.prototype.parseTupleLiteral = function(): Ast.TupleLiteral {
//     const elements = this.parseListLiteral(Token.Type.LeftParen, Token.Type.RightParen)

//     return {
//         type: Ast.Type.TupleLiteral,
//         elements,
//         location: this.getLocation()
//     }
// }

Parser.prototype.parseIndexExpression = function (left) {
    this.match(Token.Type.LeftBracket)
    const index = this.parseExpression(0)
    this.match(Token.Type.RightBracket)
    return {
        type: Ast.Type.IndexExpression,
        base: left,
        index,
        location: this.getLocation()
    }
}