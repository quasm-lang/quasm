export enum TokenType {
    Number = 'num',
    Identifier = 'identifier',
    String = 'string',
    
    Plus = '+',
    Minus = '-',
    Asterisk = '*',
    Slash = '/',
    Bang = '!',
    Comma = ',',
    Dot = '.',
    Semicolon = ';',
    RightArrow = '->',
    LogicalOr = '||',
    LogicalAnd = '&&',
    Assignment = '=',
    Equality = '==',
    NonEquality = '!=',
    LessThan = '<',
    GreaterThan = '>',
    LessThanEquals = '<=',
    GreaterThanEquals = '>=',

    LeftParen = '(',
    RightParen = ')',
    LeftBrace = '{',
    RightBrace = '}',
    LeftBracket = '[',
    RightBracket = ']',

    Let = 'let',
    Fn = 'fn',
    Return = 'return',
    True = 'true',
    False = 'false',
    Type = 'type',
    Export = 'export',
    
    NewLine = 'new line',
    EOF = 'eof'
}

export interface Token {
    type: TokenType
    line: number
    column: number
    literal: string
}

export const tokenList: Record<string, TokenType> = {
    '+': TokenType.Plus,
    '-': TokenType.Minus,
    '*': TokenType.Asterisk,
    '/': TokenType.Slash,
    '!': TokenType.Bang,
    '(': TokenType.LeftParen,
    ')': TokenType.RightParen,
    '{': TokenType.LeftBrace,
    '}': TokenType.RightBrace,
    ',': TokenType.Comma,
    '.': TokenType.Dot,
    ';': TokenType.Semicolon,
    '=': TokenType.Assignment,
    '<': TokenType.LessThan,
    '>': TokenType.GreaterThan,
}

export const multiCharTokenList: Record<string, TokenType> = {
    '||': TokenType.LogicalOr,
    '&&': TokenType.LogicalAnd,
    '->': TokenType.RightArrow,
    '==': TokenType.Equality,
    '!=': TokenType.NonEquality,
    '<=': TokenType.LessThanEquals,
    '>=': TokenType.GreaterThanEquals,
}

// Keywords
export const keywords: Record<string, TokenType> = {
    'let': TokenType.Let,
    'fn': TokenType.Fn,
    'return': TokenType.Return,
    'true': TokenType.True,
    'false': TokenType.False,
    'i32': TokenType.Type,
    'f32': TokenType.Type,
    'none': TokenType.Type,
    'export': TokenType.Export
}

// Datatypes
// export type DataType = 'i32' | 'f32' | 'none'
export enum DataType {
    i32 = 'i32',
    f32 = 'f32',
    none = 'none'
}
export type DataTypeToken = Token & {
    type: TokenType.Type
    literal: DataType
}

export type Operator = TokenType.Plus | TokenType.Minus | TokenType.Asterisk | TokenType.Slash