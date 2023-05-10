import express from "express";
import { getTetrisScoreEndpoint } from "../controllers/games/tetris/tetris";

const tetrisRouter = express.Router();

tetrisRouter.get("/score", getTetrisScoreEndpoint);

export { tetrisRouter };
