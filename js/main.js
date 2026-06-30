(function () {
  const calculator = window.RecipeScaleCalculator;
  const units = ["grams", "kilograms", "milliliters", "liters", "cups", "tablespoons", "teaspoons", "pieces"];
  let editingRecipeId = null;
  let currentUser = null;

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

  function stripStepPrefix(value) {
    const text = String(value || "").trim();
    return text.replace(/^step\s*\d+\s*[:.)-]?\s*/i, "").trim() || text;
  }

  function instructionTextsFromValue(value) {
    if (!value) return [];

    if (Array.isArray(value)) {
      return value.flatMap(instructionTextsFromValue);
    }

    if (typeof value === "object") {
      return [value.body || value.text || value.title || ""]
        .map(stripStepPrefix)
        .filter(Boolean);
    }

    const text = String(value).trim();
    if (!text) return [];

    try {
      const parsed = JSON.parse(text);
      if (parsed !== text) {
        return instructionTextsFromValue(parsed);
      }
    } catch (error) {
      // Keep supporting older plain-text instruction values.
    }

    return text
      .split(/\r?\n+|(?=\bstep\s+\d+\s*[:.)-]\s+)/i)
      .map(stripStepPrefix)
      .filter(Boolean);
  }

  function getParams() {
    return new URLSearchParams(window.location.search);
  }

  function isInHtmlFolder() {
    return window.location.pathname.replace(/\\/g, "/").includes("/htmls/");
  }

  function assetPath(path) {
    return (isInHtmlFolder() ? "../" : "") + path;
  }

  function pagePath(page) {
    return isInHtmlFolder() ? page : "htmls/" + page;
  }

  function recipeImage(recipe) {
    return recipe && recipe.imageDataUrl ? recipe.imageDataUrl : assetPath("assets/images/pumpkin_Soup.png");
  }

  function todayText() {
    return new Date().toISOString().slice(0, 10);
  }

  function hasSupabaseAuth() {
    return !!(window.recipeScaleAuth && window.recipeScaleAuth.getCurrentUser);
  }

  async function initCurrentUser() {
    if (!hasSupabaseAuth()) {
      currentUser = null;
      return null;
    }

    currentUser = await window.recipeScaleAuth.getCurrentUser();
    return currentUser;
  }

  function normalizeIngredient(ingredient) {
    return {
      name: ingredient && ingredient.name ? String(ingredient.name) : "",
      amount: ingredient && Number.isFinite(Number(ingredient.amount))
        ? Number(ingredient.amount)
        : Number(ingredient && ingredient.quantity) || 0,
      unit: ingredient && ingredient.unit ? String(ingredient.unit) : "grams"
    };
  }

  function normalizeStep(step, index) {
    if (typeof step === "string") {
      return {
        title: "Step " + (index + 1),
        body: stripStepPrefix(step)
      };
    }

    const title = step && step.title ? String(step.title) : "";
    const body = step && step.body ? String(step.body) : "";

    return {
      title: title || (body ? "Step " + (index + 1) : ""),
      body: body
    };
  }

  function normalizeRecipe(recipe) {
    const ingredients = Array.isArray(recipe && recipe.ingredients)
      ? recipe.ingredients.map(normalizeIngredient).filter(function (ingredient) {
          return ingredient.name || ingredient.amount > 0;
        })
      : [];

    const storedSteps = Array.isArray(recipe && recipe.steps) && recipe.steps.length
      ? recipe.steps
      : instructionTextsFromValue(recipe && recipe.steps);
    const storedInstructions = instructionTextsFromValue(recipe && recipe.instructions);
    const rawSteps = storedSteps.length ? storedSteps : storedInstructions;

    const steps = rawSteps.map(normalizeStep).filter(function (step) {
      return step.title || step.body;
    });

    return {
      id: recipe && recipe.id ? String(recipe.id) : "",
      name: recipe && recipe.name ? String(recipe.name) : "Untitled Recipe",
      description: recipe && recipe.description ? String(recipe.description) : "",
      originalServing: recipe && Number.isFinite(Number(recipe.originalServing)) ? Number(recipe.originalServing) : 1,
      targetServing: recipe && Number.isFinite(Number(recipe.targetServing)) ? Number(recipe.targetServing) : 1,
      ingredients: ingredients,
      imageDataUrl: recipe && recipe.imageDataUrl ? String(recipe.imageDataUrl) : "",
      steps: steps,
      prepTime: recipe && recipe.prepTime ? String(recipe.prepTime) : "",
      cookTime: recipe && recipe.cookTime ? String(recipe.cookTime) : "",
      difficulty: recipe && recipe.difficulty ? String(recipe.difficulty) : "Intermediate",
      updatedAt: recipe && recipe.updatedAt ? String(recipe.updatedAt) : todayText()
    };
  }

  function databaseRecipeToAppRecipe(recipe) {
    const ingredients = Array.isArray(recipe && recipe.ingredients)
      ? recipe.ingredients.map(normalizeIngredient)
      : [];

    return normalizeRecipe({
      id: recipe.id,
      name: recipe.title,
      description: recipe.notes || "",
      originalServing: Number(recipe.original_servings) || 1,
      targetServing: Number(recipe.target_servings) || Number(recipe.original_servings) || 1,
      ingredients: ingredients,
      instructions: recipe.instructions,
      updatedAt: recipe.updated_at ? String(recipe.updated_at).slice(0, 10) : todayText()
    });
  }

  async function getSavedRecipes() {
    if (!currentUser || !window.recipeScaleAuth) {
      return [];
    }

    const recipes = await window.recipeScaleAuth.getRecipes();
    return recipes.map(databaseRecipeToAppRecipe);
  }

  async function findSavedRecipe(recipeId) {
    const recipes = await getSavedRecipes();
    return recipes.find(function (recipe) {
      return recipe.id === recipeId;
    });
  }

  async function persistRecipe(recipe) {
    if (!currentUser || !window.recipeScaleAuth) {
      throw new Error("Log in to save recipes to your account.");
    }

    if (recipe.id) {
      return databaseRecipeToAppRecipe(await window.recipeScaleAuth.updateRecipe(recipe.id, recipe));
    }

    return databaseRecipeToAppRecipe(await window.recipeScaleAuth.saveRecipe(recipe));
  }

  async function removeSavedRecipe(recipeId) {
    if (!currentUser || !window.recipeScaleAuth) {
      throw new Error("Log in to delete recipes from your account.");
    }

    await window.recipeScaleAuth.deleteRecipe(recipeId);
  }

  function installImageFallback(image) {
    if (!image) return;
    image.addEventListener("error", function () {
      const nextFallback = image.dataset.fallback;
      if (nextFallback) {
        image.src = nextFallback;
        image.dataset.fallback = "";
        return;
      }
      image.hidden = true;
      if (!image.nextElementSibling || !image.nextElementSibling.classList.contains("image-placeholder")) {
        const placeholder = document.createElement("div");
        placeholder.className = "image-placeholder";
        placeholder.textContent = "RecipeScale";
        image.insertAdjacentElement("afterend", placeholder);
      }
    });
  }

  function installImageFallbacks(root) {
    $$("img[data-fallback]", root).forEach(installImageFallback);
  }

  function unitOptions(selected) {
    return units.map(function (unit) {
      return "<option value=\"" + unit + "\"" + (unit === selected ? " selected" : "") + ">" + unit + "</option>";
    }).join("");
  }

  function renderIngredientRows(ingredients) {
    const list = $("#ingredientsList");
    if (!list) return;
    const rows = ingredients && ingredients.length ? ingredients : [{ name: "", amount: "", unit: "grams" }];
    list.innerHTML = rows.map(function (ingredient, index) {
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

  function renderStepRows(steps) {
    const list = $("#stepsList");
    if (!list) return;
    const rows = steps && steps.length ? steps : [{ title: "", body: "" }];
    list.innerHTML = rows.map(function (step, index) {
      return [
        "<div class=\"step-editor-row\" data-index=\"" + index + "\">",
        "<textarea class=\"step-body\" rows=\"3\" placeholder=\"Describe this instruction\" aria-label=\"Step instruction\">" + escapeHtml(step.body || "") + "</textarea>",
        "<button class=\"remove-step\" type=\"button\" data-index=\"" + index + "\" aria-label=\"Remove step\">-</button>",
        "</div>"
      ].join("");
    }).join("");
    $("#stepCount").textContent = rows.length + (rows.length === 1 ? " Step Added" : " Steps Added");
  }

  function readStepRows() {
    return $$(".step-editor-row").map(function (row) {
      return {
        title: "",
        body: $(".step-body", row).value.trim()
      };
    });
  }

  function readRecipe() {
    if (!$("#recipeName")) return null;
    const steps = readStepRows().filter(function (step) {
      return step.title || step.body;
    });

    return {
      id: editingRecipeId || "",
      name: $("#recipeName").value.trim(),
      description: $("#recipeDescription") ? $("#recipeDescription").value.trim() : "",
      originalServing: parseAmount($("#originalServing").value),
      targetServing: parseAmount($("#targetServing").value),
      prepTime: $("#prepTime") ? $("#prepTime").value.trim() : "",
      cookTime: $("#cookTime") ? $("#cookTime").value.trim() : "",
      difficulty: $("#difficulty") ? $("#difficulty").value : "Intermediate",
      ingredients: $$(".ingredient-row").map(function (row) {
        return {
          name: $(".ingredient-name", row).value.trim(),
          amount: parseAmount($(".ingredient-amount", row).value),
          unit: $(".ingredient-unit", row).value
        };
      }),
      steps: steps,
      instructions: steps.map(function (step) {
        return step.body || step.title;
      }).filter(Boolean)
    };
  }

  function instructionBodyText(step, index) {
    if (typeof step === "string") {
      return stripStepPrefix(step);
    }

    const body = step && step.body ? String(step.body).trim() : "";
    const title = step && step.title ? String(step.title).trim() : "";
    const defaultTitle = "Step " + (index + 1);

    return body || (title && title !== defaultTitle ? title : "");
  }

  function renderInstructionSteps(steps) {
    if (!steps.length) {
      return "<p class=\"muted-note\">No instructions added yet.</p>";
    }

    return steps.map(function (step, index) {
      return [
        "<div class=\"instruction-step\">",
        "<h3>Step " + (index + 1) + "</h3>",
        "<p>" + escapeHtml(instructionBodyText(step, index) || "No instruction text added.") + "</p>",
        "</div>"
      ].join("");
    }).join("");
  }

  function normalizedPrintStepText(step, index) {
    const body = instructionBodyText(step, index);
    return body || "No instruction text added.";
  }

  function validateRecipe(recipe) {
    if (!recipe.name) return "Recipe name is required.";
    if (!Number.isFinite(recipe.originalServing) || recipe.originalServing <= 0) return "Original yield must be greater than 0.";
    if (!Number.isFinite(recipe.targetServing) || recipe.targetServing <= 0) return "Target yield must be greater than 0.";
    if (!recipe.ingredients.length) return "Add at least one ingredient.";
    for (let index = 0; index < recipe.ingredients.length; index += 1) {
      const ingredient = recipe.ingredients[index];
      if (!ingredient.name) return "Every ingredient needs a name.";
      if (!Number.isFinite(ingredient.amount) || ingredient.amount <= 0) return "Every ingredient amount must be greater than 0.";
    }
    return "";
  }

  function showMessage(message, type) {
    const area = $("#messageArea");
    if (!area) return;
    area.innerHTML = message ? "<p class=\"message " + (type || "") + "\">" + escapeHtml(message) + "</p>" : "";
  }

  function renderResults(recipe) {
    const card = $("#resultsCard");
    if (!card) return;
    const scaledIngredients = calculator.scaleIngredients(recipe.ingredients, recipe.originalServing, recipe.targetServing);
    const multiplier = recipe.targetServing / recipe.originalServing;
    card.innerHTML = [
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

  function calculateRecipe() {
    const recipe = readRecipe();
    if (!recipe) return null;
    const error = validateRecipe(recipe);
    if (error) {
      showMessage(error, "error");
      return null;
    }
    renderResults(recipe);
    showMessage("Calculation successful.", "success");
    return recipe;
  }

  async function saveRecipe(button) {
    const recipe = calculateRecipe();
    if (!recipe) return;
    if (button) button.disabled = true;
    showMessage("Saving recipe...", "");
    try {
      const saved = await persistRecipe(recipe);
      editingRecipeId = saved.id;
      showMessage("Recipe saved to your account.", "success");
    } catch (error) {
      showMessage(error.message || "Unable to save recipe.", "error");
    } finally {
      if (button) button.disabled = false;
    }
  }

  function fillRecipe(recipe) {
    if (!$("#recipeName")) return;
    editingRecipeId = recipe.id;
    $("#recipeName").value = recipe.name || "";
    if ($("#recipeDescription")) $("#recipeDescription").value = recipe.description || "";
    $("#originalServing").value = recipe.originalServing || 1;
    $("#targetServing").value = recipe.targetServing || recipe.originalServing || 1;
    if ($("#prepTime")) $("#prepTime").value = recipe.prepTime || "";
    if ($("#cookTime")) $("#cookTime").value = recipe.cookTime || "";
    if ($("#difficulty")) $("#difficulty").value = recipe.difficulty || "Intermediate";
    renderIngredientRows(recipe.ingredients || []);
    renderStepRows(recipe.steps || []);
  }

  function clearForm() {
    if (!$("#recipeName")) return;
    editingRecipeId = null;
    $("#recipeName").value = "";
    if ($("#recipeDescription")) $("#recipeDescription").value = "";
    $("#originalServing").value = "4";
    $("#targetServing").value = "8";
    if ($("#prepTime")) $("#prepTime").value = "";
    if ($("#cookTime")) $("#cookTime").value = "";
    if ($("#difficulty")) $("#difficulty").value = "Intermediate";
    renderIngredientRows([{ name: "", amount: "", unit: "grams" }]);
    renderStepRows([{ title: "", body: "" }]);
    showMessage("", "");
    if ($("#resultsCard")) {
      $("#resultsCard").innerHTML = "<p class=\"empty-result\">Enter a recipe and calculate to see scaled ingredient amounts here.</p>";
    }
  }

  async function loadRecipeFromUrl() {
    const params = getParams();
    const id = params.get("recipeId");
    if (!id) return;
    showMessage("Loading saved recipe...", "");
    let recipe = null;
    try {
      recipe = await findSavedRecipe(id);
    } catch (error) {
      showMessage(error.message || "Unable to load saved recipe.", "error");
      return;
    }
    if (!recipe) {
      showMessage("Saved recipe could not be found.", "error");
      return;
    }
    fillRecipe(recipe);
    if (params.get("mode") === "calculate") {
      showMessage("Recipe loaded. Adjust the target yield and calculate. It will only save changes if you click Save Recipe.", "success");
    } else {
      showMessage("Recipe loaded for editing.", "success");
    }
    location.hash = "#calculator";
  }

  async function initCalculator() {
    if (!$("#ingredientsList")) return;
    renderIngredientRows([{ name: "", amount: "", unit: "grams" }]);
    renderStepRows([{ title: "", body: "" }]);
    await loadRecipeFromUrl();

    $("#addIngredientBtn").addEventListener("click", function () {
      const ingredients = readRecipe().ingredients;
      ingredients.push({ name: "", amount: "", unit: "grams" });
      renderIngredientRows(ingredients);
    });

    $("#ingredientsList").addEventListener("click", function (event) {
      const button = event.target.closest(".remove-ingredient");
      if (!button) return;
      const ingredients = readRecipe().ingredients;
      ingredients.splice(Number(button.dataset.index), 1);
      renderIngredientRows(ingredients.length ? ingredients : [{ name: "", amount: "", unit: "grams" }]);
    });

    if ($("#addStepBtn")) {
      $("#addStepBtn").addEventListener("click", function () {
        const steps = readStepRows();
        steps.push({ title: "", body: "" });
        renderStepRows(steps);
      });
    }

    if ($("#stepsList")) {
      $("#stepsList").addEventListener("click", function (event) {
        const button = event.target.closest(".remove-step");
        if (!button) return;
        const steps = readStepRows();
        steps.splice(Number(button.dataset.index), 1);
        renderStepRows(steps.length ? steps : [{ title: "", body: "" }]);
      });
    }

    $("#calculateBtn").addEventListener("click", function () {
      const recipe = calculateRecipe();
      if (recipe) location.hash = "#results";
    });
    $("#saveRecipeBtn").addEventListener("click", function (event) {
      saveRecipe(event.currentTarget);
    });
    $("#clearFormBtn").addEventListener("click", clearForm);
  }

  async function renderSavedRecipes() {
    const mount = $("#savedRecipes");
    if (!mount) return;
    if (!currentUser) {
      mount.innerHTML = [
        "<article class=\"empty-state\">",
        "<h3>Log in to view saved recipes.</h3>",
        "<p>Your recipes are saved to your RecipeScale account.</p>",
        "<div class=\"button-row\">",
        "<a class=\"btn btn-primary\" href=\"" + pagePath("login.html") + "\">Log in</a>",
        "<a class=\"btn btn-outline\" href=\"" + pagePath("create-account.html") + "\">Create Account</a>",
        "</div>",
        "</article>"
      ].join("");
      return;
    }

    mount.innerHTML = "<article class=\"empty-state\"><h3>Loading recipes...</h3></article>";
    let recipes = [];
    try {
      recipes = await getSavedRecipes();
    } catch (error) {
      mount.innerHTML = [
        "<article class=\"empty-state\">",
        "<h3>Unable to load recipes.</h3>",
        "<p>" + escapeHtml(error.message || "Please try again.") + "</p>",
        "</article>"
      ].join("");
      return;
    }
    if (!recipes.length) {
      mount.innerHTML = [
        "<article class=\"empty-state\">",
        "<h3>No saved recipes yet.</h3>",
        "<p>Create and save a recipe from the calculator to start your kitchen collection.</p>",
        "<a class=\"btn btn-primary\" href=\"" + pagePath("calculator.html") + "\">Open Calculator</a>",
        "</article>"
      ].join("");
      return;
    }
    mount.innerHTML = recipes.map(function (recipe) {
      return [
        "<article class=\"saved-card\">",
        "<img src=\"" + escapeHtml(recipeImage(recipe)) + "\" data-fallback=\"" + assetPath("assets/images/chocoCake.png") + "\" alt=\"" + escapeHtml(recipe.name) + "\" />",
        "<div class=\"saved-card-body\">",
        "<h3>" + escapeHtml(recipe.name) + "</h3>",
        "<p>Original Servings: <strong>" + recipe.originalServing + "</strong></p>",
        "<p>Ingredients: <strong>" + recipe.ingredients.length + " items</strong></p>",
        "<p>Updated: <strong>" + escapeHtml(recipe.updatedAt) + "</strong></p>",
        "<div class=\"saved-actions\">",
        "<button type=\"button\" data-action=\"view\" data-id=\"" + escapeHtml(recipe.id) + "\">View</button>",
        "<button type=\"button\" data-action=\"edit\" data-id=\"" + escapeHtml(recipe.id) + "\">Edit</button>",
        "<button type=\"button\" data-action=\"calculate\" data-id=\"" + escapeHtml(recipe.id) + "\">Calculate</button>",
        "<button class=\"delete\" type=\"button\" data-action=\"delete\" data-id=\"" + escapeHtml(recipe.id) + "\">Delete</button>",
        "</div></div></article>"
      ].join("");
    }).join("");
    installImageFallbacks(mount);
  }

  async function initSavedRecipes() {
    const savedRecipes = $("#savedRecipes");
    if (!savedRecipes) return;
    await renderSavedRecipes();
    savedRecipes.addEventListener("click", async function (event) {
      const button = event.target.closest("button[data-action]");
      if (!button) return;
      const id = button.dataset.id;
      const action = button.dataset.action;
      if (action === "delete") {
        const originalText = button.textContent;
        button.disabled = true;
        button.textContent = "Deleting...";
        try {
          await removeSavedRecipe(id);
          await renderSavedRecipes();
        } catch (error) {
          button.disabled = false;
          button.textContent = originalText;
          savedRecipes.insertAdjacentHTML("afterbegin", "<article class=\"empty-state\"><h3>Unable to delete recipe.</h3><p>" + escapeHtml(error.message || "Please try again.") + "</p></article>");
        }
        return;
      }
      if (action === "view") {
        window.location.href = pagePath("recipe-view.html") + "?id=" + encodeURIComponent(id);
        return;
      }
      if (action === "edit") {
        window.location.href = pagePath("calculator.html") + "?recipeId=" + encodeURIComponent(id) + "&mode=edit";
        return;
      }
      if (action === "calculate") {
        window.location.href = pagePath("calculator.html") + "?recipeId=" + encodeURIComponent(id) + "&mode=calculate";
      }
    });
  }

  function metaItem(label, value, path) {
    return [
      "<div class=\"recipe-meta-item\">",
      "<svg viewBox=\"0 0 24 24\" aria-hidden=\"true\"><path d=\"" + path + "\"/></svg>",
      "<span>" + label + "</span>",
      "<strong>" + escapeHtml(value || "Not set") + "</strong>",
      "</div>"
    ].join("");
  }

  function printDetailItem(label, value) {
    return [
      "<div>",
      "<dt>" + escapeHtml(label) + "</dt>",
      "<dd>" + escapeHtml(value || "Not set") + "</dd>",
      "</div>"
    ].join("");
  }

  function printIngredientText(ingredient) {
    const amount = Number.isFinite(Number(ingredient.amount)) && Number(ingredient.amount) > 0
      ? calculator.formatAmount(ingredient.amount)
      : "";
    const unit = ingredient.unit ? String(ingredient.unit) : "";
    const name = ingredient.name ? String(ingredient.name) : "Unnamed ingredient";

    return [amount, unit, name].filter(Boolean).join(" ");
  }

  function printStepText(step, index) {
    return normalizedPrintStepText(step, index);
  }

  function renderPrintRecipe(recipe, ingredients, steps) {
    const printIngredients = ingredients.length
      ? ingredients.map(function (ingredient) {
        return "<li>" + escapeHtml(printIngredientText(ingredient)) + "</li>";
      }).join("")
      : "<li>No ingredients added yet.</li>";

    const printSteps = steps.length
      ? steps.map(function (step, index) {
        return "<li>" + escapeHtml(printStepText(step, index)) + "</li>";
      }).join("")
      : "<li>No instructions added yet.</li>";

    return [
      "<section class=\"print-recipe\" aria-label=\"Print-friendly recipe\">",
      "<p class=\"print-brand\">RecipeScale</p>",
      "<h1>" + escapeHtml(recipe.name || "Untitled Recipe") + "</h1>",
      recipe.description ? "<section><h2>Description</h2><p>" + escapeHtml(recipe.description) + "</p></section>" : "",
      "<section><h2>Recipe Details</h2>",
      "<dl class=\"print-details\">",
      printDetailItem("Prep Time", recipe.prepTime),
      printDetailItem("Cook Time", recipe.cookTime),
      printDetailItem("Difficulty", recipe.difficulty),
      "</dl></section>",
      "<section><h2>Ingredients</h2><ul class=\"print-list\">" + printIngredients + "</ul></section>",
      "<section><h2>Instructions</h2><ol class=\"print-list\">" + printSteps + "</ol></section>",
      "</section>"
    ].join("");
  }

  async function renderRecipeView() {
    const mount = $("#recipeView");
    if (!mount) return;
    const id = getParams().get("id");
    if (!currentUser) {
      mount.innerHTML = [
        "<section class=\"empty-state detail-empty\">",
        "<h1>Log in to view recipes</h1>",
        "<p>Your saved recipes are attached to your account.</p>",
        "<div class=\"button-row\">",
        "<a class=\"btn btn-primary\" href=\"" + pagePath("login.html") + "\">Log in</a>",
        "<a class=\"btn btn-outline\" href=\"" + pagePath("create-account.html") + "\">Create Account</a>",
        "</div>",
        "</section>"
      ].join("");
      return;
    }

    mount.innerHTML = "<section class=\"empty-state detail-empty\"><h1>Loading recipe...</h1></section>";
    let recipe = null;
    let loadError = "";
    try {
      recipe = id ? await findSavedRecipe(id) : null;
    } catch (error) {
      recipe = null;
      loadError = error.message || "Please try again.";
    }
    if (!recipe) {
      mount.innerHTML = [
        "<section class=\"empty-state detail-empty\">",
        "<h1>" + (loadError ? "Unable to load recipe" : "Recipe not found") + "</h1>",
        "<p>" + escapeHtml(loadError || "This saved recipe may have been deleted or belongs to a different account.") + "</p>",
        "<a class=\"btn btn-primary\" href=\"" + pagePath("saved-recipes.html") + "\">Back to Saved Recipes</a>",
        "</section>"
      ].join("");
      return;
    }

    const ingredients = recipe.ingredients || [];
    const steps = recipe.steps || [];
    mount.innerHTML = [
      "<section class=\"recipe-hero-detail\">",
      "<div class=\"recipe-hero-image\"><img src=\"" + escapeHtml(recipeImage(recipe)) + "\" data-fallback=\"" + assetPath("assets/images/cooking.png") + "\" alt=\"" + escapeHtml(recipe.name) + "\" /></div>",
      "<div class=\"recipe-hero-copy\">",
      "<h1>" + escapeHtml(recipe.name) + "</h1>",
      "<p>" + escapeHtml(recipe.description || "A saved RecipeScale favorite ready for yield adjustments and kitchen prep.") + "</p>",
      "<div class=\"recipe-meta-grid\">",
      metaItem("Prep Time", recipe.prepTime, "M12 6v6l4 2M12 22a9 9 0 1 0 0-18 9 9 0 0 0 0 18z"),
      metaItem("Cook Time", recipe.cookTime, "M12 6v6l4 2M12 22a9 9 0 1 0 0-18 9 9 0 0 0 0 18z"),
      metaItem("Difficulty", recipe.difficulty, "M4 20V10M9 20V4M14 20v-8M19 20v-5"),
      "</div>",
      "<div class=\"recipe-actions\">",
      "<button class=\"btn btn-primary\" type=\"button\" id=\"printRecipeBtn\"><svg viewBox=\"0 0 24 24\" aria-hidden=\"true\"><path d=\"M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2M6 14h12v8H6z\"/></svg>Print-Friendly Recipe</button>",
      "<a class=\"btn btn-outline\" href=\"" + pagePath("calculator.html") + "?recipeId=" + encodeURIComponent(recipe.id) + "&mode=edit\"><svg viewBox=\"0 0 24 24\" aria-hidden=\"true\"><path d=\"M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z\"/></svg>Edit Recipe</a>",
      "</div></div></section>",
      "<section class=\"recipe-detail-grid\">",
      "<article class=\"detail-card ingredients-detail-card\">",
      "<h2><svg viewBox=\"0 0 24 24\" aria-hidden=\"true\"><path d=\"M7 6h13M7 12h13M7 18h13M4 6h.01M4 12h.01M4 18h.01\"/></svg> Ingredients</h2>",
      ingredients.length ? ingredients.map(function (ingredient) {
        return [
          "<label class=\"check-row ingredient-check\">",
          "<input type=\"checkbox\" />",
          "<span>" + escapeHtml(ingredient.name) + "</span>",
          "<strong>" + calculator.formatAmount(ingredient.amount) + escapeHtml(ingredient.unit ? " " + ingredient.unit : "") + "</strong>",
          "</label>"
        ].join("");
      }).join("") : "<p class=\"muted-note\">No ingredients added yet.</p>",
      "</article>",
      "<article class=\"detail-card instructions-detail-card\">",
      "<h2><svg viewBox=\"0 0 24 24\" aria-hidden=\"true\"><path d=\"M4 4l16 16M20 4L4 20\"/></svg> Instructions</h2>",
      renderInstructionSteps(steps),
      "</article>",
      "</section>",
      renderPrintRecipe(recipe, ingredients, steps)
    ].join("");
    installImageFallbacks(mount);
    const printButton = $("#printRecipeBtn");
    if (printButton) {
      printButton.addEventListener("click", function () {
        window.print();
      });
    }
  }

  async function init() {
    await initCurrentUser();
    await initCalculator();
    await initSavedRecipes();
    await renderRecipeView();
  }

  document.addEventListener("DOMContentLoaded", function () {
    init();
  });
})();
