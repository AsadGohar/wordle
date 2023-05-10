import { NextFunction, Request, Response } from "express";
import { connection } from "../../../database/database";
import { env_Vars } from "../../../config/config";

export const startSlider = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const contestant = Number(req.body.contestant);
    const userAddress = req.body.userAddress;

    const sliderScoreForContestant = await getSliderScoreForContestant(
      Number(contestant)
    );
    if (sliderScoreForContestant !== undefined) {
      res
        .status(400)
        .json({ status: false, message: "contestant already played slider" });
      return;
    }

    const { sliderGameId, sliderGrid } =
      await createSliderGameThenGetGameDetails(userAddress, contestant);

    if (sliderGameId !== undefined && sliderGameId !== null) {
      setUserSliderTimeOutTimers(
        SLIDER_GAME_TIME_SECONDS,
        userAddress,
        contestant
      );

      res.status(200).json({
        status: true,
        createdSliderGameId: sliderGameId,
        createdSliderGrid: sliderGrid,
      });
    } else throw "createdGameIdNullish";
  } catch (e) {
    console.error(e, "error starting slider");
    res.status(500).json({ status: false, error: e });
  }
};

export const handleTileClick = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const tileIndex = req.body.tileIndex;
    const userSliderGameId = req.body.userSliderGameId;

    const userAddress = req.body.userAddress;
    const contestant = req.body.contestant;

    const isSliderRunning = await getIsSliderRunning(userAddress, contestant);

    if (!isSliderRunning) {
      res
        .status(400)
        .json({ status: "false", message: "slider game not running" });
      return;
    }

    const { isSwapSuccessful, cannotSwap } = await moveTile(
      userAddress,
      contestant,
      tileIndex,
      userSliderGameId
    );
    if (isSwapSuccessful) {
      const sliderZonesGrid = await getSliderZonesGrid(userSliderGameId);
      const isSliderSolved = isSolved(sliderZonesGrid);
      let playTime;

      const timesClicked = await getSliderTimesClickedForRunningGames(
        userAddress,
        contestant
      );

      /////////////
      if (isSliderSolved) {
        const gameCompletedObj = await completeSliderThenGetPlayTime(
          userAddress,
          contestant
        );
        if (gameCompletedObj.gameCompleted) {
          playTime = gameCompletedObj.playTime;
        }
      }
      ////////////

      res.status(200).json({
        tileIndex,
        timesClicked: timesClicked?.times_clicked,
        isSliderGameComplete: false,
        isSliderSolved,
        playTime,
        updatedSliderGrid: sliderZonesGrid,
      });
    } else {
      res.status(400).json({ isSwapSuccessful, cannotSwap });
    }
  } catch (e) {
    console.error(e, "error getting clicked card");
    res.status(500).json({ error: e });
  }
};

export const getSliderScoreEndpoint = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const contestant = req.query.contestant;

    if (contestant === undefined || contestant === null) {
      res.status(400).json({ message: "user details missing" });
      return;
    }

    const sliderGameScore = await getTimesClicked(Number(contestant));
    if (!sliderGameScore) {
      res
        .status(400)
        .json({ message: "no game found for user and contestant" });
      return;
    }
    const score = sliderGameScore.times_clicked;
    res.status(200).json({ score });
  } catch (e) {
    console.error("getSliderScoreEndpoint-error:", e);
    res.status(500).json({});
  }
};

export const getAllScores = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    createSliderTableIfNotExists();

    const allSliderScores = await getAllSliderScoresFunc();
    console.log("allSliderScores:", allSliderScores);

    res.status(200).json({ allSliderScores, success: true });
  } catch (e) {
    console.error("getAllScores-error:", e);
    res.status(500);
  }
};

export const abandonSliderGameEndpoint = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userAddress = req.body.userAddress;
    const contestant = req.body.contestant;

    if (userAddress && contestant !== undefined && contestant !== null) {
      console.log("attempting slider abandon game");
      const abandonGameSuccess = await abandonSliderGame(
        userAddress,
        contestant
      );
      if (abandonGameSuccess)
        res.status(200).json({ statuss: true, message: "slider abandoned" });
      else
        res
          .status(400)
          .json({ status: false, message: "could not abandon slider" });
    } else {
      res.status(400).json({ status: "false", message: "game info incorrect" });
      return;
    }
  } catch (e) {
    console.error(e, "error");
    res.status(500).json({});
  }
};

