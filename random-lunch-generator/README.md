# 🍽️ Random Lunch Menu Generator

Tired of deciding what to eat for lunch? This lightweight web app chooses one of 12 lunch ideas at random and displays it with a matching food emoji. It is a minimal repair of the Week 1 starter supplied for the HSE LLM4Rec course, not a redesign.

![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)
![GitHub Pages](https://img.shields.io/badge/GitHub%20Pages-222222?style=for-the-badge&logo=githubpages&logoColor=white)

## ✨ Features

- **Randomized selection:** one lunch suggestion per click.
- **Visual result:** every suggestion has a native Unicode food emoji.
- **Fast and dependency-free:** no framework, build step, or external icon library.
- **Responsive interface:** works on desktop and mobile screens.
- **Accessible updates:** generated results are announced through an ARIA live region, keyboard focus is visible, and reduced-motion preferences are respected.

## 🚀 Live Demo

Open the published application:

👉 **[LIVE DEMO](https://ivan-tsarikov.github.io/HSE-Rec-Sys-Course/random-lunch-generator/)** 👈

## 🛠️ How It Works

1. `app.js` stores 12 lunch options with matching emoji.
2. The page calls `generateRandomLunch()` after loading and whenever the button is clicked.
3. `Math.floor(Math.random() * lunchMenu.length)` selects a valid array index.
4. A short 500 ms “Thinking...” state is shown before the selected lunch appears with the original fade-in animation.

## 📁 Project Structure

```text
random-lunch-generator/
├── index.html   # Page structure and accessible result area
├── style.css    # Original responsive visual design
├── app.js       # Lunch data and random-selection logic
└── README.md    # Project documentation
```

## 🔧 What Was Fixed

The provided starter used Font Awesome 6.4.0 classes for its lunch icons. A direct check of the pinned stylesheet showed that 3 of the 12 referenced menu classes were absent, which explains why some selections displayed a name without an icon.

The repair:

- removes the Font Awesome CDN dependency;
- replaces all icon classes with native Unicode emoji;
- renders dynamic icons with `textContent` instead of `innerHTML`;
- preserves the supplied layout, texts, 12 lunch names, random-selection formula, delay, animation, page-load generation, and click interaction;
- mechanically separates the starter into `index.html`, `style.css`, and `app.js`.

## 💻 Run Locally

```bash
git clone https://github.com/Ivan-Tsarikov/HSE-Rec-Sys-Course.git
cd HSE-Rec-Sys-Course/random-lunch-generator
```

Then open `index.html` in a browser. No installation or build command is required.

## 🎯 How to Use

1. Open the live demo or local `index.html`.
2. Click **Generate Lunch!**
3. Wait briefly for the generated lunch name and emoji.
4. Click again whenever you want another suggestion.

## ✅ Verification

The accompanying coursework test suite contains 19 checks for the required file structure, the 12 menu items, preserved starter behavior, removal of Font Awesome, and accessibility additions. The published HTML, CSS, and JavaScript resources have also been checked to return HTTP 200.

## 🙏 Acknowledgments

- [LLM4Rec Week 1 assignment](https://github.com/dryjins/RecSys-LLMs/blob/main/week1/prompt.md)
- [Provided Week 1 starter code](https://github.com/dryjins/RecSys-LLMs/blob/main/week1/index.html)
