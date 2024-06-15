import { Parser } from '../mod.ts'
import { TokenType } from '../../lexer/token.ts'
import { AstType } from '../ast.ts'
import * as Ast from '../ast.ts'
import { parseIdentifier } from '../expressions/core.ts'
import { parseFields } from "../expressions/mod.ts";

export function parseStructStatement(parser: Parser): Ast.StructDeclaration {
    parser.match(TokenType.Struct)
    const name = parseIdentifier(parser)
    parser.match(TokenType.LeftBrace)
    const fields = parseFields(parser, null, TokenType.RightBrace)
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