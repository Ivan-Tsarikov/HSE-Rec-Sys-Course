# A01 Starter Patch - Random Lunch Menu Generator

This repository contains a minimal fix of the provided `dryjins/RecSys-LLMs/week1/index.html` starter. It is not a rebuild or redesign.

## What was preserved

- The original single-file `index.html` architecture.
- The pink gradient, white card, typography, responsive layout, and animation.
- All 12 original lunch names.
- `generateRandomLunch()` and `Math.floor(Math.random() * lunchMenu.length)`.
- The 500 ms loading state, page-load generation, and button interaction.

## What was fixed

The starter used Font Awesome 6.4 CDN class names for lunch icons. Some classes did not render reliably, so a randomly selected item could appear without its image.

- Removed the Font Awesome CDN dependency.
- Replaced each food icon class with a native Unicode food emoji.
- Replaced dynamic `innerHTML` icon injection with `textContent`.
- Added small accessibility improvements: live result announcements, keyboard focus styling, button type, and reduced-motion support.

## Run

Open `index.html` directly or visit:

https://ivan-tsarikov.github.io/HSE-Rec-Sys-Course/random-lunch-generator/

## Verification

The submitted test checks that the patch remains a single-file app, preserves the starter structure and behavior, contains all 12 original menu items, and has no Font Awesome or external CSS/JS dependency.