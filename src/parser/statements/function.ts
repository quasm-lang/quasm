import { Parser } from '../parser.ts'
import { AstType, FnStatement, ReturnStatement } from '../ast.ts'
import { DataType, TokenType } from '../token.ts'
import { parseExpression } from '../expressions/expression.ts'
import { parseIdentifier } from '../expressions/core.ts'
import { parseBlockStatement } from './mod.ts'

export function parseFnStatement(parser: Parser): FnStatement {
    parser.match(TokenType.Fn)
    const name = parseIdentifier(parser)
    parser.match(TokenType.LeftParen)
    const parameters = parser.parseFields(TokenType.Comma, TokenType.RightParen)
    parser.match(TokenType.RightParen)

    let returnType: DataType = DataType.none // Default return type
    if (parser.eq(TokenType.RightArrow)) {   // scenario in which type exists
        parser.match(TokenType.RightArrow)
        const returnToken = parser.matchDataType()
        returnType = returnToken.literal
    }

    parser.match(TokenType.LeftBrace)
    const block = parseBlockStatement(parser)

    return {
        type: AstType.FnStatement,
        name,
        parameters,
        returnType,
        body: block,
        exported: false,
        location: parser.getLocation()
    }
}

export function parseReturnStatement(parser: Parser): ReturnStatement {
    parser.match(TokenType.Return)
    const value = parseExpression(parser)
    parser.match(TokenType.Semicolon)

    return {
        type: AstType.ReturnStatement,
        value,
        location: parser.getLocation()
    }
}