const abandonSliderGame = async (_userAddress: string, _contestant: number) => {
  const isSliderRunning = await getIsSliderRunning(_userAddress, _contestant);

  if (isSliderRunning) {
    const abandonGamePromise = new Promise<void>(function (resolve, reject) {
      const abandonSliderGameQuery = `UPDATE 
          slider
        SET
          is_slider_running = 0, end_time = NULL, play_time = NULL,times_clicked = NULL
        WHERE
          user_address = ? AND contestant=? AND is_slider_running = 1`;

      connection.query(
        abandonSliderGameQuery,
        [_userAddress, _contestant],
        function (error, results, fields) {
          if (error) reject(error);
          resolve(results);
        }
      );
    });

    await abandonGamePromise;
    return true;
  } else {
    return false;
  }
};

const getAllSliderScoresFunc = async () => {
  const getSliderGameScorePromise = new Promise<
    [{ times_clicked: number; play_time: number }]
  >(function (resolve, reject) {
    const getAllScoressQuery = `
      SELECT 
        times_clicked, play_time, user_address, contestant
      FROM
        slider
      WHERE
        play_time IS NOT NULL`;

    connection.query(getAllScoressQuery, function (err, result) {
      if (err) {
        console.error(err, "getSliderScore err");
        reject(err);
      }
      if (result) {
        resolve(result);
      }
    });
  });

  const sliderGameScore = await getSliderGameScorePromise;
  return sliderGameScore;
};

const getTimesClicked = async (_contestant: number) => {
  const getSliderGameScorePromise = new Promise<[{ times_clicked: number }]>(
    function (resolve, reject) {
      const getSliderGameScoreQuery = `
      SELECT 
        times_clicked
      FROM
        slider
      WHERE
        contestant = ?
        `;

      connection.query(
        getSliderGameScoreQuery,
        [_contestant],
        function (err, result) {
          if (err) {
            console.error("getSliderScore err:", err);
            reject(err);
          }
          if (result) {
            resolve(result);
          }
        }
      );
    }
  );

  const sliderGameScore = await getSliderGameScorePromise;
  if (sliderGameScore.length) return sliderGameScore[0];
  else return;
};

const getSliderScoreForContestant = async (_contestant: number) => {
  const getSliderScorePromise = new Promise<
    [{ times_clicked: number; play_time: number }]
  >(function (resolve, reject) {
    const getSliderGameScoreQuery = `
      SELECT 
        times_clicked, play_time
      FROM
        slider
      WHERE
        contestant = ?`;

    connection.query(
      getSliderGameScoreQuery,
      [_contestant],
      function (err, result) {
        if (err) {
          console.error(err, "getSliderScoreForContestant err");
          reject(err);
        }
        if (result) {
          resolve(result);
        }
      }
    );
  });

  const sliderGameScore = await getSliderScorePromise;
  if (sliderGameScore.length) return sliderGameScore[0];
  else return;
};

const getSliderTimesClickedForRunningGames = async (
  _userAddress: string,
  _contestant: number
) => {
  const getSliderGameTimesClickedPromise = new Promise<
    [{ times_clicked: number }]
  >(function (resolve, reject) {
    const getSliderGameScoreQuery = `
      SELECT 
        times_clicked
      FROM
        slider
      WHERE
        user_address = ? AND contestant = ? AND is_slider_running = 1`;

    connection.query(
      getSliderGameScoreQuery,
      [_userAddress, _contestant],
      function (err, result) {
        if (err) {
          console.error(err, "getSlidertimesClicked err");
          reject(err);
        }
        if (result) {
          resolve(result);
        }
      }
    );
  });

  const sliderGameTimesClicked = await getSliderGameTimesClickedPromise;
  if (sliderGameTimesClicked.length) return sliderGameTimesClicked[0];
  else return;
};

