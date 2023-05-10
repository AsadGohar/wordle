import { NextFunction, Request, Response } from "express";
import { Socket } from "socket.io";
import { userDisconnectTimerMap } from "../../../app";

import { connection } from "../../../database/database";

import {
  basePayloadI,
  scoreAddedType,
  scoredPayloadI,
  scoreToAddEnum,
} from "../../../types/tetris";
import { env_Vars } from "../../../config/config";

const addScoreFromRowsClearedGuard = (_: any): never => {
  throw new Error("Invalid Score");
};

const startTetris = async (
  startTetrisPayload: basePayloadI,
  socket: Socket
) => {
  try {
    const contestant = startTetrisPayload.contestant;
    const userAddress = startTetrisPayload.userAddress;

    console.log(userAddress, contestant, "Starting Tetris");

    createTetrisTableIfNotExists();

    const userScore = await getTetrisGameScoreForContestant(contestant);
    if (userScore?.total_score !== undefined) return;

    const createdTetrisGameId = await createTetrisGame(userAddress, contestant);
    if (createdTetrisGameId !== undefined && createdTetrisGameId !== null) {
      setUserTetrisTimeOutTimers(
        20,
        7,
        Number(TETRIS_GAMETIME_SECONDS),
        userAddress,
        contestant,
        socket,
        startTetrisPayload
      );

      socket.emit("tetris:started", createdTetrisGameId);
    }
  } catch (e) {
    console.error(e, "error starting tetris");
  }
};

export const registerSocketTetrisHandlers = (io: any, socket: Socket) => {
  socket.on("tetris:score", tetrisPlayerScored);
  socket.on("tetris:drop_fourth", registerFourthPuzzleDrop);
  socket.on("tetris:new_piece", newPuzzlePieceGenerated);
  socket.on("tetris:start", async (payload) => {
    startTetris(payload, socket);
  });
  socket.on("tetris:end", async (payload) => {
    endTetris(payload, socket);
  });
};

export const getTetrisScoreEndpoint = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    createTetrisTableIfNotExists();
    const userAddress = req.query.userAddress;
    const contestant = req.query.contestant;

    if (userAddress && contestant !== undefined && contestant !== null) {
      const tetrisGameScore = await getTetrisGameScoreForContestant(
        Number(contestant)
      );

      if (!tetrisGameScore) {
        res.status(400).json({
          timesClicked: null,
          message: "no tetris-game found for contestant",
        });
        return;
      }

      res.status(200).json({ score: tetrisGameScore.total_score });
    }
  } catch (e) {
    console.log(e, "error");
    res.status(500).json({});
  }
};

const endTetris = async (endTetrisPayload: basePayloadI, socket: Socket) => {
  try {
    const contestant = endTetrisPayload.contestant;
    const user_address = endTetrisPayload.userAddress;

    const playTime = await completeTetrisGameThenGetPlayTime(
      user_address,
      contestant
    );

    if (playTime) {
      const score = await getTetrisGameScoreForContestant(contestant);
      console.log(score, "endTetris");
      socket.emit("tetris:ended", {
        score: score?.total_score,
        isAbandon: false,
      });
      const userClickIdentifier = `${user_address}-${contestant}`;

      clearTimers(userClickIdentifier);

      socket.disconnect(true);
    } else console.log(playTime, "playtime : game ended - playtime problem");
  } catch (e) {
    console.error(e, "error ending tetris");
  }
};

export const abandonTetrisGame = async (
  _userAddress: string,
  _contestant: number,
  socket: Socket
) => {
  const getIsTetrisRunningPromise = new Promise<
    [{ is_tetris_running: boolean }]
  >(function (resolve, reject) {
    let getIsTetrisRunningQuery =
      "SELECT is_tetris_running from tetris WHERE user_address = ? AND contestant=?";

    connection.query(
      getIsTetrisRunningQuery,
      [_userAddress, _contestant],
      function (error, results, fields) {
        if (error) reject(error);
        resolve(results);
      }
    );
  });

  const isTetrisRunningResponse = await getIsTetrisRunningPromise;
  const isTetrisRunning = isTetrisRunningResponse[0].is_tetris_running;

  if (isTetrisRunning) {
    const abandonTetrisGamePromise = new Promise<void>(function (
      resolve,
      reject
    ) {
      const abandonTetrisGameQuery = `
        UPDATE tetris 
        SET is_tetris_running = false,
              end_time = NULL,
              play_time = NULL,
              total_score = NULL 
        WHERE user_address = ? AND 
              contestant = ?`;

      connection.query(
        abandonTetrisGameQuery,
        [_userAddress, _contestant],
        function (error, results, fields) {
          if (error) reject(error);
          resolve(results);
        }
      );
    });

    await abandonTetrisGamePromise;
    const userClickIdentifier = `${_userAddress}-${_contestant}`;
    clearTimers(userClickIdentifier);
    socket.emit("tetris:ended", { score: null, isAbandon: true });
    return true;
  } else {
    return false;
  }
};

