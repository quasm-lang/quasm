import { Lexer } from './lexer/mod.ts'
import { Parser } from './parser/mod.ts'
import { CodeGenerator } from './compiler/generator.ts'

import { Command } from './deps.ts'
import { ensureDirSync } from 'std/fs/mod.ts'
import { basename, join } from 'std/path/mod.ts'

await new Command()
    .name('Quasm')
    .version('0.0.3')
    .description('Compiles to WASM')
    .globalOption('-d, --debug', 'Enable debug output.')
    .action(() => console.log('Please use proper commands!'))

    .command('run', 'Compile internally and run')
    .arguments("<source:string>")
    .action((_, ...args) => {
        const file = args[0]
        compileAndRun(load(file))
    })

    .command("compile", 'Compile to WASM binary')
    .arguments("<file:string> [dest:string]")
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

function compile(src: string, dest: string) {
    const module = emit(src)

    ensureDirSync('./dist')
    Deno.writeFileSync(join('dist', `${basename(dest)}.wasm`), module.emitBinary())
}