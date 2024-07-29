import { Parser } from '../parser.ts'
import * as Token from '../../lexer/token.ts'
import * as Ast from '../ast.ts'

declare module '../parser.ts' {
    interface Parser {
        parseLetStatement(): Ast.LetStatement
        parseAssignmentStatement(left: Ast.Expression): Ast.AssignmentStatement
    }
}

Parser.prototype.parseLetStatement = function() {
    this.match(Token.Type.Let)
    
    const name = this.parseIdentifier()
    let dataType: Ast.IdentifierType | undefined

    if (this.eq(Token.Type.Colon)) { // Type exists
        this.match(Token.Type.Colon)

        dataType = this.parseIdentifierType()
    }
    
    this.match(Token.Type.Assignment)
    const value = this.parseExpression(0)

    this.match(Token.Type.Semicolon)

    return {
        type: Ast.Type.LetStatement,
        spec: {
            type: Ast.Type.Spec,
            name,
            dataType,
            value,
            location: this.getLocation()
        } as Ast.Spec,
        location: this.getLocation()
    }
}

Parser.prototype.parseAssignmentStatement = function(left) {
    this.match(Token.Type.Assignment)
    const value = this.parseExpression(0)
    this.match(Token.Type.Semicolon)

    return {
        type: Ast.Type.AssignmentStatement,
        left,
        value,
        location: this.getLocation()
    }
}