const createTetrisGameDetailsTableIfNotExists = async () => {
  let createTetrisDetailsTablePromise = new Promise<void>(function (
    resolve,
    reject
  ) {
    const createTetrisDetailsTableQuery = `CREATE TABLE IF NOT EXISTS tetris_game_details (
      tetris_game_detail_id INT AUTO_INCREMENT PRIMARY KEY,
      rows_cleared INT NOT NULL,
      score_added INT NOT NULL,
      time_submitted BIGINT NOT NULL,
      tetris_game_id INT NOT NULL,
      user_address VARCHAR(255) NOT NULL, 
      contestant INT NOT NULL,
      FOREIGN KEY (tetris_game_id) REFERENCES tetris (tetris_game_id)
    )`;

    connection.query(createTetrisDetailsTableQuery, function (err, result) {
      if (err) {
        console.log(err, "error creating pairs_grid table");
        reject(err);
      }
      if (result) {
      }
      resolve(result);
    });
  });
  await createTetrisDetailsTablePromise;
};

const createTetrisGame = async (user_address: string, contestant: number) => {
  const tetrisGameStartValues = {
    user_address,
    contestant,
    is_tetris_running: true,
    times_scored: 0,
    total_score: 0,
    start_time: Date.now(),
  };

  await createTetrisGameDetailsTableIfNotExists();

  const createTetrisGameQuery = "INSERT INTO tetris SET ?";

  let getCreatedTetrisGameIdPromise = new Promise<number>(function (
    resolve,
    reject
  ) {
    connection.query(
      createTetrisGameQuery,
      tetrisGameStartValues,
      function (error, results, fields) {
        if (error) return reject(error);
        if (results) {
          resolve(results.insertId);
        }
      }
    );
  });

  let createdTetrisGameId = await getCreatedTetrisGameIdPromise;
  return createdTetrisGameId;
};

const addScoreTetrisGame = async (
  _userAddress: string,
  _contestant: number,
  _userTetrisGameId: number,
  _rowsCleared: number
) => {
  let scoreAdded: scoreAddedType;

  switch (_rowsCleared) {
    case 1:
      scoreAdded = scoreToAddEnum.oneRowCleared;
      break;
    case 2:
      scoreAdded = scoreToAddEnum.twoRowsCleared;
      break;
    case 3:
      scoreAdded = scoreToAddEnum.threeRowsCleared;
      break;
    case 4:
      scoreAdded = scoreToAddEnum.fourRowsCleared;
      break;
    default:
      addScoreFromRowsClearedGuard(_rowsCleared);
      break;
  }

  const updateTetrisWhenAddingScorePromise = new Promise(function (
    resolve,
    reject
  ) {
    const updateTetrisTotalScoreQuery = `
    UPDATE tetris
    SET
      times_scored = times_scored + 1,
      total_score = total_score + ? 
    WHERE
        user_address = ? AND contestant=?
    `;

    connection.query(
      updateTetrisTotalScoreQuery,
      [scoreAdded, _userAddress, _contestant],
      function (error, results, fields) {
        if (error) reject(error);
        resolve(results);
      }
    );
  });

  const addTetris_ScorePromise = new Promise(function (resolve, reject) {
    const addTetris_ScoreQuery = `INSERT INTO tetris_game_details
      SET rows_cleared = ?,
          time_submitted = ?,
          score_added = ?,
          tetris_game_id = ?,
          user_address = ?,
          contestant = ?
      `;

    connection.query(
      addTetris_ScoreQuery,
      [
        _rowsCleared,
        Date.now(),
        scoreAdded,
        _userTetrisGameId,
        _userAddress,
        _contestant,
      ],
      function (error, results, fields) {
        if (error) reject(error);
        resolve(results);
      }
    );
  });

  Promise.all([updateTetrisWhenAddingScorePromise, addTetris_ScorePromise])
    .then((addScoreResults) => {
      // console.log(addScoreResults, "addScoreResults");
    })
    .catch((addScoreErrror) => {
      console.log(addScoreErrror, "addScoreErrror");
    });
};

