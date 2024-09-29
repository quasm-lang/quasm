import { Lexer } from '../lexer/mod.ts'
import { SymbolTable } from '../symbolTable.ts'
import * as Ast from './ast.ts'
import * as Type from '../datatype/mod.ts'
import * as Token from '../lexer/token.ts'
import { getPrecedence } from './utils.ts'

export class Parser {
    curToken: Token.Token
    
    constructor(private lexer: Lexer, public symbolTable: SymbolTable) {
        this.curToken = this.lexer.nextToken()
    }

    private eof() {
        return this.curToken.type === Token.Type.EOF
    }

    consume(): Token.Token {
        const prev = this.curToken
        this.curToken = this.lexer.nextToken()
        return prev
    }

    eq(type: Token.Type): boolean {
        return this.curToken.type === type
    }

    peekEq(token: Token.Type): boolean {
        return this.lexer.peekToken().type === token
    }

    match(type: Token.Type): Token.Token {
        if (this.eq(type)) {
            return this.consume()
        }
        throw Error(`Parser error: Expected '${type}', but got '${this.curToken.type}' at line ${this.curToken.line} column ${this.curToken.column}`)
    }

    getLocation(): Ast.SourceLocation {
        return {
            start: {
                column: this.curToken.column,
                line: this.curToken.line
            }
        }
    }

    parseProgram(): Ast.Program {
        const statements: Ast.Statement[] = []
        try {
            while (!this.eof()) {
                const statement = this.parseStatement()
                statements.push(statement)
            }
    
            return {
                type: Ast.Type.Program,
                statements,
                location: this.getLocation()
            }
        } catch (err) {
            const error = err as Error
            console.log(error)
            Deno.exit(1)
        }
    }

    parseStatement(): Ast.Statement {
        if (this.eq(Token.Type.Export)) {
            return this.parseExport()
        } else if (this.eq(Token.Type.Func)) {
            return this.parseFuncStatement()
        } else if (this.eq(Token.Type.Return)) {
            return this.parseReturnStatement()
        } else if (this.eq(Token.Type.Var)) {
            return this.parseVarStatement()
        } else if (this.eq(Token.Type.If)) {
            return this.parseIfStatement()
        } else if (this.eq(Token.Type.While)) {
            return this.parseWhileStatement()
        } else if (this.eq(Token.Type.Print)) {
            return this.parsePrintStatement()
        } else {
            const expr = this.parseExpression(0)
            if (this.eq(Token.Type.Assignment)) {
                return this.parseAssignmentStatement(expr)
            } else {
                return this.parseExpressionStatement(expr)
            }
        }
    }

    parseExport(): Ast.FuncStatement {
        this.match(Token.Type.Export)
        
        if (this.eq(Token.Type.Func)) {
            const statement = this.parseFuncStatement()
            statement.exported = true
            return statement
        }

        throw new Error('Parser error: Unexpected token after export.')
    }

    parseBlockStatement(): Ast.BlockStatement {
        this.match(Token.Type.LeftBrace)
 
        const statements: Ast.Statement[] = []
        
        while (
            !this.eq(Token.Type.RightBrace) &&
            !this.eq(Token.Type.EOF)
        ) {
            const statement = this.parseStatement()
            statements.push(statement)
        }
        
        this.match(Token.Type.RightBrace)
    
        return {
            type: Ast.Type.BlockStatement,
            statements,
            location: this.getLocation()
        }
    }

    parsePrintStatement(): Ast.PrintStatement {
        this.match(Token.Type.Print)
        const expression = this.parseExpression(0)
        this.match(Token.Type.Semicolon)
    
        return {
            type: Ast.Type.PrintStatement,
            expression,
            location: this.getLocation()
        }
    }

    parseStructStatement(): Ast.StructDeclaration {
        this.match(Token.Type.Struct)
        const name = this.parseIdentifier()
        this.match(Token.Type.LeftBrace)
        const fields = this.parseFields(null, Token.Type.RightBrace)
        this.match(Token.Type.RightBrace)
    
        return {
            type: Ast.Type.StructDeclaration,
            name,
            fields,
            location: this.getLocation()
        }
    }
    
