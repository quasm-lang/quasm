import { Lexer } from './parser/lexer.ts'
import { Parser } from './parser/parser.ts'
import { CodeGenerator } from './compiler/generator.ts'

import { Command } from './deps.ts'
import { ensureDirSync } from 'https://deno.land/std@0.223.0/fs/mod.ts'

const program = new Command()
program
    .name('Quasm')
    .description('Compiles to WASM')
    .version('0.0.2')

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
    // Parsing
    const lexer = new Lexer(src)
    const parser = new Parser(lexer)
    const ast = parser.parseProgram()

    // Debug
    ensureDirSync('./debug')
    Deno.writeTextFileSync('./debug/ast.json', JSON.stringify(ast, null, 2))

    const codeGen = new CodeGenerator()
    const module = codeGen.visit(ast)
    Deno.writeFileSync('./debug/output.wat', new TextEncoder().encode(module.emitText()))
    
    if (!module.validate()) {
        console.error("Validation error: The module is invalid.")
        Deno.exit(1)
    }
    
    module.optimize()
    Deno.writeFileSync('./debug/output.optimized.wat', new TextEncoder().encode(module.emitText()))
    Deno.writeFileSync('./debug/output.optimized.ams.js', new TextEncoder().encode(module.emitAsmjs()))

    const wasmModule = new WebAssembly.Module(module.emitBinary())
    const wasmInstance = new WebAssembly.Instance(wasmModule, {
        env: {
            print: (value: number) => {
                console.log(value)
            },
            printstr: (stringPointer: number) => {
                const memory = wasmInstance.exports.memory as WebAssembly.Memory
                const buffer = new Uint8Array(memory.buffer, stringPointer)
                const string = new TextDecoder().decode(buffer.subarray(0, buffer.indexOf(0)))
                console.log(string)
            }
        },
    })

    console.log('>')
    const main = wasmInstance.exports.main as CallableFunction
    main()
}
