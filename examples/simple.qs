fn main() {
    let i = 0;
    while i <= 10 {
        print(i);
        i = adder(i, 1);
    }

    if i < 20 {
        printstr('yes');
    }
}

fn adder(a i32, b i32) -> i32 {
    return a + b;
}


