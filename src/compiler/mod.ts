import { Lexer } from '../lexer/mod.ts'
import { Parser } from '../parser/mod.ts'
import { CodeGenerator } from './generator.ts'
import { SymbolTable } from '../compiler/symbolTable.ts'
import { getOptions } from '../options.ts'

import { binaryen } from '../deps.ts'

export function emit(src: string): binaryen.Module {
    const debug = getOptions().debug
    const symbolTable = new SymbolTable()
    
    const lexer = new Lexer(src)
    const parser = new Parser(lexer, symbolTable)
    const ast = parser.parseProgram()

    if (debug) {
        Deno.writeTextFileSync('./debug/ast.json', JSON.stringify(ast, null, 2))
    }

    const codeGen = new CodeGenerator(symbolTable)
    const module = codeGen.visit(ast)

    if (debug) {
        Deno.writeTextFileSync('./debug/ast.json', JSON.stringify(ast, null, 2))
        Deno.writeFileSync('./debug/output.wat', new TextEncoder().encode(module.emitText()))
    }


    if (!module.validate()) {
        console.error('Validation error: The module is invalid.')
        Deno.exit(1)
    }

    module.optimize()

    if (debug) {
        Deno.writeFileSync('./debug/output.optimized.wat', new TextEncoder().encode(module.emitText()))
    }

    return module
}