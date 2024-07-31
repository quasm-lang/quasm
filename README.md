# Quasm
Quasm is a programming language designed to compile directly to WebAssembly (WASM). It aims to provide a simple and expressive syntax while leveraging the performance benefits of WebAssembly.

**Important Note: Quasm is currently in its early, immature state and is not yet ready for production use. The language is under active development and may undergo significant changes.**

```
func main() {
    let result = add(12, 28);
    print(result);
}

func add(a: i32, b: i32) -> i32 {
    return a + b;
}
```
## Getting Started
```deno run --allow-read --allow-write src/main.ts run tests/simple.qsm```

or simply

```deno task -q run tests/simple.qsm```


## Contributing
Contributions to Quasm are welcome! If you find any issues or have suggestions for improvements, please open an issue or submit a pull request on the GitHub repository.