    parseFuncStatement(): Ast.FuncStatement {
        this.match(Token.Type.Func)
        const name = this.parseIdentifier()
        this.match(Token.Type.LeftParen)
        const parameters = this.parseFields(Token.Type.Comma, Token.Type.RightParen)
        this.match(Token.Type.RightParen)
    
        let returnType: Type.DataType = Type.None // Default return type
        if (this.eq(Token.Type.RightArrow)) {     // scenario in which type exists
            this.match(Token.Type.RightArrow)
            returnType = this.parseDataType()
        }
    
        const block = this.parseBlockStatement()
        
        // Define function in symbol table
        this.symbolTable.defineFunction(
            name.value,
            parameters.map(param => param.dataType),
            returnType
        )

        return {
            type: Ast.Type.FuncStatement,
            name,
            parameters,
            returnType,
            body: block,
            exported: false,
            location: this.getLocation()
        }
    }

    parseReturnStatement(): Ast.ReturnStatement {
        this.match(Token.Type.Return)
        const value = this.parseExpression(0)
        this.match(Token.Type.Semicolon)
    
        return {
            type: Ast.Type.ReturnStatement,
            value,
            location: this.getLocation()
        }
    }

    parseVarStatement(): Ast.VarStatement {
        this.match(Token.Type.Var)
    
        const specs: Ast.Spec[] = []
        do {
            const name = this.parseIdentifier()
            let dataType: Type.DataType | undefined
            if (this.eq(Token.Type.Colon)) {
                this.match(Token.Type.Colon)
                dataType = this.parseDataType()
            }
            specs.push({
                type: Ast.Type.Spec,
                name,
                dataType,
                location: this.getLocation()
            })
            if (!this.eq(Token.Type.Comma)) break
            this.match(Token.Type.Comma)
        } while (true)
        
        this.match(Token.Type.Assignment)
        const value = this.parseExpression(0)
        this.match(Token.Type.Semicolon)

        return {
            type: Ast.Type.VarStatement,
            specs,
            value,
            location: this.getLocation()
        }
    }

    parseAssignmentStatement(left: Ast.Expression): Ast.AssignmentStatement {
        this.match(Token.Type.Assignment)
        const value = this.parseExpression(0)
        this.match(Token.Type.Semicolon)
    
        return {
            type: Ast.Type.AssignmentStatement,
            left,
            value,
            location: this.getLocation()
        }  
    }

    parseIfStatement(): Ast.IfStatement {
        this.match(Token.Type.If)
        const condition = this.parseExpression(0)
        const body = this.parseBlockStatement()

        let alternate: Ast.IfStatement | Ast.BlockStatement | undefined
        if (this.eq(Token.Type.Else)) {
            this.match(Token.Type.Else)
            
            if (this.eq(Token.Type.If)) {
                alternate = this.parseIfStatement()
            } else {
                alternate = this.parseBlockStatement()
            }
        }
        
        return {
            type: Ast.Type.IfStatement,
            condition,
            body,
            alternate,
            location: this.getLocation()
        }
    }

    parseWhileStatement(): Ast.WhileStatement {
        this.match(Token.Type.While)
        const condition = this.parseExpression(0)
        const body = this.parseBlockStatement()
    
        return {
            type: Ast.Type.WhileStatement,
            condition,
            body,
            location: this.getLocation()
        }
    }

    parseExpressionStatement(expression: Ast.Expression): Ast.ExpressionStatement {
        // this.match(Token.Type.Semicolon)
        while (this.eq(Token.Type.Semicolon)) {
            this.match(Token.Type.Semicolon)
        }
    
        return {
            type: Ast.Type.ExpressionStatement,
            expression,
            location: this.getLocation()
        }
    }

