(function () {
  const calculator = window.RecipeScaleCalculator;
  const storage = window.RecipeScaleStorage;
  const units = ["grams", "kilograms", "milliliters", "liters", "cups", "tablespoons", "teaspoons", "pieces"];
  let editingRecipeId = null;

  function $(selector, root) {
    return (root || document).querySelector(selector);
  }

  function $$(selector, root) {
    return Array.from((root || document).querySelectorAll(selector));
  }

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function parseAmount(value) {
    return Number(String(value || "").replace(",", "."));
  }

  function unitOptions(selected) {
    return units.map(function (unit) {
      return "<option value=\"" + unit + "\"" + (unit === selected ? " selected" : "") + ">" + unit + "</option>";
    }).join("");
  }

  function renderRows(ingredients) {
    if (!$("#ingredientsList")) return;
    const rows = ingredients.length ? ingredients : [{ name: "", amount: "", unit: "grams" }];
    $("#ingredientsList").innerHTML = rows.map(function (ingredient, index) {
      return [
        "<div class=\"ingredient-row\" data-index=\"" + index + "\">",
        "<input class=\"ingredient-name\" type=\"text\" value=\"" + escapeHtml(ingredient.name || "") + "\" placeholder=\"Ingredient\" aria-label=\"Ingredient name\" />",
        "<input class=\"ingredient-amount number-field\" type=\"text\" inputmode=\"decimal\" value=\"" + escapeHtml(ingredient.amount || "") + "\" placeholder=\"500\" aria-label=\"Ingredient amount\" />",
        "<select class=\"ingredient-unit\" aria-label=\"Ingredient unit\">" + unitOptions(ingredient.unit || "grams") + "</select>",
        "<button class=\"remove-ingredient\" type=\"button\" data-index=\"" + index + "\" aria-label=\"Remove ingredient\">-</button>",
        "</div>"
      ].join("");
    }).join("");
    $("#ingredientCount").textContent = rows.length + (rows.length === 1 ? " Ingredient Added" : " Ingredients Added");
  }

  function readRecipe() {
    if (!$("#recipeName")) return null;
    return {
      id: editingRecipeId || "",
      name: $("#recipeName").value.trim(),
      originalServing: parseAmount($("#originalServing").value),
      targetServing: parseAmount($("#targetServing").value),
      ingredients: $$(".ingredient-row").map(function (row) {
        return {
          name: $(".ingredient-name", row).value.trim(),
          amount: parseAmount($(".ingredient-amount", row).value),
          unit: $(".ingredient-unit", row).value
        };
      })
    };
  }

  function validate(recipe) {
    if (!recipe.name) return "Recipe name is required.";
    if (!Number.isFinite(recipe.originalServing) || recipe.originalServing <= 0) return "Original yield must be greater than 0.";
    if (!Number.isFinite(recipe.targetServing) || recipe.targetServing <= 0) return "Target yield must be greater than 0.";
    for (let index = 0; index < recipe.ingredients.length; index += 1) {
      const ingredient = recipe.ingredients[index];
      if (!ingredient.name) return "Every ingredient needs a name.";
      if (!Number.isFinite(ingredient.amount) || ingredient.amount <= 0) return "Every ingredient amount must be greater than 0.";
    }
    return "";
  }

  function showMessage(message, type) {
    const messageArea = $("#messageArea");
    if (!messageArea) return;
    messageArea.innerHTML = message ? "<p class=\"message " + (type || "") + "\">" + escapeHtml(message) + "</p>" : "";
  }

  function renderResults(recipe) {
    if (!$("#resultsCard")) return;
    const scaledIngredients = calculator.scaleIngredients(recipe.ingredients, recipe.originalServing, recipe.targetServing);
    const multiplier = recipe.targetServing / recipe.originalServing;
    $("#resultsCard").innerHTML = [
      "<div class=\"summary-grid\">",
      "<div class=\"summary-card\"><span>Serving Change</span><strong>" + recipe.originalServing + " to " + recipe.targetServing + "</strong></div>",
      "<div class=\"summary-card\"><span>Multiplier</span><strong>" + calculator.formatAmount(multiplier) + "x</strong></div>",
      "<div class=\"summary-card\"><span>Ingredients</span><strong>" + recipe.ingredients.length + "</strong></div>",
      "</div>",
      "<div class=\"result-row header\"><span>Ingredient</span><span>Original</span><span>Scaled</span></div>",
      scaledIngredients.map(function (ingredient) {
        return [
          "<div class=\"result-row\">",
          "<span>" + escapeHtml(ingredient.name) + "</span>",
          "<span>" + calculator.formatAmount(ingredient.originalAmount) + " " + escapeHtml(ingredient.unit) + "</span>",
          "<strong>" + calculator.formatAmount(ingredient.scaledAmount) + " " + escapeHtml(ingredient.unit) + "</strong>",
          "</div>"
        ].join("");
      }).join("")
    ].join("");
  }

  function renderSavedRecipes() {
    const mount = $("#savedRecipes");
    if (!mount) return;
    const recipes = storage.getRecipes();
    if (!recipes.length) {
      mount.innerHTML = "";
      return;
    }
    mount.innerHTML = recipes.map(function (recipe) {
      return [
        "<article class=\"saved-card\">",
        "<img src=\"" + (recipe.imageDataUrl || "assets/images/sourdough-hero.png") + "\" alt=\"" + escapeHtml(recipe.name) + "\" />",
        "<div>",
        "<h3>" + escapeHtml(recipe.name) + "</h3>",
        "<p>Original Servings: <strong>" + recipe.originalServing + "</strong></p>",
        "<p>Ingredients: <strong>" + recipe.ingredients.length + " items</strong></p>",
        "<p>Updated: <strong>" + escapeHtml(recipe.updatedAt) + "</strong></p>",
        "<div class=\"saved-actions\">",
        "<button type=\"button\" data-action=\"load\" data-id=\"" + recipe.id + "\">View</button>",
        "<button type=\"button\" data-action=\"edit\" data-id=\"" + recipe.id + "\">Edit</button>",
        "<button class=\"delete\" type=\"button\" data-action=\"delete\" data-id=\"" + recipe.id + "\">Delete</button>",
        "</div></div></article>"
      ].join("");
    }).join("");
  }

  function calculateRecipe() {
    const recipe = readRecipe();
    if (!recipe) return null;
    const error = validate(recipe);
    if (error) {
      showMessage(error, "error");
      return null;
    }
    renderResults(recipe);
    showMessage("Calculation successful.", "success");
    return recipe;
  }

  function saveRecipe() {
    const recipe = calculateRecipe();
    if (!recipe) return;
    const saved = storage.saveRecipe(recipe);
    editingRecipeId = saved.id;
    renderSavedRecipes();
    showMessage("Recipe saved.", "success");
  }

  function fillRecipe(recipe) {
    if (!$("#recipeName")) return;
    editingRecipeId = recipe.id;
    $("#recipeName").value = recipe.name;
    $("#originalServing").value = recipe.originalServing;
    $("#targetServing").value = recipe.targetServing;
    renderRows(recipe.ingredients || []);
    location.hash = "#calculator";
  }

  function clearForm() {
    if (!$("#recipeName")) return;
    editingRecipeId = null;
    $("#recipeName").value = "";
    $("#originalServing").value = "4";
    $("#targetServing").value = "8";
    renderRows([{ name: "", amount: "", unit: "grams" }]);
    showMessage("", "");
    if ($("#resultsCard")) {
      $("#resultsCard").innerHTML = "<p class=\"empty-result\">Enter a recipe and calculate to see scaled ingredient amounts here.</p>";
    }
  }

  function initCalculator() {
    if (!$("#ingredientsList")) return;
    renderRows([{ name: "", amount: "", unit: "grams" }]);

    $("#addIngredientBtn").addEventListener("click", function () {
      const ingredients = readRecipe().ingredients;
      ingredients.push({ name: "", amount: "", unit: "grams" });
      renderRows(ingredients);
    });
    $("#calculateBtn").addEventListener("click", function () {
      const recipe = calculateRecipe();
      if (recipe) location.hash = "#results";
    });
    $("#saveRecipeBtn").addEventListener("click", saveRecipe);
    $("#clearFormBtn").addEventListener("click", clearForm);
    $("#ingredientsList").addEventListener("click", function (event) {
      const button = event.target.closest(".remove-ingredient");
      if (!button) return;
      const ingredients = readRecipe().ingredients;
      ingredients.splice(Number(button.dataset.index), 1);
      renderRows(ingredients.length ? ingredients : [{ name: "", amount: "", unit: "grams" }]);
    });
  }

  function initSavedRecipes() {
    const savedRecipes = $("#savedRecipes");
    if (!savedRecipes) return;
    renderSavedRecipes();

    savedRecipes.addEventListener("click", function (event) {
      const button = event.target.closest("button[data-action]");
      if (!button) return;
      const id = button.dataset.id;
      const action = button.dataset.action;
      if (action === "delete") {
        storage.deleteRecipe(id);
        renderSavedRecipes();
        return;
      }
      const recipe = storage.findRecipe(id);
      if (recipe) fillRecipe(recipe);
    });
  }

  function init() {
    initCalculator();
    initSavedRecipes();
  }

  document.addEventListener("DOMContentLoaded", init);
})();
