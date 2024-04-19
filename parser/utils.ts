import { TokenType, DataTypeToken } from './lexer.ts'
import { OperatorType, DataType } from './ast.ts'


export const tokenToOperatorType: Partial<Record<TokenType, OperatorType>> = {
    [TokenType.Plus]: OperatorType.Add,
    [TokenType.Minus]: OperatorType.Subtract,
    [TokenType.Asterisk]: OperatorType.Multiply,
    [TokenType.Slash]: OperatorType.Divide,
    // Add other operators as needed
}

export const dataTypeTokenToAst: Record<DataTypeToken['type'], DataType> = {
    [TokenType.Int]: DataType.Int,
    [TokenType.Float]: DataType.Float,
    [TokenType.None]: DataType.None,
}