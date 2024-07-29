import { Parser } from '../parser.ts'
import { AstType } from '../ast.ts'
import * as Ast from '../ast.ts'
import { TokenType } from '../../lexer/token.ts'
import * as Type from '../../datatype/mod.ts'
import { FunctionSymbol, SymbolType } from '../../symbolTable.ts'

declare module '../parser.ts' {
    interface Parser {
        parseFuncStatement(): Ast.FuncStatement
        parseReturnStatement(): Ast.ReturnStatement
    }
}

Parser.prototype.parseFuncStatement = function () {
    this.match(TokenType.Func)
    const name = this.parseIdentifier()
    this.match(TokenType.LeftParen)
    const parameters = this.parseFields(TokenType.Comma, TokenType.RightParen)
    this.match(TokenType.RightParen)

    let returnType: Type.DataType = Type.None // Default return type
    if (this.eq(TokenType.RightArrow)) {     // scenario in which type exists
        this.match(TokenType.RightArrow)
        const returnToken = this.parseIdentifierType()
        // returnType = { kind: TypeKind[returnToken.value as keyof typeof TypeKind] } as PrimitiveType
        returnType = Type.fromString(returnToken.value)
    }

    const block = this.parseBlockStatement()
    
    // Define function in symbol table
    this.symbolTable.define({
        type: SymbolType.Function,
        name: name.value,
        params: parameters.map(param => Type.fromString(param.dataType.value)),
        returnType
    } as FunctionSymbol)

    return {
        type: AstType.FuncStatement,
        name,
        parameters,
        returnType,
        body: block,
        exported: false,
        location: this.getLocation()
    }
}

Parser.prototype.parseReturnStatement = function () {
    this.match(TokenType.Return)
    const value = this.parseExpression(0)
    this.match(TokenType.Semicolon)

    return {
        type: AstType.ReturnStatement,
        value,
        location: this.getLocation()
    }
}