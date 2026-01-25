/** @type {import('tailwindcss').Config} */
module.exports = {
    content: ["./app/**/*.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
    theme: {
        extend: {
            colors: {
                brand: {
                    orange: '#FF8C42',
                    cream: '#FFF9F2',
                    dark: '#2A2A2A',
                    gray: '#A0A0A0',
                }
            },
            fontFamily: {
                sans: ['System'],
            }
        },
    },
    plugins: [],
}