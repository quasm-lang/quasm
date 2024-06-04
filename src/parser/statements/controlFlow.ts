import { Parser } from '../mod.ts'
import { AstType, BlockStatement, IfStatement, WhileStatement } from '../ast.ts'
import { TokenType } from '../../lexer/token.ts'
import { parseExpression } from '../expressions/mod.ts'
import { parseBlockStatement } from './mod.ts' 

export function parseWhileStatement(parser: Parser): WhileStatement {
    parser.match(TokenType.While)
    const condition = parseExpression(parser)
    const body = parseBlockStatement(parser)

    return {
        type: AstType.WhileStatement,
        condition,
        body,
        location: parser.getLocation()
    }
}

export function parseIfStatement(parser: Parser): IfStatement {
    parser.match(TokenType.If)
    const condition = parseExpression(parser)
    const consequent = parseBlockStatement(parser)

    let alternate: BlockStatement | undefined
    if (parser.eq(TokenType.Else)) {
        parser.match(TokenType.Else)
        
        alternate = parseBlockStatement(parser)
    }
    
    return {
        type: AstType.IfStatement,
        condition,
        consequent,
        alternate,
        location: parser.getLocation()
    }
}