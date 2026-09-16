document.addEventListener('DOMContentLoaded', function() {
    const generateBtn = document.getElementById('generateBtn');
    const foodIcon = document.querySelector('.food-icon');
    const foodName = document.querySelector('.food-name');
    const lunchDisplay = document.querySelector('.lunch-display');

    const lunchMenu = [
        { name: "Pizza", icon: "🍕" },
        { name: "Sushi", icon: "🍣" },
        { name: "Burger", icon: "🍔" },
        { name: "Salad", icon: "🥗" },
        { name: "Tacos", icon: "🌮" },
        { name: "Ramen", icon: "🍜" },
        { name: "Sandwich", icon: "🥪" },
        { name: "Pasta", icon: "🍝" },
        { name: "Curry", icon: "🍛" },
        { name: "Steak", icon: "🥩" },
        { name: "Soup", icon: "🥣" },
        { name: "BBQ", icon: "🔥" }
    ];

    function generateRandomLunch() {
        lunchDisplay.classList.remove('fade-in');

        const randomIndex = Math.floor(Math.random() * lunchMenu.length);
        const selectedLunch = lunchMenu[randomIndex];

        foodIcon.textContent = "⏳";
        foodName.textContent = "Thinking...";

        setTimeout(() => {
            foodIcon.textContent = selectedLunch.icon;
            foodName.textContent = selectedLunch.name;

            lunchDisplay.classList.add('fade-in');
        }, 500);
    }

    generateBtn.addEventListener('click', generateRandomLunch);

    generateRandomLunch();
});
