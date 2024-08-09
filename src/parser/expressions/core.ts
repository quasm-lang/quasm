import { Parser } from '../parser.ts'
import * as Ast from '../ast.ts'
import * as Symbol from '../../symbolTable.ts'
import * as Token from '../../lexer/token.ts'
import * as Type from '../../datatype/mod.ts'

declare module '../parser.ts' {
    interface Parser {
        parseIntegerLiteral(): Ast.IntegerLiteral
        parseFloatLiteral(): Ast.FloatLiteral
        parseStringLiteral(): Ast.StringLiteral
        parseIdentifier(): Ast.Identifier
        parseIdentifierType(): Type.DataType
        parseDataType(): Type.DataType
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
    return Type.fromString(this.match(Token.Type.IdentifierType).literal)
}

Parser.prototype.parseDataType = function() {
    if (this.eq(Token.Type.LeftBracket)) {
        this.match(Token.Type.LeftBracket)
        const elementType = this.parseIdentifierType()
        this.match(Token.Type.RightBracket)
        return Type.createArrayType(elementType)
    } else if (this.eq(Token.Type.LeftParen)) {
        this.match(Token.Type.LeftParen)
        const types = [this.parseIdentifierType()]
        
        while (this.eq(Token.Type.Comma)) {
            this.match(Token.Type.Comma)
            types.push(this.parseIdentifierType())
        }
        
        this.match(Token.Type.RightParen)
        return types.length === 1 ? types[0] : Type.createTupleType(types)
    }

    return this.parseIdentifierType()
}
