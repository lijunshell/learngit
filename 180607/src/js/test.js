console.log(a);   // undefined
var a = 20;

//箭头函数可以替换函数表达式，但是不能替换函数声明
//箭头函数中，没有this


// function foo(){
//     function bar() {
//         return 3;
//     }
//     return bar();
//     function bar() {
//         return 8;
//     }
// }
// alert(foo());



// function foo(){
//     var bar = function() {
//         return 3;
//     };
//     return bar();
//     var bar = function() {
//         return 8;
//     };
// }
// alert(foo());
