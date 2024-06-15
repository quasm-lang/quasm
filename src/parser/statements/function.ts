import { Parser } from '../mod.ts'
import { AstType } from '../ast.ts'
import * as Ast from '../ast.ts'
import { DataType, TokenType } from '../../lexer/token.ts'
import { parseExpression, parseFields } from '../expressions/mod.ts'
import { parseIdentifier } from '../expressions/core.ts'
import { parseBlockStatement } from './mod.ts'

export function parseFuncStatement(parser: Parser): Ast.FuncStatement {
    parser.match(TokenType.Func)
    const name = parseIdentifier(parser)
    parser.match(TokenType.LeftParen)
    const parameters = parseFields(parser, TokenType.Comma, TokenType.RightParen)
    parser.match(TokenType.RightParen)

    let returnType: DataType = DataType.none // Default return type
    if (parser.eq(TokenType.RightArrow)) {   // scenario in which type exists
        parser.match(TokenType.RightArrow)
        const returnToken = parser.matchDataType()
        returnType = returnToken.literal
    }

    const block = parseBlockStatement(parser)

    return {
        type: AstType.FuncStatement,
        name,
        parameters,
        returnType,
        body: block,
        exported: false,
        location: parser.getLocation()
    }
}

export function parseReturnStatement(parser: Parser): Ast.ReturnStatement {
    parser.match(TokenType.Return)
    const value = parseExpression(parser)
    parser.match(TokenType.Semicolon)

    return {
        type: AstType.ReturnStatement,
        value,
        location: parser.getLocation()
    }
}