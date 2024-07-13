import { emptyDirSync } from 'std/fs/mod.ts'

type Options = {
    debug: boolean
}

let options: Options = {
    debug: false
}

export function setOptions(newOptions: Options) {
    if (newOptions.debug) {
        emptyDirSync('./debug')
    }
    options = newOptions
}

export function getOptions(): Options {
    return options
}