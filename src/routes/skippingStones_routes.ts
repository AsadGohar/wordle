import express from "express";
import {
  getSkippingStonesScoreEndpoint,
  guess,
  startSkippingStones,
} from "../controllers/games/skippingStones/skippingStones";
import { verifyUser } from "../middleware/authentication/authentication";
import { getAllCompletedGames } from "../controllers/games/wheresVitoshi";

const skippingStonesRouter = express.Router();

skippingStonesRouter.post("/skippingStones", verifyUser, startSkippingStones); 
skippingStonesRouter.post("/guess", verifyUser, guess);
skippingStonesRouter.get("/score", getSkippingStonesScoreEndpoint);
skippingStonesRouter.get("/all-scores", getAllCompletedGames);

export { skippingStonesRouter };
