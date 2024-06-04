import { Parser } from '../mod.ts'
import { TokenType } from '../../lexer/token.ts'
import {
    IntegerLiteral,
    AstType,
    StringLiteral,
    FloatLiteral,
    Identifier,
} from '../ast.ts'


export function parseIntegerLiteral(parser: Parser): IntegerLiteral {
    return {
        type: AstType.IntegerLiteral,
        value: parseInt(parser.consume().literal),
        location: parser.getLocation()
    }
}

export function parseFloatLiteral(parser: Parser): FloatLiteral {
    return {
        type: AstType.FloatLiteral,
        value: parseFloat(parser.consume().literal),
        location: parser.getLocation()
    }
}

export function parseStringLiteral(parser: Parser): StringLiteral {
    return {
        type: AstType.StringLiteral,
        value: parser.consume().literal,
        location: parser.getLocation()
    }
}

export function parseIdentifier(parser: Parser): Identifier {
    return {
        type: AstType.Identifier,
        value: parser.match(TokenType.Identifier).literal,
        location: parser.getLocation()
    }
}