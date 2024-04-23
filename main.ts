import { Lexer } from './parser/lexer.ts'
import { Parser } from './parser/parser.ts'
import { CodegenVisitor } from './compiler/visitor.ts'

import { Command } from 'npm:commander'
import { ensureDirSync } from 'https://deno.land/std@0.223.0/fs/mod.ts'

const program = new Command()
program
    .name('Quasm')
    .description('Compiles to WASM')
    .version('0.0.1')

program.command('run')
    .description('Compile internally and run')
    .argument('<src>', 'name')
    .action((str) => {
        try {
            const src = Deno.readTextFileSync(str)
            compileAndRun(src)
        } catch (error) {
            if (error instanceof Deno.errors.NotFound) {
                console.error(`File '${str}' was not found!`)
            } else {
                // otherwise re-throw
                throw error
            }
        }
    })

program.parse()

function compileAndRun(src: string) {
    const lexer = new Lexer(src)
    const parser = new Parser(lexer)
    const ast = parser.parseProgram()

    ensureDirSync('./debug')

    // Debug AST
    Deno.writeTextFileSync('./debug/ast.json', JSON.stringify(ast, null, 2))

    const visitor = new CodegenVisitor()
    const module = visitor.visit(ast)
    Deno.writeFileSync('./debug/output.wat', new TextEncoder().encode(module.emitText()))
    
    if (!module.validate()) {
        console.error("Validation error: The module is invalid.")
        Deno.exit(1)
    }
    
    module.optimize()
    Deno.writeFileSync('./debug/output.js', new TextEncoder().encode(module.emitAsmjs()))

    const wasmModule = new WebAssembly.Module(module.emitBinary())
    const wasmInstance = new WebAssembly.Instance(wasmModule, {
        env: {
            println: (value: number) => {
                console.log(value)
            },
            printstr: (stringPointer: number) => {
                const memory = wasmInstance.exports.memory as WebAssembly.Memory
                const buffer = new Uint8Array(memory.buffer, stringPointer)
                const decoder = new TextDecoder()
                const string = decoder.decode(buffer.subarray(0, buffer.indexOf(0)))
                console.log(string)
            }
        },
    })
    
    console.log('Program output:')
    const main = wasmInstance.exports.main as CallableFunction
    main()
}
