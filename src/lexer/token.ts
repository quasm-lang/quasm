export enum Type {
    Integer = 'integer',
    Float = 'float',
    Identifier = 'identifier',
    String = 'string',
    IdentifierType = 'identifier type',
    
    Plus = '+',
    Minus = '-',
    Asterisk = '*',
    Slash = '/',
    Comma = ',',
    Dot = '.',
    Colon = ':',
    Semicolon = ';',
    RightArrow = '->',
    LogicalNot = '!', 
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

    Var = 'var',
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
    Print = 'print',
    
    NewLine = 'new line',
    EOF = 'eof'
}

export interface Token {
    type: Type
    line: number
    column: number
    literal: string
}

export const tokenList: Record<string, Type> = {
    '+': Type.Plus,
    '-': Type.Minus,
    '*': Type.Asterisk,
    '/': Type.Slash,
    '!': Type.LogicalNot,
    '(': Type.LeftParen,
    ')': Type.RightParen,
    '{': Type.LeftBrace,
    '}': Type.RightBrace,
    '[': Type.LeftBracket,
    ']': Type.RightBracket,
    ',': Type.Comma,
    '.': Type.Dot,
    ':': Type.Colon,
    ';': Type.Semicolon,
    '=': Type.Assignment,
    '<': Type.LessThan,
    '>': Type.GreaterThan,
}

export const multiCharTokenList: Record<string, Type> = {
    '||': Type.LogicalOr,
    '&&': Type.LogicalAnd,
    '->': Type.RightArrow,
    '==': Type.Equality,
    '!=': Type.NonEquality,
    '<=': Type.LessThanOrEqual,
    '>=': Type.GreaterThanOrEqual,
}

// Keywords
export const keywords: Record<string, Type> = {
    'i32': Type.IdentifierType,
    'f64': Type.IdentifierType,
    'none': Type.IdentifierType,
    'string': Type.IdentifierType,
    'var': Type.Var,
    'func': Type.Func,
    'return': Type.Return,
    'true': Type.True,
    'false': Type.False,
    'if': Type.If,
    'else': Type.Else,
    'while': Type.While,
    'struct': Type.Struct,
    'export': Type.Export,
    'global': Type.Global,
    'import': Type.Import,
    'from': Type.From,
    'print': Type.Print
}

export type InfixOperator =
    Type.Plus |
    Type.Minus |
    Type.Asterisk |
    Type.Slash |
    Type.LogicalAnd |
    Type.LogicalOr |
    Type.GreaterThan |
    Type.LessThan |
    Type.Equality |
    Type.NonEquality |
    Type.GreaterThanOrEqual |
    Type.LessThanOrEqual |
    Type.Dot