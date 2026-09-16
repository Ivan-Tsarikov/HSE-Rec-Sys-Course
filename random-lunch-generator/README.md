# A01 Starter Patch - Random Lunch Menu Generator

This directory contains a minimal fix of the provided `dryjins/RecSys-LLMs/week1/index.html` starter. It is not a rebuild or redesign.

## Files

- `index.html` — original HTML structure with links to the extracted files.
- `style.css` — CSS extracted from the starter without redesign.
- `app.js` — JavaScript extracted from the starter, with reliable Unicode food icons.

## What was preserved

- Pink gradient, white card, typography, responsive layout, and animation.
- All 12 original lunch names.
- `generateRandomLunch()` and `Math.floor(Math.random() * lunchMenu.length)`.
- The 500 ms loading state, page-load generation, and button interaction.

## What was fixed

- Removed the unreliable Font Awesome CDN dependency.
- Replaced food icon classes with native Unicode food emoji.
- Replaced dynamic `innerHTML` icon injection with `textContent`.
- Added live result announcements, keyboard focus styling, button type, and reduced-motion support.

## Run

https://ivan-tsarikov.github.io/HSE-Rec-Sys-Course/random-lunch-generator/

## Verification

The automated checks verify the exact three-file structure, links from `index.html`, all 12 menu items, preserved starter behavior, and absence of Font Awesome.
