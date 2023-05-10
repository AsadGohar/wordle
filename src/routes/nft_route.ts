import express from "express";
import { getUserNfts } from "../controllers/nfts/nfts";

const nftRouter = express.Router();

nftRouter.get("/ids", getUserNfts);

export { nftRouter };
