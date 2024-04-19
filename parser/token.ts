export enum TokenType {
    Number = 'num',
    Identifier = 'identifier',
    
    Plus = '+',
    Minus = '-',
    Asterisk = '*',
    Slash = '/',
    LogicalOr = '||',
    LogicalAnd = '&&',
    RightArrow = '->',

    LeftParen = '(',
    RightParen = ')',
    LeftBrace = '{',
    RightBrace = '}',
    Comma = ',',
    Dot = '.',
    Semicolon = ';',
    EqualSign = '=',

    Let = 'let',
    Fn = 'fn',
    Return = 'return',

    Int32 = 'i32',
    Float32 = 'f32',
    None = 'none',
    
    NewLine = 'new line',
    EOF = 'eof'
} // When adding new element to Token Type also add it manually again into the variable "tokenList"

export interface Token {
    type: TokenType
    line: number
    column: number
    // position: number
    literal: string
}

export const tokenList: Record<string, TokenType> = {
    '+': TokenType.Plus,
    '-': TokenType.Minus,
    '*': TokenType.Asterisk,
    '/': TokenType.Slash,
    '(': TokenType.LeftParen,
    ')': TokenType.RightParen,
    '{': TokenType.LeftBrace,
    '}': TokenType.RightBrace,
    ',': TokenType.Comma,
    '.': TokenType.Dot,
    ';': TokenType.Semicolon,
    '=': TokenType.EqualSign
}

export const multiCharTokenList: Record<string, TokenType> = {
    '||': TokenType.LogicalOr,
    '&&': TokenType.LogicalAnd,
    '->': TokenType.RightArrow,
}

// Keywords
export const keywords: Record<string, TokenType> = {
    'let': TokenType.Let,
    'fn': TokenType.Fn,
    'return': TokenType.Return,
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