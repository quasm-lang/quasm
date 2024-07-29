import { Parser } from '../parser.ts'
import * as Ast from '../ast.ts'
import { AstType } from '../ast.ts'
import { StringLiteralSymbol, SymbolType } from '../../symbolTable.ts'
import { TokenType } from '../../lexer/token.ts'

declare module '../parser.ts' {
    interface Parser {
        parseIntegerLiteral(): Ast.IntegerLiteral
        parseFloatLiteral(): Ast.FloatLiteral
        parseStringLiteral(): Ast.StringLiteral
        parseIdentifier(): Ast.Identifier
        parseIdentifierType(): Ast.IdentifierType
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

Parser.prototype.parseIdentifierType = function () {
    return {
        type: AstType.IdentifierType,
        value: this.match(TokenType.IdentifierType).literal,
        location: this.getLocation()
    }
}

// TODO: Add support for array types
// export interface ArrayType {
//     baseType: Identifier;
//     dimensions: number;
// }
// export interface Field extends Node {
//     type: AstType.Field;
//     name: Identifier;
//     dataType: Identifier | ArrayType;
// }
// function parseDataType(): Identifier | ArrayType {
//     const baseType = this.parseIdentifier();
//     if (this.eq(TokenType.LeftBracket)) {
//         this.match(TokenType.LeftBracket);
//         this.match(TokenType.RightBracket);
//         return { baseType, dimensions: 1 };
//     }
//     return baseType;
// }
