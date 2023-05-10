import express from "express";
import { verifyUser } from "../middleware/authentication/authentication";
import { test } from "../controllers/games/wheresVitoshi";
import { getUserScore } from "../controllers/games/wheresVitoshi";
import {
  startWheresVitoshi,
  guess,
  abandonGame,
  getAllCompletedGames,
} from "../controllers/games/wheresVitoshi";

const wheresVitoshiRouter = express.Router();

wheresVitoshiRouter.get("/", test);

wheresVitoshiRouter.post("/wheresVitoshi", verifyUser, startWheresVitoshi);
wheresVitoshiRouter.post("/guess", verifyUser, guess);
wheresVitoshiRouter.post("/abandon", verifyUser, abandonGame);
wheresVitoshiRouter.get("/all-scores", getAllCompletedGames);
wheresVitoshiRouter.get("/score", getUserScore);

export { wheresVitoshiRouter };
