(function () {
  const STORAGE_KEY = "recipeScale.recipes";

  function createId() {
    return "recipe-" + Date.now() + "-" + Math.random().toString(16).slice(2);
  }

  function todayText() {
    return new Date().toISOString().slice(0, 10);
  }

  function normalizeIngredient(ingredient) {
    return {
      name: ingredient && ingredient.name ? String(ingredient.name) : "",
      amount: ingredient && Number.isFinite(Number(ingredient.amount)) ? Number(ingredient.amount) : 0,
      unit: ingredient && ingredient.unit ? String(ingredient.unit) : "grams"
    };
  }

  function normalizeStep(step, index) {
    if (typeof step === "string") {
      return {
        title: "Step " + (index + 1),
        body: step
      };
    }

    return {
      title: step && step.title ? String(step.title) : "Step " + (index + 1),
      body: step && step.body ? String(step.body) : ""
    };
  }

  function normalizeRecipe(recipe) {
    const ingredients = Array.isArray(recipe && recipe.ingredients)
      ? recipe.ingredients.map(normalizeIngredient).filter(function (ingredient) {
          return ingredient.name || ingredient.amount > 0;
        })
      : [];

    const steps = Array.isArray(recipe && recipe.steps)
      ? recipe.steps.map(normalizeStep).filter(function (step) {
          return step.title || step.body;
        })
      : [];

    return {
      id: recipe && recipe.id ? String(recipe.id) : createId(),
      name: recipe && recipe.name ? String(recipe.name) : "Untitled Recipe",
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

  function getRecipes() {
    const rawRecipes = localStorage.getItem(STORAGE_KEY);

    if (!rawRecipes) {
      return [];
    }

    try {
      const parsedRecipes = JSON.parse(rawRecipes);
      return Array.isArray(parsedRecipes) ? parsedRecipes.map(normalizeRecipe) : [];
    } catch (error) {
      return [];
    }
  }

  function writeRecipes(recipes) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(recipes.map(normalizeRecipe)));
  }

  function saveRecipe(recipe) {
    const normalizedRecipe = normalizeRecipe({
      ...recipe,
      updatedAt: todayText()
    });
    const recipes = getRecipes();
    const existingIndex = recipes.findIndex(function (savedRecipe) {
      return savedRecipe.id === normalizedRecipe.id;
    });

    if (existingIndex >= 0) {
      recipes[existingIndex] = normalizedRecipe;
    } else {
      recipes.unshift(normalizedRecipe);
    }

    writeRecipes(recipes);
    return normalizedRecipe;
  }

  function deleteRecipe(recipeId) {
    const recipes = getRecipes().filter(function (recipe) {
      return recipe.id !== recipeId;
    });

    writeRecipes(recipes);
  }

  function findRecipe(recipeId) {
    return getRecipes().find(function (recipe) {
      return recipe.id === recipeId;
    });
  }

  window.RecipeScaleStorage = {
    createId: createId,
    todayText: todayText,
    normalizeRecipe: normalizeRecipe,
    getRecipes: getRecipes,
    saveRecipe: saveRecipe,
    deleteRecipe: deleteRecipe,
    findRecipe: findRecipe
  };
})();
