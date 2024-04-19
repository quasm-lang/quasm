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

    Int = 'int',
    Float = 'float',
    None = 'none',
    
    NewLine = 'new line', // TODO (Future):
    EOF = 'eof'
} // When adding new element to Token Type also add it manually again into the variable "tokenList"

export interface Token {
    type: TokenType
    line: number
    column: number
    // position: number
    literal: string
}

function isWhitespace(char: string): boolean {
    return /\s+/.test(char) // skips all whitespaces
    //return /[ \t]/.test(char)
}

// Numericals
function isDigit(char: string): boolean {
    return /^\d$/.test(char)
}

const tokenList: Record<string, TokenType> = {
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

const multiCharTokenList: Record<string, TokenType> = {
    '||': TokenType.LogicalOr,
    '&&': TokenType.LogicalAnd,
    '->': TokenType.RightArrow,
}

// Identifier
function isAlpha(char: string): boolean {
    return /^[A-Za-z_]$/.test(char);
}

// Keywords
const keywords: Record<string, TokenType> = {
    'let': TokenType.Let,
    'fn': TokenType.Fn,
    'return': TokenType.Return,
    'int': TokenType.Int,
    'float': TokenType.Float,
    'none': TokenType.None,
}

function lookupIdentifier(identifier: string): TokenType {
    return keywords[identifier] || TokenType.Identifier
}

// Datatypes
export type DataTypeToken = Token & {
    type: TokenType.Int | TokenType.Float | TokenType.None
}

export class Lexer {
    private index: number = 0
    private line: number = 1
    private column: number = 1

    constructor(private src: string) {}

    private advance(): string {
        if (this.index <= this.src.length) this.index++
        return this.src[this.index]
    }

    private current(): string {
        return this.src[this.index]
    }

    private peek(jump: number): string | null {
        if (this.index + jump < this.src.length) {
            return this.src[this.index+jump]
        }
        return null
    }

    private eof(): boolean {
        return this.index >= this.src.length
    }

    private skipWhitespace() {
        while (isWhitespace(this.current())) {
            if (this.current() === '\n') {
                this.line++
                this.column = 0
            }
            this.advance()
        }
    }

    private skipComment() {
        while (this.current() !== '\n' && this.current() !== '\r') {
            this.advance()
        }
        this.skipWhitespace()
    }

    private newToken(type: TokenType, literal?: string): Token {
        return {
            type,
            line: this.line,
            column: this.column,
            literal: (literal == undefined) ? '' : literal
        }
    }

    // Tokenizer functions
    private readNumber(): Token {
        let number: string = this.current()

        while (!this.eof()) {
            const next = this.peek(1)

            if (next && isDigit(next)) {
                number += this.advance()
            } else {
                break
            }
        }

        return this.newToken(TokenType.Number, number)
    }

    private readIdentifier(): Token {
        let literal: string = this.current()

        while (!this.eof()) {
            const next = this.peek(1)
            
            if (next && (isAlpha(next) || isDigit(next))) {
                const ch = this.advance()
                literal += ch
            } else {
                break
            }
        }

        return this.newToken(lookupIdentifier(literal), literal)
    }

    private readMultiChar(): Token {
        const chars = this.current() + this.peek(1)
        const tokenType = multiCharTokenList[chars]
        this.advance() // Consume the second character
        return this.newToken(tokenType, chars)
    }

    nextToken(): Token {
        let token: Token = this.newToken(TokenType.EOF)

        while (!this.eof()) {
            this.skipWhitespace()
            if (this.current() === '/' && this.peek(1) === '/') {
                this.skipComment()
            }
            
            if (this.eof()) {
                break
            }

            if (isDigit(this.current())) {
                token = this.readNumber()
                break
            }
            else if (isAlpha(this.current())) {
                token = this.readIdentifier()
                break
            }
            else if (this.current()+this.peek(1) in multiCharTokenList) {
                token = this.readMultiChar()
                break
            }
            else if (this.current() in tokenList) {
                token = this.newToken(tokenList[this.current()], this.current())
                break
            }
            
            else {
                throw Error(`Lexer error. Illegal char: '${this.current()}', position: ${this.index}`)
            }
        }
        
        this.advance()
        return token
    }

    peekToken() {
        const currentIndex = this.index
        const currentLine = this.line
        const token = this.nextToken()
        this.index = currentIndex
        this.line = currentLine
        return token
    }
}