import { Parser } from '../parser.ts'
import { TokenType, DataType } from '../token.ts'
import { parseIdentifier } from '../expressions/core.ts'
import { parseExpression } from '../expressions/expression.ts'
import { LetStatement, Expression, AstType, Spec, AssignmentStatement, Identifier } from '../ast.ts'


export function parseLetStatement(parser: Parser): LetStatement {
    parser.match(TokenType.Let)
    
    const name = parseIdentifier(parser)
    let dataType: DataType | undefined
    let value: Expression | undefined

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
        } as Spec,
        location: parser.getLocation()
    }
}

export function parseAssignmentStatement(parser: Parser): AssignmentStatement {
    const name: Identifier = {
        type: AstType.Identifier,
        value: parser.match(TokenType.Identifier).literal,
        location: parser.getLocation()
    }

    parser.match(TokenType.Assignment)
    const value = parseExpression(parser)
    parser.match(TokenType.Semicolon)

    return {
        type: AstType.AssignmentStatement,
        name,
        value,
        location: parser.getLocation()
    }
}