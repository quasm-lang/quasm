import { Parser } from '../parser.ts'
import { TokenType } from '../../lexer/token.ts'
import { DataType } from '../../datatype/mod.ts'
import { AstType } from '../ast.ts'
import * as Ast from '../ast.ts'

declare module '../parser.ts' {
    interface Parser {
        parseLetStatement(): Ast.LetStatement
        parseAssignmentStatement(left: Ast.Expression): Ast.AssignmentStatement
    }
}

Parser.prototype.parseLetStatement = function() {
    this.match(TokenType.Let)
    
    const name = this.parseIdentifier()
    let dataType: DataType | undefined

    if (this.eq(TokenType.Colon)) { // Type exists
        this.match(TokenType.Colon)

        const dataTypeToken = this.matchDataType()
        dataType = dataTypeToken.literal
    }
    
    this.match(TokenType.Assignment)
    const value = this.parseExpression(0)

    this.match(TokenType.Semicolon)

    return {
        type: Ast.AstType.LetStatement,
        spec: {
            type: Ast.AstType.Spec,
            name,
            dataType,
            value,
            location: this.getLocation()
        } as Ast.Spec,
        location: this.getLocation()
    }
}

Parser.prototype.parseAssignmentStatement = function(left) {
    this.match(TokenType.Assignment)
    const value = this.parseExpression(0)
    this.match(TokenType.Semicolon)

    return {
        type: AstType.AssignmentStatement,
        left,
        value,
        location: this.getLocation()
    }
}