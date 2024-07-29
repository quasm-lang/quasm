import { Parser } from '../parser.ts'
import * as Token from '../../lexer/token.ts'
import * as Ast from '../ast.ts'

export function parseStructStatement(parser: Parser): Ast.StructDeclaration {
    parser.match(Token.Type.Struct)
    const name = parser.parseIdentifier()
    parser.match(Token.Type.LeftBrace)
    const fields = parser.parseFields(null, Token.Type.RightBrace)
    parser.match(Token.Type.RightBrace)

    return {
        type: Ast.Type.StructDeclaration,
        name,
        fields,
        location: parser.getLocation()
    }
}

export function parseStructInstantiation() {
    
}