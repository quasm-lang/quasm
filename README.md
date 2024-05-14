# Quasm
Quasm is a programming language designed to compile directly to WebAssembly (WASM). It aims to provide a simple and expressive syntax while leveraging the performance benefits of WebAssembly.

```
fn main() {
    let result = add(12, 28);
    print(result);
}

fn add(a i32, b i32) -> i32 {
    return a + b;
}
```
## Getting Started
```deno run --allow-read --allow-write src/main.ts [path].qs```

or simply

```./run.sh run [path].qs```


## Contributing
Contributions to Quasm are welcome! If you find any issues or have suggestions for improvements, please open an issue or submit a pull request on the GitHub repository.