import { SourceLocation } from './ast.ts'

export interface ParserError {
    message: string
    location: SourceLocation
}