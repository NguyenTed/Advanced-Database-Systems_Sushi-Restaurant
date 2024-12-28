import { Router } from "express";
import { PATH } from "../config/path.js";
import { renderReservationPage } from "../controllers/reservation-controller.js";

const routes = Router();
routes.use((req, res, next) => {
  res.locals.path = req.path;
  next();
});

routes.post(PATH.RESERVATION, renderReservationPage);

export default routes;