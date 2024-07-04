import { Parser } from '../mod.ts'
import { TokenType } from '../../lexer/token.ts'
import { DataType } from '../../datatype/mod.ts'
import { parseIdentifier } from '../expressions/core.ts'
import { parseExpression } from '../expressions/mod.ts'
import { AstType } from '../ast.ts'
import * as Ast from '../ast.ts'

export function parseLetStatement(parser: Parser): Ast.LetStatement {
    parser.match(TokenType.Let)
    
    const name = parseIdentifier(parser)
    let dataType: DataType | undefined
    let value: Ast.Expression | undefined

    if (parser.eq(TokenType.Colon)) { // Type exists
        parser.match(TokenType.Colon)

        const dataTypeToken = parser.matchDataType()
        dataType = dataTypeToken.literal
    }
    

    if (parser.eq(TokenType.Assignment)) {
        parser.match(TokenType.Assignment)
        value = parseExpression(parser)
    }

    parser.match(TokenType.Semicolon)

    return {
        type: AstType.LetStatement,
        spec: {
            type: AstType.Spec,
            name,
            dataType,
            value,
            location: parser.getLocation()
        } as Ast.Spec,
        location: parser.getLocation()
    }
}

export function parseAssignmentStatement(parser: Parser, left: Ast.Expression): Ast.AssignmentStatement {
    // const left = parseExpression(parser)

    parser.match(TokenType.Assignment)
    const value = parseExpression(parser)
    parser.match(TokenType.Semicolon)

    return {
        type: AstType.AssignmentStatement,
        left,
        value,
        location: parser.getLocation()
    }
}