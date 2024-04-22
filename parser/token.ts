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

    Int32 = 'i32',
    Float32 = 'f32',
    None = 'none',
    
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
    'i32': TokenType.Int32,
    'f32': TokenType.Float32,
    'none': TokenType.None,
}

// Datatypes
export type DataType = TokenType.Int32 | TokenType.Float32 | TokenType.None
export type DataTypeToken = Token & {
    type: DataType
}

export type Operator = TokenType.Plus | TokenType.Minus | TokenType.Asterisk | TokenType.Slash