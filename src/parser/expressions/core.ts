import { Parser } from '../parser.ts'
import * as Ast from '../ast.ts'
import * as Symbol from '../../symbolTable.ts'
import * as Token from '../../lexer/token.ts'

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
        type: Ast.Type.IntegerLiteral,
        value: parseInt(this.consume().literal),
        location: this.getLocation()
    }
}

Parser.prototype.parseFloatLiteral = function () {
    return {
        type: Ast.Type.FloatLiteral,
        value: parseFloat(this.consume().literal),
        location: this.getLocation()
    }
}

Parser.prototype.parseStringLiteral = function () {
    const value = this.consume().literal
    this.symbolTable.define({
        type: Symbol.Type.StringLiteral,
        name: `_str_${value}`,
        value
    } as Symbol.StringLiteral)
    
    return {
        type: Ast.Type.StringLiteral,
        value,
        location: this.getLocation()
    }
}

Parser.prototype.parseIdentifier = function () {
    return {
        type: Ast.Type.Identifier,
        value: this.match(Token.Type.Identifier).literal,
        location: this.getLocation()
    }
}

Parser.prototype.parseIdentifierType = function () {
    return {
        type: Ast.Type.IdentifierType,
        value: this.match(Token.Type.IdentifierType).literal,
        location: this.getLocation()
    }
}

// TODO: Add support for array types
// export interface ArrayType {
//     baseType: Identifier;
//     dimensions: number;
// }
// export interface Field extends Node {
//     type: Ast.Type.Field;
//     name: Identifier;
//     dataType: Identifier | ArrayType;
// }
// function parseDataType(): Identifier | ArrayType {
//     const baseType = this.parseIdentifier();
//     if (this.eq(Token.Type.LeftBracket)) {
//         this.match(Token.Type.LeftBracket);
//         this.match(Token.Type.RightBracket);
//         return { baseType, dimensions: 1 };
//     }
//     return baseType;
// }
