const SUPABASE_URL = "https://rswjnqyybsohfzrkvfdw.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJzd2pucXl5YnNvaGZ6cmt2ZmR3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI4MTAzODYsImV4cCI6MjA5ODM4NjM4Nn0.dWBiYptVZUso-sR32LTJppIy9uiTZ_XpzGDWKiHuDf0";

let passwordTogglesReady = false;

function initPasswordToggles() {
  if (passwordTogglesReady) return;

  const toggleButtons = Array.from(document.querySelectorAll("[data-password-toggle]"));
  if (!toggleButtons.length) return;

  passwordTogglesReady = true;

  toggleButtons.forEach(function (button) {
    const passwordField = button.closest(".auth-password");
    const input = passwordField ? passwordField.querySelector("input") : null;

    if (!input) return;

    button.setAttribute("aria-pressed", "false");

    button.addEventListener("click", function () {
      const shouldShowPassword = input.type === "password";

      input.type = shouldShowPassword ? "text" : "password";
      button.classList.toggle("is-visible", shouldShowPassword);
      button.setAttribute("aria-label", shouldShowPassword ? "Hide password" : "Show password");
      button.setAttribute("aria-pressed", String(shouldShowPassword));
    });
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initPasswordToggles, { once: true });
} else {
  initPasswordToggles();
}

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function signUpUser(email, password) {
  const { data, error } = await supabaseClient.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: window.location.origin
    }
  });

  if (error) {
    throw error;
  }

  return data;
}

async function loginUser(email, password) {
  const { data, error } = await supabaseClient.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    throw error;
  }

  return data;
}

async function logoutUser() {
  const { error } = await supabaseClient.auth.signOut();

  if (error) {
    throw error;
  }
}

async function getCurrentUser() {
  const { data, error } = await supabaseClient.auth.getUser();

  if (error) {
    return null;
  }

  return data.user;
}

async function sendPasswordResetEmail(email) {
  const { data, error } = await supabaseClient.auth.resetPasswordForEmail(email, {
    redirectTo: window.location.origin + "/htmls/reset-password.html"
  });

  if (error) {
    throw error;
  }

  return data;
}

async function updatePassword(password) {
  const { data, error } = await supabaseClient.auth.updateUser({
    password
  });

  if (error) {
    throw error;
  }

  return data;
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
    // Older recipes may store plain text instructions.
  }

  return text
    .split(/\r?\n+|(?=\bstep\s+\d+\s*[:.)-]\s+)/i)
    .map(stripStepPrefix)
    .filter(Boolean);
}

function recipeInstructions(recipe) {
  const instructions = instructionTextsFromValue(recipe.instructions);

  if (instructions.length) {
    return instructions;
  }

  return instructionTextsFromValue(recipe.steps);
}

function recipeNotes(recipe) {
  if (recipe.notes) {
    return String(recipe.notes);
  }

  return recipe.description || "";
}

function recipeRow(recipe) {
  const row = {};

  if (recipe.user_id) row.user_id = recipe.user_id;
  if (recipe.title || recipe.name) row.title = recipe.title || recipe.name;
  if ("originalServings" in recipe || "originalServing" in recipe) {
    row.original_servings = recipe.originalServings || recipe.originalServing || null;
  }
  if ("targetServings" in recipe || "targetServing" in recipe) {
    row.target_servings = recipe.targetServings || recipe.targetServing || null;
  }
  if ("ingredients" in recipe) row.ingredients = recipe.ingredients || [];
  if ("instructions" in recipe || "steps" in recipe) row.instructions = JSON.stringify(recipeInstructions(recipe));
  if ("notes" in recipe || "description" in recipe) row.notes = recipeNotes(recipe);

  return row;
}

