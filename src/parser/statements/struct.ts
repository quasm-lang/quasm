import { Parser } from '../parser.ts'
import { TokenType } from '../../lexer/token.ts'
import { AstType } from '../ast.ts'
import * as Ast from '../ast.ts'

export function parseStructStatement(parser: Parser): Ast.StructDeclaration {
    parser.match(TokenType.Struct)
    const name = parser.parseIdentifier()
    parser.match(TokenType.LeftBrace)
    const fields = parser.parseFields(null, TokenType.RightBrace)
    parser.match(TokenType.RightBrace)

    return {
        type: AstType.StructDeclaration,
        name,
        fields,
        location: parser.getLocation()
    }
}

export function parseStructInstantiation() {
    
}