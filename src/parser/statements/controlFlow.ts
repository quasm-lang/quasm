import { Parser } from '../parser.ts'
import * as Ast from '../ast.ts'
import * as Token from '../../lexer/token.ts'

declare module '../parser.ts' {
    interface Parser {
        parseWhileStatement(): Ast.WhileStatement
        parseIfStatement(): Ast.IfStatement
    }
}

Parser.prototype.parseWhileStatement = function () {
    this.match(Token.Type.While)
    const condition = this.parseExpression(0)
    const body = this.parseBlockStatement()

    return {
        type: Ast.Type.WhileStatement,
        condition,
        body,
        location: this.getLocation()
    }
}

Parser.prototype.parseIfStatement = function () {
    this.match(Token.Type.If)
    const condition = this.parseExpression(0)
    const body = this.parseBlockStatement()

    let alternate: Ast.IfStatement | Ast.BlockStatement | undefined
    if (this.eq(Token.Type.Else)) {
        this.match(Token.Type.Else)
        
        if (this.eq(Token.Type.If)) {
            alternate = this.parseIfStatement()
        } else {
            alternate = this.parseBlockStatement()
        }
    }
    
    return {
        type: Ast.Type.IfStatement,
        condition,
        body,
        alternate,
        location: this.getLocation()
    }
}