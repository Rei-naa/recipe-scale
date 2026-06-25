const addIngredientBtn = document.getElementById("addIngredientBtn");
const ingredientsList = document.getElementById("ingredientsList");
const calculateBtn = document.getElementById("calculateBtn");
const results = document.getElementById("results");

function createIngredientInput() {
  const ingredientDiv = document.createElement("div");

  ingredientDiv.innerHTML = `
    <input type="text" class="ingredient-name" placeholder="Ingredient name" />
    <input type="number" class="ingredient-amount" placeholder="Amount" />
    <select class="ingredient-unit">
      <option value="g">grams</option>
      <option value="ml">ml</option>
      <option value="cup">cup</option>
      <option value="tbsp">tbsp</option>
      <option value="tsp">tsp</option>
      <option value="pcs">pieces</option>
    </select>
  `;

  ingredientsList.appendChild(ingredientDiv);
}

addIngredientBtn.addEventListener("click", createIngredientInput);

calculateBtn.addEventListener("click", () => {
  const originalServing = Number(document.getElementById("originalServing").value);
  const targetServing = Number(document.getElementById("targetServing").value);

  const names = document.querySelectorAll(".ingredient-name");
  const amounts = document.querySelectorAll(".ingredient-amount");
  const units = document.querySelectorAll(".ingredient-unit");

  results.innerHTML = "";

  if (!originalServing || !targetServing) {
    results.innerHTML = "<p>Please enter original and target serving.</p>";
    return;
  }

  names.forEach((nameInput, index) => {
    const name = nameInput.value;
    const amount = Number(amounts[index].value);
    const unit = units[index].value;

    if (name && amount) {
      const newAmount = amount * targetServing / originalServing;

      results.innerHTML += `
        <p>${name}: ${newAmount.toFixed(2)} ${unit}</p>
      `;
    }
  });
});

createIngredientInput();