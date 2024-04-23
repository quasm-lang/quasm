import {
    Token,
    TokenType,
    keywords,
    tokenList,
    multiCharTokenList
} from './token.ts'

function isWhitespace(char: string): boolean {
    return /\s+/.test(char) // skips all whitespaces
    //return /[ \t]/.test(char)
}

// Numericals
function isDigit(char: string): boolean {
    return /^\d$/.test(char)
}

// Identifier
function isAlpha(char: string): boolean {
    return /^[A-Za-z_]$/.test(char);
}

function lookupIdentifier(identifier: string): TokenType {
    return keywords[identifier] || TokenType.Identifier
}

export class Lexer {
    private index: number = 0
    private line: number = 1
    private column: number = 1

    constructor(private src: string) {}

    private advance(): string {
        if (this.index < this.src.length) {
            if (/\r?\n/.test(this.current())) {
                this.column = 1
                this.line++
            } else {
                this.column++
            }
            this.index++
        }
        return this.current()
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
        while (!this.eof() && isWhitespace(this.current())) {
            this.advance()
        }
    }

    private skipComment() {
        while (!this.eof() && this.current() !== '\n' && this.current() !== '\r') {
            this.advance()
        }
        this.skipWhitespace()
    }

    private newToken(type: TokenType, literal?: string): Token {
        return {
            type,
            line: this.line,
            column: this.column - (literal?.length || 1),
            literal: literal || ''
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

    private readString(): Token {
        let literal = ''
        this.advance()

        while (!this.eof() && this.current() !== "'") {
            literal += this.current()
            this.advance()
        }
        
        // this.advance()
        return this.newToken(TokenType.String, literal)
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
            
            while (this.current() === '/' && this.peek(1) === '/') {
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
            else if (this.current() === "'") {
                token = this.readString()
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

    peekToken(): Token {
        const currentIndex = this.index
        const currentLine = this.line
        const currentColumn = this.column
        const token = this.nextToken()
        this.index = currentIndex
        this.line = currentLine
        this.column = currentColumn
        return token
    }
}