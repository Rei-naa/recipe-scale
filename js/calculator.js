(function () {
  function formatAmount(value) {
    const rounded = Math.round(Number(value) * 100) / 100;

    if (Number.isInteger(rounded)) {
      return String(rounded);
    }

    return String(rounded).replace(/\.?0+$/, "");
  }

  function scaleIngredients(ingredients, originalServing, targetServing) {
    const multiplier = Number(targetServing) / Number(originalServing);

    return ingredients.map(function (ingredient) {
      const originalAmount = Number(ingredient.amount);
      const scaledAmount = originalAmount * multiplier;

      return {
        name: ingredient.name,
        originalAmount: originalAmount,
        scaledAmount: scaledAmount,
        unit: ingredient.unit
      };
    });
  }

  window.RecipeScaleCalculator = {
    formatAmount: formatAmount,
    scaleIngredients: scaleIngredients
  };
})();
