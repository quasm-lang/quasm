import { Parser } from '../parser.ts'
import { TokenType } from '../../lexer/token.ts'
import { AstType, StructStatement } from '../ast.ts'
import { parseIdentifier } from '../expressions/core.ts'
import { parseFields } from "../expressions/mod.ts";

export function parseStructStatement(parser: Parser): StructStatement {
    parser.match(TokenType.Struct)
    const name = parseIdentifier(parser)
    parser.match(TokenType.LeftBrace)
    const fields = parseFields(parser, null, TokenType.RightBrace)
    parser.match(TokenType.RightBrace)

    return {
        type: AstType.StructStatement,
        name,
        fields,
        location: parser.getLocation()
    }
}