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
    If = 'if',
    Else = 'else',
    While = 'while',
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
    'i32': TokenType.Type,
    'i64': TokenType.Type,
    'f32': TokenType.Type,
    'f64': TokenType.Type,
    'none': TokenType.Type,
    'let': TokenType.Let,
    'fn': TokenType.Fn,
    'return': TokenType.Return,
    'true': TokenType.True,
    'false': TokenType.False,
    'if': TokenType.If,
    'else': TokenType.Else,
    'while': TokenType.While,
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
    none = 'none'
}
export type DataTypeToken = Token & {
    type: TokenType.Type
    literal: DataType
}

export type InfixOperator = TokenType.Plus | TokenType.Minus | TokenType.Asterisk | TokenType.Slash