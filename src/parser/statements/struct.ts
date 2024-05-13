import { Parser } from '../parser.ts'
import { TokenType } from '../token.ts'
import { AstType, StructStatement } from '../ast.ts'
import { parseIdentifier } from '../expressions/core.ts'

export function parseStructStatement(parser: Parser): StructStatement {
    parser.match(TokenType.Struct)
    const name = parseIdentifier(parser)
    parser.match(TokenType.LeftBrace)
    const fields = parser.parseFields(null, TokenType.RightBrace)
    parser.match(TokenType.RightBrace)

    return {
        type: AstType.StructStatement,
        name,
        fields,
        location: parser.getLocation()
    }
}