    parseExpression(precedence: number = 0): Ast.Expression {
        let left = this.parsePrefixExpression()
    
        while (precedence < getPrecedence(this.curToken.type)) {
            left = this.parseInfixExpression(left)
        }
    
        return left
    }

    parsePrefixExpression(): Ast.Expression {
        switch (this.curToken.type) {
            case Token.Type.Integer:
                return this.parseIntegerLiteral()
            case Token.Type.Float:
                return this.parseFloatLiteral()
            case Token.Type.String:
                return this.parseStringLiteral()
            case Token.Type.Identifier:
                return this.parseIdentifier()
            case Token.Type.Minus:
                return this.parseUnaryExpression()
            case Token.Type.LogicalNot:
                return this.parseUnaryExpression()
            case Token.Type.LeftParen:
                return this.parseGroupedExpression()
            case Token.Type.LeftBracket:
                return this.parseArrayLiteral()
        }
        throw new Error(`Parser error: No prefix found for ${this.curToken.literal}`)
    }

    parseInfixExpression(left: Ast.Expression): Ast.Expression {
        switch (this.curToken.type) {
            case Token.Type.Plus:
            case Token.Type.Minus:
            case Token.Type.Asterisk:
            case Token.Type.Slash:
            case Token.Type.LogicalOr:
            case Token.Type.LogicalAnd:
            case Token.Type.GreaterThan:
            case Token.Type.LessThan:
            case Token.Type.Equality:
            case Token.Type.LessThanOrEqual:
            case Token.Type.GreaterThanOrEqual:
                return this.parseBinaryExpression(left)
            case Token.Type.LeftParen:
                return this.parseCallExpression(left as Ast.Identifier)
            case Token.Type.LeftBracket:
                return this.parseIndexExpression(left)
            case Token.Type.Dot: {
                this.match(Token.Type.Dot)
                const member = this.parseIdentifier()
                return {
                    type: Ast.Type.MemberAccessExpression,
                    base: left,
                    member,
                    location: this.getLocation()
                } as Ast.MemberAccessExpression
            }   
            default:
                return left
        }
    }

    parseUnaryExpression(): Ast.UnaryExpression {
        return {
            type: Ast.Type.UnaryExpression,
            operator: this.consume().type,
            right: this.parseExpression(0),
            location: this.getLocation()
        }
    }

    parseGroupedExpression(): Ast.Expression {
        this.match(Token.Type.LeftParen)
        const firstExpression = this.parseExpression(0)
        
        // It's a tuple
        if (this.eq(Token.Type.Comma)) {
            this.match(Token.Type.Comma)
            const elements = [firstExpression, this.parseExpression(0)]
            
            while (this.eq(Token.Type.Comma)) {
                this.match(Token.Type.Comma)
                elements.push(this.parseExpression(0))
            }
            
            this.match(Token.Type.RightParen)
            return {
                type: Ast.Type.TupleLiteral,
                elements,
                location: this.getLocation()
            } as Ast.TupleLiteral
        }
    
        // It's a grouped expression
        this.match(Token.Type.RightParen)
        return firstExpression
    }

    parseBinaryExpression(left: Ast.Expression): Ast.BinaryExpression {
        const operator = this.consume().type
        const precedence = getPrecedence(operator)
        const right = this.parseExpression(precedence)
    
        return {
            type: Ast.Type.BinaryExpression,
            left,
            operator,
            right,
            location: this.getLocation()
        } as Ast.BinaryExpression
    }

    parseCallExpression(identifier: Ast.Identifier): Ast.CallExpression {
        this.match(Token.Type.LeftParen)
        const args: Ast.Expression[] = this.parseCallArguments()
        this.match(Token.Type.RightParen)
    
        return {
            type: Ast.Type.CallExpression,
            callee: identifier,
            arguments: args,
            location: this.getLocation()
        }
    }

