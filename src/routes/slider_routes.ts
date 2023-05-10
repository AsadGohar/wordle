import express from "express";
import {
  startSlider,
  handleTileClick,
  getSliderScoreEndpoint,
  abandonSliderGameEndpoint,
  getAllScores
} from "../controllers/games/slider/slider";
import { verifyUser } from "../middleware/authentication/authentication";

const sliderRouter = express.Router();

sliderRouter.post("/slider", verifyUser, startSlider);
sliderRouter.patch("/tile", verifyUser, handleTileClick);
sliderRouter.get("/score", getSliderScoreEndpoint);
sliderRouter.get("/all-scores", getAllScores);
sliderRouter.post("/abandon", verifyUser, abandonSliderGameEndpoint);

export { sliderRouter };
