"use strict";

const result1 = "8" + 2;
console.log("1. Результат:", result1, "| Тип результата:", typeof result1);

const result2 = "8" - 2;
console.log("2. Результат:", result2, "| Тип результата:", typeof result2);

const result3 = Number("8") + 2;
console.log("3. Результат:", result3, "| Тип результата:", typeof result3);

const result4 = "12" > "3";
console.log("4. Результат:", result4, "| Тип результата:", typeof result4);

const result5 = 12 === "12";
console.log("5. Результат:", result5, "| Тип результата:", typeof result5);

const result6 = Number("");
console.log("6. Результат:", result6, "| Тип результата:", typeof result6);

const result7 = Number("text");
console.log("7. Результат:", result7, "| Тип результата:", typeof result7);

const result8 = Boolean("false");
console.log("8. Результат:", result8, "| Тип результата:", typeof result8);

console.log("9. typeof null:", typeof null);
console.log("10. typeof NaN:", typeof NaN);