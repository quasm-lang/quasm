func fibonacci(n: i32) -> i32 {
    if n <= 1 {
        return n;
    }
    return fibonacci(n - 1) + fibonacci(n - 2);
}

func main() {
    let n = 10;
    let i = 0;
    
    while i <= n {
        let result = fibonacci(i);
        print(result);
        i = i + 1;
    }
}
