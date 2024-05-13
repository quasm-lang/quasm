fn main() {
    // Data Types
    let big_num: i64
    let integer: i32
    let floating_num: f32
    let big_float: f64
    let just_str: string
    let some_str = 'Hello World!'
    print(some_str)

    // Function call and error handling
    add(32, 9)
    let (result, error) = divide(10, 0)
    if error != none {
        print(error)
    }

    // Control flow
    let numer = 1

    if number == 0 {
        print('zero')
    } else if number == 1 {
        print('it's 1')
    } else {
        print('something else')
    }

    switch number {
        case 1:
            print(1)
        case 2:
            print(2)
        default:
            print(0)
    }

    // Loops
    for i = 10 to 0 step -1 {
        print(i)
    }

    while number == 3 {
        break
    }

    let numbers array<int> = [1, 2, 3, 4]
    for num in number {
        print(num)
    }

    // Structs
    let person1 = Person {name: 'Selemene', age: 99}
    let person2 = Person.new('Claude', 2)
    let (name, age) = person2.get_name_and_age()
}

// Function declaration
export fn add(a i32, b i32) -> i32 {
    let result = a + b
    return result
}

export fn divide(a i32, b i32) -> (i32, error) {
    // export keyword to make functions accessible from other modules
    if b == 0 {
        return 0, error('division by zero')
    }
    
    return a / b, none
}


struct Person {
    name string
    age i32
}

methods Person {
    fn new(self, name string, age i32) {
        self.name = name
        self.age = age
        return self
    }

    fn get_name_and_age(self) -> (string, i32) {
        return self.name, self.age
    }
}