const populateSliderGrid = async (slider_game_id: number) => {
  try {
    const generatedSliderPiecesArr = generateSliderGrid();
    let sliderGameGridValsArr: [number, number, number][] = [];

    for (let i = 0; i < generatedSliderPiecesArr.length; i++) {
      const sliderGameGridItem: [number, number, number] = [
        i,
        generatedSliderPiecesArr[i],
        slider_game_id,
      ];
      sliderGameGridValsArr[i] = sliderGameGridItem;
    }

    let populateSliderGridPromise = new Promise<number[]>(function (
      resolve,
      reject
    ) {
      const populateSliderGridQuery =
        "INSERT INTO slider_grid (slider_zone_number,slider_piece_number, slider_game_id) VALUES ?";

      connection.query(
        populateSliderGridQuery,
        [sliderGameGridValsArr],
        function (err, result) {
          if (err) {
            console.error(err, "error populating slider_grid");
            reject(err);
          } else {
            if (result) {
              const gridZonesArr: number[] = Array(16);
              for (let i = 0; i < 16; i++) {
                gridZonesArr[i] = generatedSliderPiecesArr[i];
              }
              resolve(gridZonesArr);
            }
          }
        }
      );
    });

    const insertedSliderArr = await populateSliderGridPromise;
    return insertedSliderArr;
  } catch (e) {
    console.error(e, "error populating slide grid");
    return false;
  }
};

// This function gets sliderPieces Arr from db,etc. for the game_id input and produces an arr where the index maps to it's position on the grid, and the value is the piece-value/piece number.
const getSliderZonesGrid = async (slider_game_id: number) => {
  const sliderPiecesArr = await getSliderPieces(slider_game_id);

  const sliderZonesGrid: number[] = Array(16);
  for (let i = 0; i < 16; i++) {
    sliderZonesGrid[sliderPiecesArr[i].slider_zone_number] =
      sliderPiecesArr[i].slider_piece_number;
  }

  return sliderZonesGrid;
};

const createSliderGameThenGetGameDetails = async (
  userAddress: string,
  contestant: number
) => {
  const sliderGameValue = {
    user_address: userAddress,
    contestant,
    is_slider_running: true,
    times_clicked: 0,
    start_time: Date.now(),
  };

  await createSliderTableIfNotExists();
  await createSliderGridTableIfNotExists();

  const createSliderGameQuery = "INSERT INTO slider SET ?";

  let getCreatedSliderGameIdPromise = new Promise<{
    sliderGrid: number[];
    sliderGameId: number;
  }>(async function (resolve, reject) {
    connection.query(
      createSliderGameQuery,
      sliderGameValue,
      async function (error, results, fields) {
        if (error) return reject(error);
        if (results) {
          const createdSliderGameId = results.insertId;
          const sliderGridArr = await populateSliderGrid(createdSliderGameId);

          // populateSliderGrid(createdSliderGameId).then((sliderGridArr) => {
          if (sliderGridArr === false) reject("error populating slider grid");
          else {
            resolve({
              sliderGrid: sliderGridArr,
              sliderGameId: results.insertId,
            });
          }
        }
      }
    );
  });

  let createdSliderGameDetails = await getCreatedSliderGameIdPromise;

  return createdSliderGameDetails;
};

const createSliderGridTableIfNotExists = async () => {
  let createSliderGridTablePromise = new Promise<void>(function (
    resolve,
    reject
  ) {
    const createSliderGridTableQuery = `CREATE TABLE IF NOT EXISTS slider_grid (
      slider_grid_piece_id INT AUTO_INCREMENT PRIMARY KEY,
      slider_piece_number INT NOT NULL,
      slider_zone_number INT NOT NULL,
      slider_game_id INT NOT NULL,
      FOREIGN KEY (slider_game_id) REFERENCES slider (slider_game_id)
      )`;

    connection.query(createSliderGridTableQuery, function (err, result) {
      if (err) {
        console.error(err, "error creating slider_grid table");
        reject(err);
      }
      if (result) {
        resolve(result);
      }
    });
  });
  await createSliderGridTablePromise;
};

const createSliderTableIfNotExists = async () => {
  const createSliderTableQuery = `CREATE TABLE IF NOT EXISTS slider (
      slider_game_id INT AUTO_INCREMENT PRIMARY KEY, 
      user_address VARCHAR(255) NOT NULL, 
      contestant INT NOT NULL,
      is_slider_running BOOLEAN,
      times_clicked INT,
      start_time BIGINT NOT NULL,
      end_time BIGINT,
      play_time BIGINT
          )`;

  connection.query(createSliderTableQuery, function (err, result) {
    if (err) {
      console.error(err, "error creating slider table");
      throw err;
    }
  });
};

