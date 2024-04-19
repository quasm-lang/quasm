fn add(a i32, b i32) -> i32 {
    return a + b;
}

fn no_return() {
    println(11);
}

// function that returns value, but when called without assigning it, drop should be called explicitly
fn empty_call() -> i32 {
    return 1;
}

fn main() {
    // println()

    let b = 12;
    let c = 28;

    let result = add(b, c);
    println(result);

    no_return();
}