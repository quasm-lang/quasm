import { Parser } from '../parser.ts'
import * as Ast from '../ast.ts'
import { AstType } from '../ast.ts'
import { StringLiteralSymbol, SymbolType } from '../../compiler/symbolTable.ts'
import { TokenType } from '../../lexer/token.ts'

declare module '../parser.ts' {
    interface Parser {
        parseIntegerLiteral(): Ast.IntegerLiteral
        parseFloatLiteral(): Ast.FloatLiteral
        parseStringLiteral(): Ast.StringLiteral
        parseIdentifier(): Ast.Identifier
    }
}

Parser.prototype.parseIntegerLiteral = function () {
    return {
        type: AstType.IntegerLiteral,
        value: parseInt(this.consume().literal),
        location: this.getLocation()
    }
}

Parser.prototype.parseFloatLiteral = function () {
    return {
        type: AstType.FloatLiteral,
        value: parseFloat(this.consume().literal),
        location: this.getLocation()
    }
}

Parser.prototype.parseStringLiteral = function () {
    const value = this.consume().literal
    this.symbolTable.define({
        type: SymbolType.StringLiteral,
        name: `_str_${value}`,
        value
    } as StringLiteralSymbol)
    
    return {
        type: AstType.StringLiteral,
        value,
        location: this.getLocation()
    }
}

Parser.prototype.parseIdentifier = function () {
    return {
        type: AstType.Identifier,
        value: this.match(TokenType.Identifier).literal,
        location: this.getLocation()
    }
}