import { DataType } from '../datatype/mod.ts'

export enum TokenType {
    Integer = 'integer',
    Float = 'float',
    Identifier = 'identifier',
    String = 'string',
    DataType = 'datatype',
    
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
    Print = 'print',
    
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
    'i32': TokenType.DataType,
    'i64': TokenType.DataType,
    'f32': TokenType.DataType,
    'f64': TokenType.DataType,
    'none': TokenType.DataType,
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
    'from': TokenType.From,
    'print': TokenType.Print
}

export type DataTypeToken = Token & {
    type: TokenType.DataType
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