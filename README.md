# RecipeScale
<!-- cSpell:words Supabase htmls -->

A simple recipe ingredient calculator that helps users scale ingredient measurements based on their target serving size.

## Overview

RecipeScale is a beginner-friendly web application designed for home cooks, bakers, and students who want to quickly adjust recipe measurements. Users can add ingredients, enter the original serving size, set a target serving size, and instantly see the updated ingredient amounts.

## Features

* Add a recipe name
* Set original serving size
* Set target serving size
* Add multiple ingredients
* Enter ingredient amount and unit
* Automatically calculate adjusted measurements
* View calculated results clearly
* Save recipes using Supabase Auth and PostgreSQL
* Edit or delete saved recipes
* Responsive design for desktop and mobile

## Tech Stack

* HTML
* CSS
* JavaScript
* Supabase

## Formula Used

```txt
new amount = original amount × target serving / original serving
```

Example:

```txt
Original serving: 2
Target serving: 4

Flour: 500g → 1000g
Water: 300ml → 600ml
Salt: 10g → 20g
```

## Project Goal

The goal of RecipeScale is to practice core JavaScript skills while building a useful real-world project. This project focuses on DOM manipulation, form handling, arrays, objects, calculations, event listeners, Supabase Auth, and PostgreSQL-backed recipe storage.

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/YOUR_USERNAME/recipe-scale.git
```

### 2. Open the project folder

```bash
cd recipe-scale
```

### 3. Open the website

Open `index.html` directly in your browser, or use the Live Server extension in VS Code.

## Suggested Project Structure

```txt
recipe-scale/
+-- index.html
+-- htmls/
+-- auth/
+-- css/
+-- js/
+-- README.md
+-- assets/
```

## Supabase Deployment Checklist

Before deploying to Vercel, add the deployed site URL to Supabase Authentication URL Configuration:

```txt
https://YOUR-VERCEL-PROJECT.vercel.app
https://YOUR-VERCEL-PROJECT.vercel.app/
https://YOUR-VERCEL-PROJECT.vercel.app/htmls/reset-password.html
```

Keep the localhost URLs while testing locally:

```txt
http://localhost:8000
http://localhost:8000/
http://localhost:8000/htmls/reset-password.html
```

## Future Improvements

* Add dark and light mode
* Add recipe categories
* Add search for saved recipes
* Add print recipe feature
* Add unit conversion
* Add recipe sharing
* Add export to PDF

## Author

Made by Desiree
