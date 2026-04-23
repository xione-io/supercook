// Cache
const recipeCache = JSON.parse(localStorage.getItem('recipeCache')) || {};

function displayRecipeData(data) {
  document.getElementById('recipe-detail-name').textContent = data.title;

  const imgDiv = document.getElementById('recipe-detail-img');
  imgDiv.innerHTML = `<img src="${data.image}" style="width:100%; border-radius:10px;">`;

  const ingredientsList = document.getElementById('recipe-ingredients-list');
  ingredientsList.innerHTML = data.extendedIngredients.map(ing => {
    const name = ing.name.toLowerCase();

    // 🔥 FIXED MATCHING
    const isSelected = [...selected].some(sel => name.includes(sel.toLowerCase()));

    const status = isSelected ? '✓' : '✗';
    const classname = isSelected ? 'available' : 'missing';

    return `<li><span class="${classname}">${status} ${ing.original}</span></li>`;
  }).join('');

  const instructionsList = document.getElementById('recipe-instructions-list');

  if (data.analyzedInstructions && data.analyzedInstructions.length > 0) {
    const steps = data.analyzedInstructions[0].steps;
    instructionsList.innerHTML = steps.map(step => `<li>${step.step}</li>`).join('');
  } else {
    instructionsList.innerHTML = '<li>No instructions available.</li>';
  }

  document.getElementById('recipe-detail-time').textContent = `⏱ ${data.readyInMinutes} mins`;
  document.getElementById('recipe-detail-servings').textContent = `👥 ${data.servings} servings`;
}

// ── Data ────────────────────────────────────────────────────────────────────

const CATEGORIES = [
  { name: 'Vegetables', emoji: '&#129380;', items: ['Garlic','Onion','Tomato','Carrot','Bell pepper','Broccoli','Spinach','Zucchini','Potato','Cucumber','Celery','Mushroom','Corn','Eggplant','Kale','Kangkong  '] },
  { name: 'Fruits', emoji: '&#127815;', items: ['Lemon','Lime','Orange','Apple','Banana','Avocado','Strawberry','Blueberry','Cherry tomato','Mango','Pineapple'] },
  { name: 'Meat & Poultry', emoji: '&#129385;', items: ['Chicken breast','Ground beef','Bacon','Pork','Pork chops','Sausage','Turkey','Steak','Chicken thighs','Ham','Lamb'] },
  { name: 'Seafood', emoji: '&#127957;', items: ['Salmon','Shrimp','Tuna','Cod','Tilapia','Crab','Scallops','Sardines'] },
  { name: 'Dairy & Eggs', emoji: '&#129371;', items: ['Egg','Milk','Butter','Cheddar cheese','Mozzarella','Parmesan','Heavy cream','Yogurt','Sour cream','Cream cheese'] },
  { name: 'Grains & Pasta', emoji: '&#127859;', items: ['Pasta','Rice','Bread','Flour','Oats','Quinoa','Tortilla','Breadcrumbs','Panko','Cornmeal'] },
  { name: 'Canned & Pantry', emoji: '&#129492;', items: ['Canned tomatoes','Chicken broth','Olive oil','Vegetable oil','Soy sauce','Vinegar','Coconut milk','Canned beans','Pasta sauce','Canned corn'] },
  { name: 'Spices & Herbs', emoji: '&#127807;', items: ['Cumin','Paprika','Oregano','Basil','Thyme','Rosemary','Cinnamon','Chili powder','Turmeric','Ginger','Cayenne','Bay leaf'] },
  { name: 'Condiments', emoji: '&#129367;', items: ['Ketchup','Mustard','Mayonnaise','Hot sauce','Worcestershire sauce','Fish sauce','Sesame oil','Honey','Maple syrup','Sriracha'] },
];

// ── State ────────────────────────────────────────────────────────────────────

const selected = new Set();
let currentFilter = 'all';
const openCategories = new Set(); // Track which categories are open

// ── Helpers ───────────────────────────────────────────────────────────────────

function safeId(str) {
  return str.replace(/\s/g, '-').replace(/[^a-zA-Z0-9-]/g, '_');
}

// ── Build sidebar categories ──────────────────────────────────────────────────

