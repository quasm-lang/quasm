import { Lexer } from './lexer/mod.ts'
import { Parser } from './parser/mod.ts'
import { CodeGenerator } from './compiler/generator.ts'

import { Command } from './deps.ts'
import { ensureDirSync } from 'std/fs/mod.ts'
import { basename, join } from 'std/path/mod.ts'
import { SymbolTable } from './compiler/symbolTable.ts'

await new Command()
    .name('Quasm')
    .version('0.0.4')
    .description('Compiles to WASM')
    .globalOption('-d, --debug', 'Enable debug output.')
    .action(() => console.log('Please use proper commands!'))

    .command('run', 'Compile internally and run')
    .arguments('<source:string>')
    .action((_, ...args) => {
        const file = args[0]
        compileAndRun(load(file))
    })

    .command('compile', 'Compile to WASM binary')
    .arguments('<file:string> [dest:string]')
    .action((_, ...args) => {
        const file = args[0]
        const dest = args[1] ? args[1] : file.replace(/\.[^/.]+$/, '')
        compile(load(file), dest)
    })
    .parse(Deno.args)

function load(file: string): string {
    try {
        const src = Deno.readTextFileSync(file)
        return src
    } catch (error) {
        if (error instanceof Deno.errors.NotFound) {
            console.error(`File '${file}' was not found!`)
            Deno.exit(1)
        } else {
            throw error
        }
    }
}

function emit(src: string) {
    const symbolTable = new SymbolTable()
    
    // Parsing
    const lexer = new Lexer(src)
    const parser = new Parser(lexer, symbolTable)
    const ast = parser.parseProgram()

    // Debug
    ensureDirSync('./debug')
    Deno.writeTextFileSync('./debug/ast.json', JSON.stringify(ast, null, 2))

    const codeGen = new CodeGenerator(symbolTable)
    const module = codeGen.visit(ast)
    Deno.writeFileSync('./debug/output.wat', new TextEncoder().encode(module.emitText()))
    Deno.writeFileSync('./debug/output.stackIR.wat', new TextEncoder().encode(module.emitStackIR()))

    if (!module.validate()) {
        console.error("Validation error: The module is invalid.")
        Deno.exit(1)
    }

    module.optimize()
    Deno.writeFileSync('./debug/output.optimized.wat', new TextEncoder().encode(module.emitText()))
    Deno.writeFileSync('./debug/output.optimized.ams.js', new TextEncoder().encode(module.emitAsmjs()))

    return module
}

function compileAndRun(src: string) {
    const module = emit(src)

    const wasmModule = new WebAssembly.Module(module.emitBinary())
    const wasmInstance = new WebAssembly.Instance(wasmModule, {
        env: {
            __print_primitive: (value: number) => {
                console.log(value)
            },
            __print_str: (ptr: number) => {
                const memory = wasmInstance.exports.memory as WebAssembly.Memory
                const view = new DataView(memory.buffer)
                const len = view.getUint32(ptr, true) // Read the length (first 4 bytes)
                const bytes = new Uint8Array(memory.buffer, ptr + 4, len)
                const str = new TextDecoder().decode(bytes)
                console.log(str)
            }
        },
    })

    // console.log('>')
    const main = wasmInstance.exports.main as CallableFunction
    main()

    // const memory = wasmInstance.exports.memory as WebAssembly.Memory
    // console.log(memory.buffer)
}

function compile(src: string, dest: string) {
    const module = emit(src)

    ensureDirSync('./dist')
    Deno.writeFileSync(join('dist', `${basename(dest)}.wasm`), module.emitBinary())
}