import { Parser } from '../parser.ts'
import * as Token from '../../lexer/token.ts'
import * as Ast from '../ast.ts'
import * as Type from '../../datatype/mod.ts'

declare module '../parser.ts' {
    interface Parser {
        parseLetStatement(): Ast.LetStatement
        parseAssignmentStatement(left: Ast.Expression): Ast.AssignmentStatement
    }
}

Parser.prototype.parseLetStatement = function() {
    this.match(Token.Type.Let)
    
    const specs: Ast.Spec[] = []
    do {
        const name = this.parseIdentifier()
        let dataType: Type.DataType | undefined
        if (this.eq(Token.Type.Colon)) {
            this.match(Token.Type.Colon)
            dataType = this.parseDataType()
        }
        specs.push({
            type: Ast.Type.Spec,
            name,
            dataType,
            location: this.getLocation()
        })
        if (!this.eq(Token.Type.Comma)) break
        this.match(Token.Type.Comma)
    } while (true)
    
    this.match(Token.Type.Assignment)
    const value = this.parseExpression(0)
    this.match(Token.Type.Semicolon)

    return {
        type: Ast.Type.LetStatement,
        specs,
        value,
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