function buildCategories() {
  const container = document.getElementById('cats-container');
  container.innerHTML = '';

  CATEGORIES.forEach((cat, ci) => {
    const sec = document.createElement('div');
    sec.className = 'cat-section';

    const items = cat.items.map(item => {
      const id = safeId(item);
      const checked = selected.has(item) ? 'checked' : '';
      return `
        <div class="ing-item" onclick="toggleIng('${item.replace(/'/g, "\\'")}')">
          <div class="ing-check ${checked}" id="chk-${id}"></div>
          <span>${item}</span>
        </div>
      `;
    }).join('');

    const isOpen = openCategories.has(ci) ? 'open' : '';
    const arrowOpen = openCategories.has(ci) ? 'open' : '';

    sec.innerHTML = `
      <div class="cat-header" onclick="toggleCat(${ci})">
        <span>${cat.name}</span>
        <span class="cat-arrow ${arrowOpen}" id="arrow-${ci}">&#9654;</span>
      </div>
      <div class="ing-list ${isOpen}" id="ing-list-${ci}">${items}</div>
    `;

    container.appendChild(sec);
  });
}

function toggleCat(ci) {
  const list = document.getElementById('ing-list-' + ci);
  const arrow = document.getElementById('arrow-' + ci);
  const nowOpen = list.classList.toggle('open');
  arrow.classList.toggle('open', nowOpen);
  
  // Update tracking
  if (nowOpen) {
    openCategories.add(ci);
  } else {
    openCategories.delete(ci);
  }
}

// ── Toggle ingredient ─────────────────────────────────────────────────────────

function toggleIng(item) {
  if (selected.has(item)) selected.delete(item);
  else selected.add(item);
  updateUI();
}

function removeIng(item) {
  selected.delete(item);
  updateUI();
}

// ── Update full UI ────────────────────────────────────────────────────────────

async function updateUI() {
  buildCategories();
  renderChips();
  await renderRecipes();
}

// ── Chips bar ─────────────────────────────────────────────────────────────────

function renderChips() {
  const bar = document.getElementById('chips-bar');
  bar.innerHTML = '';

  if (selected.size === 0) {
    bar.innerHTML = '<span class="chips-label">Add ingredients from the left panel</span>';
    return;
  }

  selected.forEach(item => {
    const chip = document.createElement('div');
    chip.className = 'chip';
    chip.innerHTML = `
      ${item}
      <span class="chip-x" onclick="removeIng('${item.replace(/'/g, "\\'")}')">&#x2715;</span>
    `;
    bar.appendChild(chip);
  });
}

  // Score each recipe
  async function renderRecipes() {
  const grid = document.getElementById('recipe-grid');
  const empty = document.getElementById('empty-state');
  const top = document.getElementById('recipes-top');
  const countEl = document.getElementById('recipes-count');

  if (selected.size === 0) {
    grid.innerHTML = '';
    empty.style.display = 'flex';
    top.style.display = 'none';
    return;
  }

  empty.style.display = 'none';
  top.style.display = 'flex';

  grid.innerHTML = '<p>Loading recipes...</p>';

  try {
    const apiRecipes = await fetchRecipesFromAPI();

    if (!apiRecipes.length) {
      grid.innerHTML = '<p>No recipes found.</p>';
      return;
    }

    countEl.innerHTML = `<span>${apiRecipes.length}</span> recipes found`;

    grid.innerHTML = apiRecipes.map(r => {
      const used = r.usedIngredientCount;
      const missed = r.missedIngredientCount;
      const total = used + missed;
      const pct = Math.round((used / total) * 100);

      const missText = missed === 0
        ? 'Ready to make!'
        : `Missing ${missed} ingredient${missed > 1 ? 's' : ''}`;

      return `
        <div class="recipe-card" onclick="openRecipeModalById(${r.id})">
          <div class="recipe-img">
            <img src="${r.image}" style="width:100%; height:100%; object-fit:cover;">
          </div>
          <div class="recipe-body">
            <div class="recipe-name">${r.title}</div>
            <div class="recipe-meta">
              <span class="recipe-match">${pct}% match</span>
              <span class="recipe-miss">${missText}</span>
            </div>
          </div>
        </div>
      `;
    }).join('');

  } catch (err) {
    console.error(err);
    grid.innerHTML = '<p>Error loading recipes.</p>';
  }
}

// ── Filter tabs ───────────────────────────────────────────────────────────────

function setFilter(f, btn) {
  currentFilter = f;
  document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
  btn.classList.add('active');
  renderRecipes();
}

// ── Ingredient search ─────────────────────────────────────────────────────────

