import { Router } from "express";
import path, { resolve } from "path";
import { fileURLToPath } from "url";
import { PATH } from "../config/path.js";

const routes = Router();

routes.get("/", (req, res) => {
  res.render("layout/main-layout", {
    title: "Home",
    description: "Home page of Online News",
    content: "../pages/home.ejs",
  });
});

routes.use((req, res) => {
  res.status(404).render("layout/main-layout.ejs", {
    title: "404 - Không tìm thấy",
    description: "Nội dung bạn đang cố truy cập không tồn tại hoặc đã bị xóa",
    content: "../pages/404",
  });
});

export default routes;