const getTetrisGameScoreForContestant = async (_contestant: number) => {
  const getTetrisGameScorePromise = new Promise<[{ total_score: number }]>(
    function (resolve, reject) {
      const getTetrisGameScoreQuery =
        "SELECT total_score FROM tetris WHERE contestant = ?";

      connection.query(
        getTetrisGameScoreQuery,
        [_contestant],
        function (err, result) {
          if (err) {
            console.error("getTetrisGameScore err:", err);
            reject(err);
          }
          if (result) {
            resolve(result);
          }
        }
      );
    }
  );

  const tetrisGameScore = await getTetrisGameScorePromise;
  if (tetrisGameScore.length) return tetrisGameScore[0];
  else return;
};

const getIsTetrisRunning = async (
  _userAddress: string,
  _contestant: number
) => {
  const getIsTetrisRunningPromise = new Promise<
    [{ is_tetris_running: boolean }]
  >(function (resolve, reject) {
    const getIsTetrisRunningQuery = `
      SELECT 
        is_tetris_running
      FROM
        tetris
      WHERE
        user_address = ? AND contestant = ?
      `;

    connection.query(
      getIsTetrisRunningQuery,
      [_userAddress, _contestant],
      function (error, results) {
        if (error) reject(error);
        if (results) resolve(results);
      }
    );
  });

  const isTetrisRunningResult = await getIsTetrisRunningPromise;
  const isTetrisRunning = isTetrisRunningResult[0].is_tetris_running;
  return isTetrisRunning;
};

const createTetrisTableIfNotExists = () => {
  const createTetrisTableQuery = `CREATE TABLE IF NOT EXISTS tetris (
      tetris_game_id INT AUTO_INCREMENT PRIMARY KEY, 
      user_address VARCHAR(255) NOT NULL, 
      contestant INT NOT NULL,
      is_tetris_running BOOLEAN,
      times_scored INT NOT NULL,
      total_score INT,
      start_time BIGINT NOT NULL,
      end_time BIGINT,
      play_time BIGINT
          )`;

  connection.query(createTetrisTableQuery, function (err, result) {
    if (err) {
      console.log(err, "error creating tetris table");
    }
  });
};

const completeTetrisGameThenGetPlayTime = async (
  _userAddress: string,
  _contestant: number
) => {
  const isTetrisRunning = await getIsTetrisRunning(_userAddress, _contestant);
  if (!isTetrisRunning) return;

  const getTetrisGameStartTimePromise = new Promise<[{ start_time?: number }]>(
    function (resolve, reject) {
      const getStartTimeQuery =
        "SELECT start_time FROM tetris WHERE user_address = ? AND contestant = ? AND is_tetris_running = true";

      connection.query(
        getStartTimeQuery,
        [_userAddress, _contestant],
        function (error, results) {
          if (error) reject(error);
          if (results) resolve(results);
        }
      );
    }
  );

  const startTimeResponse = await getTetrisGameStartTimePromise;

  const TetrisStartTime = startTimeResponse[0].start_time;

  const endTime = Date.now();
  if (TetrisStartTime) {
    const playTime = endTime - TetrisStartTime;
    const completeTetrisGamePromise = new Promise<void>(function (
      resolve,
      reject
    ) {
      const completeGameQuery =
        "UPDATE tetris SET is_tetris_running = false, end_time = ?, play_time = ? WHERE user_address = ? AND contestant=? AND is_tetris_running = true";

      connection.query(
        completeGameQuery,
        [endTime, playTime, _userAddress, _contestant],
        function (error, results, fields) {
          if (error) reject(error);
          resolve(results);
        }
      );
    });

    await completeTetrisGamePromise;

    return playTime;
  }
};

const setUserTetrisTimeOutTimers = async (
  timeoutGeneratedAfterXSeconds: number,
  timeoutDroppedAfterYSeconds: number,
  gameTotalTimeInSeconds: number,
  _userAddress: string,
  _contestant: number,
  socket: Socket,
  startTetrisPayload: basePayloadI
) => {
  timeoutGeneratedAfterXSeconds = timeoutGeneratedAfterXSeconds * 1000;
  timeoutDroppedAfterYSeconds = timeoutDroppedAfterYSeconds * 1000;
  const gameTotalTimeInMs = gameTotalTimeInSeconds * 1000;

  console.log("abandoning tetris after generated timeout");
  const puzzlePieceGeneratedTimer = setTimeout(async () => {
    await abandonTetrisGame(_userAddress, _contestant, socket);

    console.log("abandoned tetris after generated timeout");
  }, timeoutGeneratedAfterXSeconds);

  console.log("abandoning tetris after dropped timeout");
  const puzzlePieceDroppedTimer = setTimeout(async () => {
    await abandonTetrisGame(_userAddress, _contestant, socket);

    console.log("abandoned tetris after dropped timeout");
  }, timeoutDroppedAfterYSeconds);

  const totalTetrisTimer = setTimeout(() => {
    console.log(_userAddress, _contestant, "Tetris 5 minutes Up - Completing");
    endTetris(startTetrisPayload, socket);
  }, gameTotalTimeInMs);

  const userClickIdentifier = `${_userAddress}-${_contestant}`;

  puzzlePieceGeneratedTimerMap.set(
    userClickIdentifier,
    puzzlePieceGeneratedTimer
  );

  puzzlePieceDroppedTimerMap.set(userClickIdentifier, puzzlePieceDroppedTimer);

  tetrisTotalGameTimerMap.set(userClickIdentifier, totalTetrisTimer);
};