function filterIngredients(query) {
  const q = query.toLowerCase().trim();

  document.querySelectorAll('.ing-item').forEach(el => {
    const name = el.querySelector('span').textContent.toLowerCase();
    el.style.display = name.includes(q) ? '' : 'none';
  });

  // Auto-open/close categories based on visible children
  CATEGORIES.forEach((_, ci) => {
    const list = document.getElementById('ing-list-' + ci);
    const arrow = document.getElementById('arrow-' + ci);
    if (!list) return;
    const hasVisible = [...list.querySelectorAll('.ing-item')].some(i => i.style.display !== 'none');
    if (q) {
      list.classList.toggle('open', hasVisible);
      arrow.classList.toggle('open', hasVisible);
    }
  });
}

// ── Init ──────────────────────────────────────────────────────────────────────

buildCategories();
renderChips();

// ── Recipe Modal Functions ────────────────────────────────────────────────────

async function openRecipeModalById(recipeId) {
  const modal = document.getElementById('recipe-modal');
  modal.classList.add('open');

  document.getElementById('recipe-detail-name').textContent = 'Loading...';
  document.getElementById('recipe-detail-img').innerHTML = '🍳';

  try {
    const API_KEY = "e67684266cf345cdbe9c8a4b5328b4e4";

    // Cache check
    if (recipeCache[recipeId]) {
      displayRecipeData(recipeCache[recipeId]);
      return;
    }

    const res = await fetch(
      `https://api.spoonacular.com/recipes/${recipeId}/information?apiKey=${API_KEY}`
    );

    const data = await res.json();

    // Save cache
    recipeCache[recipeId] = data;
    localStorage.setItem('recipeCache', JSON.stringify(recipeCache));

    displayRecipeData(data);

  } catch (err) {
    console.error(err);
  }
}

function closeRecipeModal() {
  const modal = document.getElementById('recipe-modal');
  modal.classList.remove('open');
}

function getRecipeInstructions(recipeName) {
  const instructions = {
    'Garlic butter pasta': [
      'Boil water in a large pot and add salt.',
      'Cook pasta according to package directions until al dente.',
      'In a pan, melt butter and sauté minced garlic for 1-2 minutes.',
      'Drain pasta, reserving 1 cup of pasta water.',
      'Toss pasta with garlic butter and add pasta water as needed for a silky sauce.',
      'Top with grated Parmesan and serve immediately.'
    ],
    'Chicken stir-fry': [
      'Cut chicken breast into bite-sized pieces.',
      'Chop bell peppers and onions into uniform pieces.',
      'Heat oil in a wok or large skillet over high heat.',
      'Stir-fry chicken until cooked through, about 5-7 minutes.',
      'Add vegetables and stir-fry for 3-4 minutes.',
      'Add soy sauce and garlic, cook for 1 minute more.',
      'Serve hot over rice.'
    ],
    'Tomato soup': [
      'Sauté diced onion in olive oil until translucent.',
      'Add minced garlic and cook for 1 minute.',
      'Pour in canned tomatoes and chicken broth.',
      'Simmer for 15 minutes.',
      'Blend soup until smooth using an immersion blender.',
      'Stir in heavy cream and season to taste.',
      'Serve hot with crusty bread.'
    ],
    'Avocado toast': [
      'Toast bread slices until golden brown.',
      'Cut avocado in half, remove pit, and scoop flesh into a bowl.',
      'Mash avocado with a fork, season with salt and pepper.',
      'Spread mashed avocado on toast.',
      'Fry or poach an egg to your preference.',
      'Place egg on top of avocado toast.',
      'Squeeze fresh lemon juice and serve.'
    ]
  };
  
  return instructions[recipeName] || [
    'Prepare all ingredients.',
    'Follow standard cooking techniques.',
    'Cook until desired doneness.',
    'Season to taste and serve.'
  ];
}

// Close modal when clicking outside
document.addEventListener('click', function(event) {
  const modal = document.getElementById('recipe-modal');
  const modalContent = document.querySelector('.modal-content');
  
  if (modal.classList.contains('open') && event.target.classList.contains('modal-overlay')) {
    closeRecipeModal();
  }
});

// Close modal with Escape key
document.addEventListener('keydown', function(event) {
  if (event.key === 'Escape') {
    closeRecipeModal();
  }
});

async function fetchRecipesFromAPI() {
  if (selected.size === 0) return [];

  const API_KEY = "e67684266cf345cdbe9c8a4b5328b4e4";

  const ingredients = [...selected].join(',');

  const res = await fetch(
    `https://api.spoonacular.com/recipes/findByIngredients?ingredients=${ingredients}&number=20&apiKey=${API_KEY}`
  );

  const data = await res.json();

  return data;
}