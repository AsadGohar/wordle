import { NextFunction, Request, Response } from "express";
import { wheresVitoshi } from "./model";
import { isWheresVitoshiGuessReq } from "../../../types/wheresVitoshi";

export async function test(req: Request, res: Response, next: NextFunction) {
  try {
    res.json({ test: ["1", "2"] });
  } catch (e) {
    res.status(500).json(e);
  }
}

export async function startWheresVitoshi(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const contestant: number = Number(req.body.contestant);
    const userAddress: string = req.body.userAddress;

    await wheresVitoshi.createTable();

    const gameAlreadyPlayedByContestant =
      await wheresVitoshi.getGamesByContestant(contestant);

    if (gameAlreadyPlayedByContestant) {
      res
        .status(400)
        .json({ message: "user and contestant have already played" });
      return;
    }
    const { createdGameId, img_num } =
      await wheresVitoshi.createGameAndGetGameId(userAddress, contestant);

    res.status(201).json({ wheresVitoshiGameId: createdGameId, img_num });
  } catch (e) {
    console.error("error startWheresVitoshi:", e);
    res.status(500).json({ message: "error starting WheresVitoshiGame" });
  }
}

export async function resetFunc(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    // resetStopwatch();
    res.status(200).send("ok");
  } catch (e) {
    res.status(500).json(e);
  }
}

export async function guess(req: Request, res: Response, next: NextFunction) {
  try {
    const guessReq = req.body;

    if (isWheresVitoshiGuessReq(guessReq)) {
      const guessRes = await wheresVitoshi.guess(guessReq);
      if (guessRes === "game already played") {
        res.status(400).json({ message: "game is not running" });
      } else {
        const { playTime, isVitoshiFound } = guessRes;
        res.status(201).json({ isVitoshiFound, finalTime: playTime });
      }
    } else {
      res.status(400).json({ message: "Is not a where's vitoshi guess" });
    }
  } catch (e) {
    console.error(e, "wheresVitoshi-guess error");
    res.status(500).json();
  }
}

export async function getAllCompletedGames(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const completedGames = await wheresVitoshi.getAllCompletedGames();
    res.status(200).json({ completedGames });
  } catch {
    res.status(500).json({ message: "error getting wheres vitoshi scores" });
  }
}

export async function getUserScore(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const contestant = req.query.contestant;

  if (contestant === undefined || contestant === null) {
    res.status(400).json({ message: "contestant malformed" });
    return;
  }

  try {
    let userScore = await wheresVitoshi.getGamesByContestant(
      Number(contestant)
    );
    if (!userScore) {
      res.status(400).json({ message: "no game by contestant" });
      return;
    }
    res.status(200).json({ score: userScore.guesses });
  } catch {
    res.status(500).json({ message: "error getting wheres vitoshi userScore" });
  }
}

export async function abandonGame(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const contestant: number = Number(req.body.contestant);
    const userAddress: string = req.body.userAddress;
    const gameId: number = Number(req.body.gameId);

    await wheresVitoshi.abandonGame(userAddress, contestant);
    res.status(200);
  } catch {
    res.status(500).json({ message: "error abandoning where's vit game" });
  }
}