const newPuzzlePieceGenerated = async (
  newPuzzlePieceGeneratedPayload: basePayloadI
) => {
  try {
    const contestant = newPuzzlePieceGeneratedPayload.contestant;
    const userAddress = newPuzzlePieceGeneratedPayload.userAddress;

    getIsTetrisRunning(userAddress, contestant)
      .then((isTetrisRunning) => {
        if (!isTetrisRunning) {
          return;
        }

        const userClickIdentifier = `${userAddress}-${contestant}`;
        const { puzzleGeneratedTimer } = getUserTimers(userClickIdentifier);

        puzzleGeneratedTimer?.refresh();
      })
      .catch((e) => console.error(e, "error-newPuzzlePieceGenerated"));
  } catch (e) {
    console.error(e, "error-newPuzzlePieceGenerated ");
  }
};

const registerFourthPuzzleDrop = (dropPayload: basePayloadI) => {
  try {
    const userAddress = dropPayload.userAddress;
    const contestant = dropPayload.contestant;

    getIsTetrisRunning(userAddress, contestant)
      .then((isTetrisRunning) => {
        if (!isTetrisRunning) {
          return;
        }

        const userClickIdentifier = `${userAddress}-${contestant}`;
        const { puzzleDroppedTimer } = getUserTimers(userClickIdentifier);
        puzzleDroppedTimer?.refresh();
      })
      .catch((e) => console.error(e, "error-PuzzleDrop"));
  } catch (e) {
    console.error(e, "registerFifthPuzzleDrop");
  }
};

const tetrisPlayerScored = async (payload: scoredPayloadI) => {
  try {
    const contestant = payload.contestant;
    const userAddress = payload.userAddress;
    const userTetrisGameId = payload.userTetrisGameId;
    const rowsCleared = payload.rowsCleared;

    createTetrisTableIfNotExists();

    const isTetrisRunning = await getIsTetrisRunning(userAddress, contestant);

    if (!isTetrisRunning) {
      return;
    }

    await addScoreTetrisGame(
      userAddress,
      contestant,
      userTetrisGameId,
      rowsCleared
    );

    console.log(payload, "scored tetris");
  } catch (e) {
    console.error(e, "error scoring tetris");
  }
};

const getUserTimers = (_userClickIdentifier: string) => {
  const puzzleGeneratedTimer =
    puzzlePieceGeneratedTimerMap.get(_userClickIdentifier);
  const puzzleDroppedTimer =
    puzzlePieceDroppedTimerMap.get(_userClickIdentifier);
  const tetrisTotalGameTimer =
    tetrisTotalGameTimerMap.get(_userClickIdentifier);
  const userDisconnectTimer = userDisconnectTimerMap.get(_userClickIdentifier);

  return {
    puzzleGeneratedTimer,
    puzzleDroppedTimer,
    tetrisTotalGameTimer,
    userDisconnectTimer,
  };
};

const clearTimers = (_userClickIdentifier: string) => {
  const {
    puzzleDroppedTimer,
    puzzleGeneratedTimer,
    tetrisTotalGameTimer,
    userDisconnectTimer,
  } = getUserTimers(_userClickIdentifier);
  clearTimeout(puzzleDroppedTimer);
  clearTimeout(puzzleGeneratedTimer);
  clearTimeout(tetrisTotalGameTimer);
  clearTimeout(userDisconnectTimer);

  puzzlePieceDroppedTimerMap.delete(_userClickIdentifier);
  puzzlePieceGeneratedTimerMap.delete(_userClickIdentifier);
  tetrisTotalGameTimerMap.delete(_userClickIdentifier);
  userDisconnectTimerMap.delete(_userClickIdentifier);
};

const puzzlePieceGeneratedTimerMap = new Map<string, NodeJS.Timeout>();
const puzzlePieceDroppedTimerMap = new Map<string, NodeJS.Timeout>();
const tetrisTotalGameTimerMap = new Map<string, NodeJS.Timeout>();
const TETRIS_GAMETIME_SECONDS = env_Vars.Game.TETRIS_GAMETIME_SECONDS;
