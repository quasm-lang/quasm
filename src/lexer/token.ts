export enum TokenType {
    Integer = 'integer',
    Float = 'float',
    Identifier = 'identifier',
    String = 'string',
    Type = 'type',
    
    Plus = '+',
    Minus = '-',
    Asterisk = '*',
    Slash = '/',
    Bang = '!',
    Comma = ',',
    Dot = '.',
    Colon = ':',
    Semicolon = ';',
    RightArrow = '->',
    LogicalOr = '||',
    LogicalAnd = '&&',
    Assignment = '=',
    Equality = '==',
    NonEquality = '!=',
    LessThan = '<',
    GreaterThan = '>',
    LessThanOrEqual = '<=',
    GreaterThanOrEqual = '>=',

    LeftParen = '(',
    RightParen = ')',
    LeftBrace = '{',
    RightBrace = '}',
    LeftBracket = '[',
    RightBracket = ']',

    Let = 'let',
    Func = 'func',
    Return = 'return',
    True = 'true',
    False = 'false',
    If = 'if',
    Else = 'else',
    While = 'while',
    Struct = 'struct',
    Export = 'export',
    Global = 'global',
    Import = 'import',
    From = 'from',
    
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
    ':': TokenType.Colon,
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
    '<=': TokenType.LessThanOrEqual,
    '>=': TokenType.GreaterThanOrEqual,
}

// Keywords
export const keywords: Record<string, TokenType> = {
    'i32': TokenType.Type,
    'i64': TokenType.Type,
    'f32': TokenType.Type,
    'f64': TokenType.Type,
    'none': TokenType.Type,
    'let': TokenType.Let,
    'func': TokenType.Func,
    'return': TokenType.Return,
    'true': TokenType.True,
    'false': TokenType.False,
    'if': TokenType.If,
    'else': TokenType.Else,
    'while': TokenType.While,
    'struct': TokenType.Struct,
    'export': TokenType.Export,
    'global': TokenType.Global,
    'import': TokenType.Import,
    'from': TokenType.From
}

// Datatypes
export enum DataType {
    i32 = 'i32',
    i64 = 'i64',
    f32 = 'f32',
    f64 = 'f64',
    none = 'none',
    struct = 'struct'
}
export type DataTypeToken = Token & {
    type: TokenType.Type
    literal: DataType
}

export type InfixOperator =
    TokenType.Plus |
    TokenType.Minus |
    TokenType.Asterisk |
    TokenType.Slash |
    TokenType.GreaterThan |
    TokenType.LessThan |
    TokenType.Equality |
    TokenType.GreaterThanOrEqual |
    TokenType.LessThanOrEqual |
    TokenType.Dot