import { Router } from "express";
import { PATH } from "../config/path.js";

const routes = Router();

routes.get(PATH.HOME, async (req, res) => {
  res.status(200).send("Hello world");
});

export default routes;
