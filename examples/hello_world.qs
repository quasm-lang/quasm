// TODO: implement string to the language

fn add(a i32, b i32) -> i32 {
    return a + b;
}

fn main() {
    // test PRATT
    println(2 * (3 - 1)); // 4
    println((5 + 3) * 2 - 4 / 2); // 14
    println(10 - (2 + 3) * 4 + 6); // -4
    println((8 - 3) * (4 + 2) / 3); // 10
    println(12 + 5 * (3 - 1) - 6 / 2); // 19
    println((9 - 5) * 3 + 12 / (2 + 2)); // 15

    let b = 12;
    let c = 28;

    let result = add(b, c);
    println(result);
}