type Options = {
    debug: boolean
}

let options: Options = {
    debug: false
}

export function setOptions(newOptions: Options) {
    options = newOptions
}

export function getOptions(): Options {
    return options
}