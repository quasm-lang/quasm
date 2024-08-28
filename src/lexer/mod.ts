import * as Token from './token.ts'

import { getOptions } from '../options.ts'

function isWhitespace(char: string): boolean {
    // return /\s+/.test(char) // skips all whitespaces
    return /^[ \t]$/.test(char)
}

// Numericals
function isDigit(char: string): boolean {
    return /^\d$/.test(char)
}

// Identifier
function isAlpha(char: string): boolean {
    return /^[A-Za-z_]$/.test(char)
}

function lookupIdentifier(identifier: string): Token.Type {
    return Token.keywords[identifier] || Token.Type.Identifier
}

export class Lexer {
    private index: number = 0
    private line: number = 1
    private column: number = 1
    private lastToken?: Token.Token

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

    private newToken(type: Token.Type, literal?: string): Token.Token {
        return {
            type,
            line: this.line,
            column: this.column - (literal?.length || 1),
            literal: literal || ''
        }
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

    private shouldInsertSemicolon(): boolean {
        return [
            Token.Type.Integer,
            Token.Type.Float,
            Token.Type.Identifier,
            Token.Type.RightParen
        ].includes(this.lastToken!.type)
    }

    private readNumber(): string {
        let number: string = ''

        while (isDigit(this.current())) {
            number += this.current()
            this.advance()
        }

        // return this.newToken(Token.Type.Integer, number)
        return number
    }

    private readDecimal(): Token.Token {
        const integer = this.readNumber()

        // Now check if the number is decimal
        if (this.current() === '.') {
            this.advance()
            const fraction = this.readNumber()
            return this.newToken(Token.Type.Float, `${integer}.${fraction}`)
        }
        return this.newToken(Token.Type.Integer, integer)
    }

    private readIdentifier(): Token.Token {
        let literal: string = this.current()
        this.advance()

        while (isAlpha(this.current()) || isDigit(this.current())) {
            literal += this.current()
            this.advance()
        }

        return this.newToken(lookupIdentifier(literal), literal)
    }

    private readString(): Token.Token {
        let literal = ''
        this.advance()

        while (!this.eof() && this.current() !== "'") {
            literal += this.current()
            this.advance()
        }
        
        return this.newToken(Token.Type.String, literal)
    }

    private readMultiChar(): Token.Token {
        const chars = this.current() + this.peek(1)
        const tokenType = Token.multiCharTokenList[chars]
        this.advance() // Consume the second character
        return this.newToken(tokenType, chars)
    }

    nextToken(): Token.Token {
        let token: Token.Token = this.newToken(Token.Type.EOF)

        while (!this.eof()) {
            this.skipWhitespace()

            if (this.eof()) {
                break
            }
            
            while (this.current() === '/' && this.peek(1) === '/') {
                this.skipComment()
            }

            if (this.current() === '\n') {
                if (this.shouldInsertSemicolon()) {
                    token = this.newToken(Token.Type.Semicolon)
                    this.advance()
                    break
                } else {
                    this.advance()
                    continue
                }
            }
            else if (isDigit(this.current())) {
                token = this.readDecimal()
                break
            }
            else if (isAlpha(this.current())) {
                token = this.readIdentifier()
                break
            }
            else if (this.current() === "'") {
                token = this.readString()
                this.advance()
                break
            }
            else if (this.current()+this.peek(1) in Token.multiCharTokenList) {
                token = this.readMultiChar()
                this.advance()
                break
            }
            else if (this.current() in Token.tokenList) {
                token = this.newToken(Token.tokenList[this.current()], this.current())
                this.advance()
                break
            }
            
            else {
                throw Error(`Lexer error. Illegal char: '${this.current()}', position: ${this.index}`)
            }
        }
        
        if (getOptions().debug) {
            Deno.writeTextFileSync('debug/tokens.txt', 
                `│ ${token.type.padEnd(15)} │ ${token.line.toString().padStart(3)}:${token.column.toString().padStart(3)} │ ${token.literal}${token.type === Token.Type.EOF ? '' : '\n'}`, 
                {append: true}
            )
            
        }

        this.lastToken = token

        return token
    }

    peekToken(): Token.Token {
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