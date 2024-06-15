import { Parser } from '../mod.ts'
import { TokenType } from '../../lexer/token.ts'
import { AstType } from '../ast.ts'
import * as Ast from '../ast.ts'

export { parseIfStatement, parseWhileStatement } from './controlFlow.ts'
export { parseFuncStatement, parseReturnStatement } from './function.ts'
export { parseLetStatement, parseAssignmentStatement } from './variable.ts'
export { parseStructStatement } from './struct.ts'

export function parseExpressionStatement(parser: Parser, expression: Ast.Expression): Ast.ExpressionStatement {
    // const expression = parseExpression(parser)
    parser.match(TokenType.Semicolon)

    while (parser.eq(TokenType.Semicolon)) {
        parser.consume()
    }

    return {
        type: AstType.ExpressionStatement,
        expression,
        location: parser.getLocation()
    }
}

export function parseBlockStatement(parser: Parser): Ast.BlockStatement {
    parser.match(TokenType.LeftBrace)
 
    const statements: Ast.Statement[] = []
    
    while (
        !parser.eq(TokenType.RightBrace) &&
        !parser.eq(TokenType.EOF)
    ) {
        const statement = parser.parseStatement()
        statements.push(statement)
    }
    
    parser.match(TokenType.RightBrace)

    return {
        type: AstType.BlockStatement,
        statements,
        location: parser.getLocation()
    }
}