
import { Command } from './deps.ts'
import { ensureDirSync } from 'std/fs/mod.ts'
import { basename, join } from 'std/path/mod.ts'
import { setOptions, getOptions } from './options.ts'

import { emit } from './compiler/mod.ts'

await new Command()
    .name('Quasm')
    .version('0.0.6')
    .description('Compiles to WASM')
    .globalOption('-d, --debug', 'Enable debugging.', { default: false })
    .action(() => console.log('Please use proper commands!'))

    .command('run', 'Compile internally and run')
    .arguments('<source:string>')
    .action((options, ...args) => {
        const file = args[0]
        setOptions(options)
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

function compileAndRun(src: string) {
    const module = emit(src)

    const wasmModule = new WebAssembly.Module(module.emitBinary())
    const wasmInstance = new WebAssembly.Instance(wasmModule, {
        env: {
            __print_primitive: (value: number) => {
                console.log(`${value}`)
            },
            __print_str: (ptr: number) => {
                const memory = wasmInstance.exports.memory as WebAssembly.Memory
                const view = new DataView(memory.buffer)
                const len = view.getUint32(ptr, true) // Read the byte length (first 4 bytes)
                const bytes = new Uint8Array(memory.buffer, ptr + 4, len)
                const str = new TextDecoder().decode(bytes)
                console.log(str)
            }
        },
    })

    const main = wasmInstance.exports.main as CallableFunction
    
    if (typeof main === 'function') main()

    if (getOptions().debug) {
        const memory = wasmInstance.exports.memory as WebAssembly.Memory
        Deno.writeFileSync('debug/memory.hex', new Uint8Array(memory.buffer))
    }
}

function compile(src: string, dest: string) {
    const module = emit(src)

    ensureDirSync('./dist')
    Deno.writeFileSync(join('dist', `${basename(dest)}.wasm`), module.emitBinary())
}