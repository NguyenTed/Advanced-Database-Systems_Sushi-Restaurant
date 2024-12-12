import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import routes from "./src/routes/index.js";

const app = express();

app.use(express.urlencoded({ extended: true }));
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.static(path.join(__dirname, 'public')));
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "/src/views"));

app.use(routes);

export default app;
