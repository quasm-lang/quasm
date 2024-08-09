import { Parser } from '../parser.ts'
import * as Ast from '../ast.ts'
import * as Type from '../../datatype/mod.ts'
import * as Token from '../../lexer/token.ts'
import * as Symbol from '../../symbolTable.ts'

declare module '../parser.ts' {
    interface Parser {
        parseFuncStatement(): Ast.FuncStatement
        parseReturnStatement(): Ast.ReturnStatement
    }
}

Parser.prototype.parseFuncStatement = function () {
    this.match(Token.Type.Func)
    const name = this.parseIdentifier()
    this.match(Token.Type.LeftParen)
    const parameters = this.parseFields(Token.Type.Comma, Token.Type.RightParen)
    this.match(Token.Type.RightParen)

    let returnType: Type.DataType = Type.None // Default return type
    if (this.eq(Token.Type.RightArrow)) {     // scenario in which type exists
        this.match(Token.Type.RightArrow)
        returnType = this.parseDataType()
    }

    const block = this.parseBlockStatement()
    
    // Define function in symbol table
    this.symbolTable.define({
        type: Symbol.Type.Function,
        name: name.value,
        params: parameters.map(param => param.dataType),
        returnType
    } as Symbol.Function)

    return {
        type: Ast.Type.FuncStatement,
        name,
        parameters,
        returnType,
        body: block,
        exported: false,
        location: this.getLocation()
    }
}

Parser.prototype.parseReturnStatement = function () {
    this.match(Token.Type.Return)
    const value = this.parseExpression(0)
    this.match(Token.Type.Semicolon)

    return {
        type: Ast.Type.ReturnStatement,
        value,
        location: this.getLocation()
    }
}