async function moveTile(
  _userAddress: string,
  _contestant: number,
  tileIndex: number,
  slider_game_id: number
) {
  const { isSwapSuccessful, cannotSwap } = await swap(
    tileIndex,
    slider_game_id
  );
  if (isSwapSuccessful)
    await incrementSliderTimesClicked(_userAddress, _contestant);
  return { isSwapSuccessful, cannotSwap };
}

const incrementSliderTimesClicked = async (
  _userAddress: string,
  _contestant: number
) => {
  const incrementSliderTimesClickedPromise = new Promise<void>(function (
    resolve,
    reject
  ) {
    let incrementSliderTimesClickedQuery = `
      UPDATE
        slider
      SET
        times_clicked = times_clicked + 1
      WHERE
        user_address = ? AND contestant=?`;

    connection.query(
      incrementSliderTimesClickedQuery,
      [_userAddress, _contestant],
      function (error, results, fields) {
        if (error) reject(error);
        resolve(results);
      }
    );
  });

  await incrementSliderTimesClickedPromise;
};

const getIsSliderRunning = async (
  _userAddress: string,
  _contestant: number
) => {
  const getIsSliderRunningPromise = new Promise<
    [{ is_slider_running: boolean }]
  >(function (resolve, reject) {
    const getIsSliderRunningQuery = `
        SELECT 
          is_slider_running
        FROM
          slider
        WHERE
          user_address = ? AND contestant = ?
        `;

    connection.query(
      getIsSliderRunningQuery,
      [_userAddress, _contestant],
      function (error, results) {
        if (error) reject(error);
        if (results) resolve(results);
      }
    );
  });

  const isSliderRunningResult = await getIsSliderRunningPromise;
  const isSliderRunning = isSliderRunningResult[0].is_slider_running;
  return isSliderRunning;
};

function generateSliderGrid() {
  let sliderRandomGrid: number[] = generateRandom15Array();
  let isSolvedVar: boolean = isSolved(sliderRandomGrid);
  let isSolvableVar: boolean = isSolvable(sliderRandomGrid);

  while (isSolvedVar || !isSolvableVar) {
    sliderRandomGrid = generateRandom15Array();
    isSolvedVar = isSolved(sliderRandomGrid);
    isSolvableVar = isSolvable(sliderRandomGrid);
  }

  return sliderRandomGrid;
}

function generateRandom15Array(): number[] {
  // Create an array of integers from 0 to 14
  const arr = Array.from({ length: 15 }, (_, i) => i);

  // Shuffle the array using the Fisher-Yates shuffle algorithm
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }

  arr.push(15);

  return arr;
}

async function swap(tileIndex: number, slider_game_id: number) {
  const sliderPieces = await getSliderPieces(slider_game_id);

  const holePiece = sliderPieces.find(
    (piece_info) => piece_info.slider_piece_number === HOLE
  );

  const holeIndex = holePiece?.slider_zone_number;

  if (holeIndex !== undefined) {
    if (canSwap(tileIndex, holeIndex)) {
      const zonePosArr = await getSliderZonesGrid(slider_game_id);

      const newZonePosArr = swapInner(zonePosArr, tileIndex, holeIndex);

      const updateSliderZonesQuery = `
        UPDATE
          slider_grid
        SET
          slider_piece_number = ?
        WHERE
          slider_zone_number = ? AND slider_game_id = ?
        `;

      newZonePosArr.forEach((zone, i) => {
        connection.query(
          updateSliderZonesQuery,
          [zone, i, slider_game_id],
          function (error, results) {
            if (error) console.error(error, "error swapping slider gird piece");
            // if (results)
          }
        );
      });
      return { isSwapSuccessful: true };
    } else {
      return { isSwapSuccessful: false, cannotSwap: true };
    }
  } else {
    throw "error finding hole";
  }
}

function swapInner(numbers: number[], src: number, dest: number) {
  numbers = JSON.parse(JSON.stringify(numbers));
  [numbers[src], numbers[dest]] = [numbers[dest], numbers[src]];
  return numbers;
}

