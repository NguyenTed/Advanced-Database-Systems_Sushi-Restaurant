export default {
  content: [
    "./src/*.{html,js,css}",
    "./src/views/**/*.ejs",
    "./public/js/**/*.js",
  ],
  mode: "jit",
  purge: ["./src/**/*.{html,js,jsx,ts,tsx,vue}"],
  theme: {
    extend: {},
  },
  plugins: [],
};
