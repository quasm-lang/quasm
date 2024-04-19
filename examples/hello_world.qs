fn add(a int, b int) -> int {
    return a + b
}

fn no_return() {
    println(11)
}

// function that returns value, but when called without assigning it, drop should be called
fn empty_call() -> int {
    return 1
}

fn main(a int) {
    // println()

    let b = 12
    let c = 28

    let result = add(b, c)
    println(result)

    no_return()
}