async function saveRecipe(recipe) {
  const user = await getCurrentUser();

  if (!user) {
    throw new Error("You must be logged in to save a recipe.");
  }

  const row = recipeRow({
    ...recipe,
    user_id: user.id
  });

  const { data, error } = await supabaseClient
    .from("recipes")
    .insert(row)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

async function getRecipes() {
  const user = await getCurrentUser();

  if (!user) {
    throw new Error("You must be logged in to view recipes.");
  }

  const { data, error } = await supabaseClient
    .from("recipes")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return data;
}

async function updateRecipe(recipeId, updates) {
  const user = await getCurrentUser();

  if (!user) {
    throw new Error("You must be logged in to update recipes.");
  }

  const { data, error } = await supabaseClient
    .from("recipes")
    .update(recipeRow(updates))
    .eq("id", recipeId)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

async function deleteRecipe(recipeId) {
  const user = await getCurrentUser();

  if (!user) {
    throw new Error("You must be logged in to delete recipes.");
  }

  const { error } = await supabaseClient
    .from("recipes")
    .delete()
    .eq("id", recipeId)
    .eq("user_id", user.id);

  if (error) {
    throw error;
  }
}

function redirectToHome() {
  window.location.href = window.location.origin + "/index.html";
}

function redirectToLogin() {
  window.location.href = window.location.origin + "/htmls/login.html";
}

function toggleElements(elements, shouldShow) {
  elements.forEach(function (element) {
    element.classList.toggle("is-hidden", !shouldShow);
  });
}

async function initAuthNavigation() {
  const user = await getCurrentUser();
  const primaryNavs = Array.from(document.querySelectorAll(".site-nav"));
  const loginLinks = Array.from(document.querySelectorAll(".header-login"));
  const signupLinks = Array.from(document.querySelectorAll(".header-signup"));
  const userBadges = Array.from(document.querySelectorAll(".header-user"));
  const logoutButtons = Array.from(document.querySelectorAll(".header-logout"));
  const authRequiredElements = Array.from(document.querySelectorAll(".auth-required"));

  toggleElements(primaryNavs, !!user);
  toggleElements(loginLinks, !user);
  toggleElements(signupLinks, !user);
  toggleElements(userBadges, !!user);
  toggleElements(logoutButtons, !!user);
  toggleElements(authRequiredElements, !!user);

  userBadges.forEach(function (badge) {
    badge.textContent = user ? user.email || "Signed in" : "";
    badge.title = user ? user.email || "Signed in" : "";
  });

  logoutButtons.forEach(function (button) {
    button.addEventListener("click", async function () {
      button.disabled = true;

      try {
        await logoutUser();
        window.location.href = window.location.origin + "/index.html";
      } catch (error) {
        button.disabled = false;
        console.error("Unable to log out.", error);
      }
    });
  });
}

function initLoginForm() {
  const loginForm = document.getElementById("loginForm");
  const loginMessage = document.getElementById("loginMessage");

  if (!loginForm || !loginMessage) return;

  loginForm.addEventListener("submit", async function (event) {
    event.preventDefault();

    const email = document.getElementById("loginEmail").value.trim();
    const password = document.getElementById("loginPassword").value;

    loginMessage.textContent = "Logging in...";

    try {
      await window.recipeScaleAuth.loginUser(email, password);
      redirectToHome();
    } catch (error) {
      loginMessage.textContent = error.message;
    }
  });
}

function initCreateAccountForm() {
  const createAccountForm = document.getElementById("createAccountForm");
  const signupMessage = document.getElementById("signupMessage");

  if (!createAccountForm || !signupMessage) return;

  createAccountForm.addEventListener("submit", async function (event) {
    event.preventDefault();

    const email = document.getElementById("signupEmail").value.trim();
    const password = document.getElementById("signupPassword").value;

    signupMessage.textContent = "Creating account...";

    try {
      await window.recipeScaleAuth.signUpUser(email, password);
      signupMessage.textContent = "Account created. Redirecting...";
      redirectToHome();
    } catch (error) {
      signupMessage.textContent = error.message;
    }
  });
}

function initForgotPasswordForm() {
  const forgotPasswordForm = document.getElementById("forgotPasswordForm");
  const forgotPasswordMessage = document.getElementById("forgotPasswordMessage");

  if (!forgotPasswordForm || !forgotPasswordMessage) return;

  forgotPasswordForm.addEventListener("submit", async function (event) {
    event.preventDefault();

    const email = document.getElementById("forgotPasswordEmail").value.trim();

    forgotPasswordMessage.textContent = "Sending reset link...";

    try {
      await window.recipeScaleAuth.sendPasswordResetEmail(email);
      forgotPasswordMessage.textContent = "Password reset link sent. Please check your email.";
    } catch (error) {
      forgotPasswordMessage.textContent = error.message;
    }
  });
}

function initResetPasswordForm() {
  const resetPasswordForm = document.getElementById("resetPasswordForm");
  const resetPasswordMessage = document.getElementById("resetPasswordMessage");

  if (!resetPasswordForm || !resetPasswordMessage) return;

  resetPasswordForm.addEventListener("submit", async function (event) {
    event.preventDefault();

    const newPassword = document.getElementById("newPassword").value;
    const confirmPassword = document.getElementById("confirmPassword").value;

    if (newPassword !== confirmPassword) {
      resetPasswordMessage.textContent = "Passwords do not match.";
      return;
    }

    resetPasswordMessage.textContent = "Updating password...";

    try {
      await window.recipeScaleAuth.updatePassword(newPassword);
      resetPasswordMessage.textContent = "Password updated successfully.";

      setTimeout(function () {
        redirectToLogin();
      }, 1200);
    } catch (error) {
      resetPasswordMessage.textContent = error.message;
    }
  });
}

window.recipeScaleAuth = {
  supabaseClient,
  signUpUser,
  loginUser,
  logoutUser,
  getCurrentUser,
  sendPasswordResetEmail,
  updatePassword,
  saveRecipe,
  getRecipes,
  updateRecipe,
  deleteRecipe
};

document.addEventListener("DOMContentLoaded", function () {
  initAuthNavigation();
  initLoginForm();
  initCreateAccountForm();
  initForgotPasswordForm();
  initResetPasswordForm();
});
