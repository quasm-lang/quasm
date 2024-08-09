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
        parseDataType(): Ast.IdentifierType | Ast.ArrayType | Ast.TupleType
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

Parser.prototype.parseDataType = function(): Ast.IdentifierType | Ast.ArrayType | Ast.TupleType {
    if (this.eq(Token.Type.LeftBracket)) {
        this.match(Token.Type.LeftBracket);
        const elementType = this.parseIdentifierType();
        this.match(Token.Type.RightBracket);
        return {
            type: Ast.Type.ArrayType,
            elementType,
            location: this.getLocation()
        };
    } else if (this.eq(Token.Type.LeftParen)) {
        this.match(Token.Type.LeftParen)
        const elementTypes: Ast.IdentifierType[] = []
        while (!this.eq(Token.Type.RightParen)) {
            elementTypes.push(this.parseIdentifierType())
            if (!this.eq(Token.Type.RightParen)) {
                this.match(Token.Type.Comma)
            }
        }
        this.match(Token.Type.RightParen)
        return {
            type: Ast.Type.TupleType,
            elementTypes,
            location: this.getLocation()
        }
    }
    return this.parseIdentifierType();
}