    parseCallArguments(): Ast.Expression[] {
        const args: Ast.Expression[] = []
    
        while (!this.eq(Token.Type.RightParen)) {
            args.push(this.parseExpression(0))
    
            if (!this.eq(Token.Type.RightParen)) {
                this.match(Token.Type.Comma)
            }
        }
    
        return args
    }

    parseFields(delimiter: Token.Type | null, closingToken: Token.Type): Ast.Field[] {
        const parameters: Ast.Field[] = []
    
        while (!this.eq(closingToken)) {
            const name = this.parseIdentifier()
            this.match(Token.Type.Colon)
            const dataType = this.parseIdentifierType()
    
            const param: Ast.Field = {
                type: Ast.Type.Field,
                name: name,
                dataType,
                location: this.getLocation()
            }
            parameters.push(param)
    
            if (!this.eq(closingToken) && delimiter !== null) {
                this.match(delimiter)
            }
        }
    
        return parameters
    }

    parseListLiteral(openToken: Token.Type, closeToken: Token.Type) {
        this.match(openToken)
    
        const elements: Ast.Expression[] = []
    
        while (!this.eq(closeToken)) {
            elements.push(this.parseExpression(0))
    
            if (this.eq(Token.Type.Comma)) {
                this.match(Token.Type.Comma)
            }
        }
    
        this.match(Token.Type.RightBracket)
    
        return elements
    }

    parseArrayLiteral(): Ast.ArrayLiteral {
        const elements = this.parseListLiteral(Token.Type.LeftBracket, Token.Type.RightBracket)
    
        return {
            type: Ast.Type.ArrayLiteral,
            elements,
            location: this.getLocation()
        }
    }

    parseTupleLiteral(): Ast.TupleLiteral {
        const elements = this.parseListLiteral(Token.Type.LeftParen, Token.Type.RightParen)
    
        return {
            type: Ast.Type.TupleLiteral,
            elements,
            location: this.getLocation()
        }
    }

    parseIndexExpression(left: Ast.Expression) {
        this.match(Token.Type.LeftBracket)
        const index = this.parseExpression(0)
        this.match(Token.Type.RightBracket)
        return {
            type: Ast.Type.IndexExpression,
            base: left,
            index,
            location: this.getLocation()
        }
    }

    parseIntegerLiteral(): Ast.IntegerLiteral {
        return {
            type: Ast.Type.IntegerLiteral,
            value: parseInt(this.consume().literal),
            location: this.getLocation()
        }
    }
    
    parseFloatLiteral(): Ast.FloatLiteral {
        return {
            type: Ast.Type.FloatLiteral,
            value: parseFloat(this.consume().literal),
            location: this.getLocation()
        }
    }
    
    parseStringLiteral(): Ast.StringLiteral {
        const value = this.consume().literal
        this.symbolTable.defineStringLiteral(value)
        
        return {
            type: Ast.Type.StringLiteral,
            value,
            location: this.getLocation()
        }
    }
    
    parseIdentifier(): Ast.Identifier {
        return {
            type: Ast.Type.Identifier,
            value: this.match(Token.Type.Identifier).literal,
            location: this.getLocation()
        }
    }
    
    parseIdentifierType(): Type.DataType {
        return Type.fromString(this.match(Token.Type.IdentifierType).literal)
    }
    
    parseDataType(): Type.DataType {
        if (this.eq(Token.Type.LeftBracket)) {
            this.match(Token.Type.LeftBracket)
            const elementType = this.parseIdentifierType()
            this.match(Token.Type.RightBracket)
            return Type.createArrayType(elementType)
        } else if (this.eq(Token.Type.LeftParen)) {
            this.match(Token.Type.LeftParen)
            const types = [this.parseIdentifierType()]
            
            while (this.eq(Token.Type.Comma)) {
                this.match(Token.Type.Comma)
                types.push(this.parseIdentifierType())
            }
            
            this.match(Token.Type.RightParen)
            return types.length === 1 ? types[0] : Type.createTupleType(types)
        }
    
        return this.parseIdentifierType()
    }
    
}