function canSwap(src: number, dest: number) {
  const { row: srcRow, col: srcCol } = getMatrixPosition(src);
  const { row: destRow, col: destCol } = getMatrixPosition(dest);
  return Math.abs(srcRow - destRow) + Math.abs(srcCol - destCol) === 1;
}

// Get the row/col pair from a linear index.
function getMatrixPosition(index: number) {
  return {
    row: Math.floor(index / DIMENSION),
    col: index % DIMENSION,
  };
}

function isSolved(numbers: number[]) {
  for (let i = 0, l = numbers.length; i < l; i++) {
    if (numbers[i] !== i) {
      return false;
    }
  }
  return true;
}

// Checks if the puzzle can be solved.
function isSolvable(numbers: number[]): boolean {
  let product = 1;
  const len = DIMENSION * DIMENSION - 1;
  for (let i = 1; i <= len; i++) {
    for (let j = i + 1, m = len + 1; j <= m; j++) {
      product *= (numbers[i - 1] - numbers[j - 1]) / (i - j);
    }
  }
  return Math.round(product) === 1;
}

async function getSliderPieces(slider_game_id: number) {
  let getSliderPiecesPromise = new Promise<
    { slider_piece_number: number; slider_zone_number: number }[]
  >(function (resolve, reject) {
    let getSliderPiecesQuery = `
  SELECT
    slider_piece_number, slider_zone_number
  FROM
    slider_grid 
  WHERE
    slider_game_id = ?`;

    connection.query(
      getSliderPiecesQuery,
      [slider_game_id],
      function (error, results) {
        if (error) reject(error);
        if (results) resolve(results);
      }
    );
  });

  const sliderPiecesResult = await getSliderPiecesPromise;
  return sliderPiecesResult;
}

const completeSliderThenGetPlayTime = async (
  _userAddress: string,
  _contestant: number
) => {
  try {
    const getSliderGameStartTimePromise = new Promise<[{ start_time: number }]>(
      function (resolve, reject) {
        const getStartTimeQuery =
          "SELECT start_time FROM slider WHERE user_address = ? AND contestant=?";

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

    const startTimeResponse = await getSliderGameStartTimePromise;

    const startTime = startTimeResponse[0].start_time;

    const endTime = Date.now();
    const playTime = endTime - startTime;

    const completeSliderGamePromise = new Promise<void>(function (
      resolve,
      reject
    ) {
      const completeGameQuery =
        "UPDATE slider SET is_slider_running = 0, end_time = ?, play_time =? WHERE user_address = ? AND contestant=?";

      connection.query(
        completeGameQuery,
        [endTime, playTime, _userAddress, _contestant],
        function (error, results, fields) {
          if (error) reject(error);
          resolve(results);
        }
      );
    });

    const userClickIdentifier = `${_userAddress}-${_contestant}`;
    await completeSliderGamePromise;
    clearTimers(userClickIdentifier);
    return { gameCompleted: true, playTime };
  } catch (e) {
    console.error(e, "error ending slider");
    return { gameCompleted: false };
  }
};

const setUserSliderTimeOutTimers = async (
  gameTotalTimeInSeconds: number,
  _userAddress: string,
  _contestant: number
) => {
  const gameTotalTime = gameTotalTimeInSeconds * 1000;

  const totalTetrisTimer = setTimeout(() => {
    abandonSliderGame(_userAddress, _contestant);
  }, gameTotalTime);

  const userClickIdentifier = `${_userAddress}-${_contestant}`;

  sliderTotalGameTimerMap.set(userClickIdentifier, totalTetrisTimer);
};

const clearTimers = (_userClickIdentifier: string) => {
  const sliderTotalGameTimer = getUserTimers(_userClickIdentifier);

  clearTimeout(sliderTotalGameTimer);

  sliderTotalGameTimerMap.delete(_userClickIdentifier);
};

const getUserTimers = (_userClickIdentifier: string) => {
  const sliderTotalGameTimer =
    sliderTotalGameTimerMap.get(_userClickIdentifier);

  return sliderTotalGameTimer;
};

const sliderTotalGameTimerMap = new Map<string, NodeJS.Timeout>();

const DIMENSION: dimensionType = 4;
const HOLE = 15;

const SLIDER_GAME_TIME_SECONDS = env_Vars.Game.SLIDER_GAMETIME_SECONDS;

type dimensionType = 4;
