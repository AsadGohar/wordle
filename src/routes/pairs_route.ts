import express from "express";
import {
  handleClickZone,
  getPairsScoreEndpoint,
  abandonGameEndpoint,
  handleStartPairs,
} from "../controllers/games/words/words";
import { verifyUser } from "../middleware/authentication/authentication";

const pairsRouter = express.Router();

pairsRouter.post("/pairs", verifyUser, handleStartPairs);
pairsRouter.patch("/zone", verifyUser, handleClickZone);
pairsRouter.get("/score", getPairsScoreEndpoint);
pairsRouter.post("/abandon", verifyUser, abandonGameEndpoint);

export { pairsRouter };
