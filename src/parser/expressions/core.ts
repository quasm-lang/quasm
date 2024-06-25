import { Parser } from '../mod.ts'
import { TokenType } from '../../lexer/token.ts'
import { AstType } from '../ast.ts'
import * as Ast from '../ast.ts'
import { StringLiteralSymbol, SymbolType } from '../../compiler/symbolTable.ts'

export function parseIntegerLiteral(parser: Parser): Ast.IntegerLiteral {
    return {
        type: AstType.IntegerLiteral,
        value: parseInt(parser.consume().literal),
        location: parser.getLocation()
    }
}

export function parseFloatLiteral(parser: Parser): Ast.FloatLiteral {
    return {
        type: AstType.FloatLiteral,
        value: parseFloat(parser.consume().literal),
        location: parser.getLocation()
    }
}

export function parseStringLiteral(parser: Parser): Ast.StringLiteral {
    const value = parser.consume().literal
    parser.symbolTable.define({
        type: SymbolType.StringLiteral,
        name: `_str_${value}`,
        value
    } as StringLiteralSymbol)
    
    return {
        type: AstType.StringLiteral,
        value,
        location: parser.getLocation()
    }
}

export function parseIdentifier(parser: Parser): Ast.Identifier {
    return {
        type: AstType.Identifier,
        value: parser.match(TokenType.Identifier).literal,
        location: parser.getLocation()
    }
}