import { Parser } from '../parser.ts'
import { AstType } from '../ast.ts'
import * as Ast from '../ast.ts'
import { TokenType } from '../../lexer/token.ts'

declare module '../parser.ts' {
    interface Parser {
        parseWhileStatement(): Ast.WhileStatement
        parseIfStatement(): Ast.IfStatement
    }
}

Parser.prototype.parseWhileStatement = function () {
    this.match(TokenType.While)
    const condition = this.parseExpression(0)
    const body = this.parseBlockStatement()

    return {
        type: AstType.WhileStatement,
        condition,
        body,
        location: this.getLocation()
    }
}

Parser.prototype.parseIfStatement = function () {
    this.match(TokenType.If)
    const condition = this.parseExpression(0)
    const body = this.parseBlockStatement()

    let alternate: Ast.IfStatement | Ast.BlockStatement | undefined
    if (this.eq(TokenType.Else)) {
        this.match(TokenType.Else)
        
        if (this.eq(TokenType.If)) {
            alternate = this.parseIfStatement()
        } else {
            alternate = this.parseBlockStatement()
        }
    }
    
    return {
        type: AstType.IfStatement,
        condition,
        body,
        alternate,
        location: this.getLocation()
    }
}