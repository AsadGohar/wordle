import express from "express";
import { Request, Response } from "express";
import cors from "cors";
import SimpleCrypto from "simple-crypto-js";
import { Server, Socket } from "socket.io";

import { connection } from "./database/database";
import { pairsRouter } from "./routes/pairs_route";
import { tetrisRouter } from "./routes/tetris_route";
import {
  abandonTetrisGame,
  registerSocketTetrisHandlers,
} from "./controllers/games/tetris/tetris";
import { sliderRouter } from "./routes/slider_routes";
import { skippingStonesRouter } from "./routes/skippingStones_routes";
import { wheresVitoshiRouter } from "./routes/wheresVitoshi_route";
import { env_Vars } from "./config/config";
import { ErrorI } from "./types/error";
import {
  authMiddleware,
  authRouter,
  getUser,
} from "./middleware/authentication/thirdwebAuth";
import { nftRouter } from "./routes/nft_route";

//port number should be between 49152 & 65535
//https://stackoverflow.com/questions/44079039/run-node-js-on-cpanel-hosting-server
const PORT = env_Vars.App.BACKEND_PORT;

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

app.use("/api/pairs", pairsRouter);
app.use("/api/tetris", tetrisRouter);
app.use("/api/slider", sliderRouter);
app.use("/api/skippingStones", skippingStonesRouter);
app.use("/api/wheresVitoshi", wheresVitoshiRouter);
app.use("/api/nft", nftRouter);
app.use("/api/auth", authRouter);

// Now getUser function will be available on all routes
app.use(authMiddleware);

app.get("api/secret", async (req, res) => {
  const user = await getUser(req);

  if (!user) {
    return res.status(401).json({
      message: "Not authorized.",
    });
  }

  return res.status(200).json({
    message: "This is a secret... don't tell anyone.",
  });
});

app.get("*", function (req: Request, res: Response) {
  console.log("404ing");
  res.status(400).json({ status: "404" });
});

const dbConnection = connection;

export const server = app.listen(PORT, () => {
  console.log(`Server listening on ${PORT}`);
  console.log("Where's Vit Backend 13");
});

export const io = new Server(server, {
  cors: {
    //   // origin: ["https://vitoshisgames.com"],,
    origin: "*",
  },
});

interface extendedSocket extends Socket {
  userAddress?: string;
  contestant?: number;
}

//Tetris decrypt value from front-end
const tetrisCrypto = new SimpleCrypto(env_Vars.Game.TETRIS_KEY);

// socket authentication middleware
io.use(async (socket: extendedSocket, next) => {
  try {
    const userKeyEncrypted = socket.handshake.auth.userKey;

    const userKey = tetrisCrypto.decrypt(userKeyEncrypted);
    const userAddress = socket.handshake.auth.userAddress;
    const contestant = socket.handshake.auth.contestant;

    if (
      userKey === undefined ||
      userAddress === undefined ||
      contestant === undefined
    ) {
      const authErr = new Error("auth incomplete");
      next(authErr);
      return;
    }

    const getUserKeyForAddressPromise = new Promise<[{ userKey: string }]>(
      function (resolve, reject) {
        connection.query(
          "SELECT userKey from users WHERE userAddress = ?",
          [userAddress],
          function (error, results, fields) {
            if (error) {
              reject(error);
            } else {
              resolve(results);
            }
          }
        );
      }
    );
    const getUserKeyForAddress = await getUserKeyForAddressPromise;

    const fetchedKey =
      getUserKeyForAddress.length && getUserKeyForAddress[0].userKey;

    console.log(fetchedKey, "fetchedKey");

    if (fetchedKey === userKey) {
      console.log("authenticated");
      if (!socket.userAddress) socket.userAddress = userAddress;
      next();
    } else {
      const err: ErrorI = new Error("User not verified");
      return next(err);
    }
  } catch (err) {
    console.log(err, "authorizing socket error");
    const authErr = new Error("authorizing socket error");
    next(authErr);
  }
});

export const userDisconnectTimerMap = new Map<string, NodeJS.Timeout>();

const onConnection = (socket: Socket) => {
  const user_address = socket.handshake.auth.userAddress;
  const contestant = socket.handshake.auth.contestant;
  const userClickIdentifier = `${user_address}-${contestant}`;
  const userDisconnectTimer = userDisconnectTimerMap.get(userClickIdentifier);
  if (userDisconnectTimer) {
    clearTimeout(userDisconnectTimer);
  }

  socket.on("disconnect", (reason) => {
    console.log(socket.id, reason, "id, disconnect reason");
    if (reason === "server namespace disconnect") return;

    console.log(userClickIdentifier, "User Disconnected -Abandoning in 3s");
    const userDisconnectTimer = setTimeout(async () => {
      // abandon if game not ended.
      console.log("user socket disconnected, abandoning if not ended");
      await abandonTetrisGame(user_address, contestant, socket);
    }, 3000);

    userDisconnectTimerMap.set(userClickIdentifier, userDisconnectTimer);
  });

  registerSocketTetrisHandlers(io, socket);
};

io.on("connection", onConnection);
