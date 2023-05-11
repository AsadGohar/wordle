import express from "express";
import { Request, Response } from "express";
import cors from "cors";
import SimpleCrypto from "simple-crypto-js";
import { Server, Socket } from "socket.io";
import { connection } from "./database/database";
import { pairsRouter } from "./routes/pairs_route";
import { sliderRouter } from "./routes/slider_routes";
import { wheresVitoshiRouter } from "./routes/wheresVitoshi_route";
// import { env_Vars } from "./config/config";
import { ErrorI } from "./types/error";

//port number should be between 49152 & 65535
//https://stackoverflow.com/questions/44079039/run-node-js-on-cpanel-hosting-server
const PORT = 4000;

const app = express();

app.get("/", (req: Request, res: Response) => {
  res.json({
    message: "Hello world",
  });
});

app.use(express.json());
let corsOptions: cors.CorsOptions = {
  origin: "http://localhost:5173",
  credentials: true,

  // origin: "https://vitoshisgames.co.uk",
};

app.use(cors(corsOptions));
// app.use(cors());

// app.use("/api/pairs", pairsRouter);
// app.use("/api/tetris", tetrisRouter);
// app.use("/api/slider", sliderRouter);
// app.use("/api/skippingStones", skippingStonesRouter);
// app.use("/api/wheresVitoshi", wheresVitoshiRouter);
// app.use("/api/nft", nftRouter);
// app.use("/api/auth", authRouter);

// Now getUser function will be available on all routes;

app.get("*", function (req: Request, res: Response) {
  console.log("404ing");
  res.status(400).json({ status: "404" });
});

const dbConnection = connection;

export const server = app.listen(PORT, () => {
  console.log(`Server listening on ${PORT}`);
  console.log("Wordle Backend");
});

