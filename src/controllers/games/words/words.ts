import { NextFunction, Request, Response } from "express";
import { connection } from "../../../database/database";

export const handleStartPairs = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const contestant = req.body.contestant;
    const userAddress = req.body.userAddress;

    const pairsGameScore = await getPairsTimesClicked(contestant);

    if (pairsGameScore) {
      res
        .status(400)
        .json({ status: false, message: "contestant already played pairs" });
      return;
    }

    const startPairsResult = await startPairs(userAddress, contestant);
    if (startPairsResult.status) {
      res.status(200).json(startPairsResult);
    } else {
      res.status(400).json({ startPairsResult });
    }
  } catch (e) {
    res.status(500).json({ status: false, error: true });
  }
};

const startPairs = async (_userAddress: string, _contestant: number) => {
  try {
    createPairsTableIfNotExists();

    const createdPairsGameId = await createPairsGame(_userAddress, _contestant);
    if (createdPairsGameId !== undefined && createdPairsGameId !== null) {
      return { status: true, createdPairsGameId };
    } else throw "createdGameIdNullish";
  } catch (e) {
    console.log(e, "error starting pairs");
    return { status: false, error: e };
  }
};

export const handleClickZone = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const zoneClicked = req.body.zoneClicked;
    const userPairsGameId = req.body.userPairsGameId;

    const userAddress = req.body.userAddress;
    const contestant = req.body.contestant;

    const userClickIdentifier = `${userAddress}-${contestant}`;

    const isUserClickProcessing =
      isUserClickProcessingMap.get(userClickIdentifier);
    if (isUserClickProcessing) {
      res.status(400).json({
        status: false,
        message: "already processing click",
      });
      return;
    }

    const pairsRunningDetails = await getPairsRunningDetails(
      userAddress,
      contestant
    );

    if (!pairsRunningDetails) {
      isUserClickProcessingMap.set(userClickIdentifier, false);
      res.status(400).json({ status: false, message: "no game in progress" });
      return;
    }

    const { last_zone_clicked, times_clicked } = pairsRunningDetails;

    isUserClickProcessingMap.set(userClickIdentifier, true);

    const numberOfCardsCurrentlyRevealed = await getCardsCurrentlyRevealed(
      userAddress,
      contestant
    );

    if (
      numberOfCardsCurrentlyRevealed === 1 &&
      last_zone_clicked === zoneClicked
    ) {
      res.status(400).json({
        status: false,
        message: "zone clicked same as last zone clicked",
      });
      isUserClickProcessingMap.set(userClickIdentifier, false);
      return;
    } else {
      const clickedZoneDetails = await getZoneClickObj(
        userPairsGameId,
        zoneClicked
      );

      if (!clickedZoneDetails) {
        throw "clickedZoneDetails undefined- game doesn't exist";
      }

      if (clickedZoneDetails && clickedZoneDetails.is_grid_zone_paired) {
        res
          .status(400)
          .json({ status: "false", message: "zone already paired" });
        isUserClickProcessingMap.set(userClickIdentifier, false);
        return;
      } else {
        const clickedCardPairNumber = clickedZoneDetails.grid_pair_number;

        updateLastZoneClicked(zoneClicked, userAddress, contestant);

        incrementTimesClicked(userAddress, contestant);

        const lastCardPairNumber = await getLastCardPairNumber(
          userAddress,
          contestant
        );

        if (!lastCardPairNumber)
          throw `lastCardPairNumber not found for ${userAddress},${contestant}`;

        if (numberOfCardsCurrentlyRevealed === 1) {
          handleClickWhenOneCardRevealed(
            lastCardPairNumber,
            clickedCardPairNumber,
            userAddress,
            contestant,
            userPairsGameId,
            userClickIdentifier,
            times_clicked,
            last_zone_clicked,
            numberOfCardsCurrentlyRevealed,
            res
          );
        }

        if (numberOfCardsCurrentlyRevealed === 0) {
          handleClickWhenNoCardRevealed(
            userAddress,
            contestant,
            clickedCardPairNumber,
            times_clicked,
            userClickIdentifier,
            res
          );
        }
      }
    }
  } catch (e) {
    console.log(e, "error getting clicked card");
    res.status(500).json({ error: e });
  }
};

export const getPairsScoreEndpoint = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const contestant = req.query.contestant;

    if (contestant !== undefined && contestant !== null) {
      const pairsGameScore = await getPairsTimesClicked(Number(contestant));

      if (!pairsGameScore) {
        res.status(400).json({
          timesClicked: null,
          message: "no pairs game found for contestant",
        });
        return;
      }
      res.status(200).json({ score: pairsGameScore.times_clicked });
    }
  } catch (e) {
    console.log(e, "error");
    res.status(500).json({ message: "something went wrong" });
  }
};

// this has an auth middleware on it to prevent anyone but the owner from calling it
export const abandonGameEndpoint = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userAddress = req.body.userAddress;
    const contestant = req.body.contestant;

    if (!userAddress || contestant === undefined || contestant === null) {
      res.status(400).json({ message: "user details missing" });
      return;
    }

    const isPairsRunning = await getPairsRunningDetails(
      userAddress,
      contestant
    );

    if (!isPairsRunning) {
      res.status(400).json({ message: "game not running" });
      return;
    }

    const abandonGameSuccess = await abandonPairsGame(userAddress, contestant);

    if (abandonGameSuccess)
      res.status(200).json({ status: true, message: "pairs abandoned" });
    else
      res
        .status(400)
        .json({ status: false, message: "could not abandon pairs" });
  } catch (e) {
    console.log(e, "error");
    res.status(500).json({});
  }
};

const getPairsTimesClicked = async (_contestant: number) => {
  const getPairsGameScorePromise = new Promise<[{ times_clicked: number }]>(
    function (resolve, reject) {
      const getPairsGameScoreQuery = `
    SELECT
      times_clicked
    FROM
      pairs
    WHERE
      contestant = ?
      `;

      connection.query(
        getPairsGameScoreQuery,
        [_contestant],
        function (err, result) {
          if (err) {
            console.log("getPairsGameScore err:", err);
            reject(err);
          }
          if (result) {
            resolve(result);
          }
        }
      );
    }
  );

  const pairsGameScore = await getPairsGameScorePromise;
  if (pairsGameScore.length) return pairsGameScore[0];
  else return;
};

const createPairsTableIfNotExists = () => {
  const createPairsTableQuery = `CREATE TABLE IF NOT EXISTS pairs (
    pairs_game_id INT AUTO_INCREMENT PRIMARY KEY, 
    user_address VARCHAR(255) NOT NULL, 
    contestant INT NOT NULL,
    is_pairs_running BOOLEAN,
    times_clicked INT,
    start_time BIGINT NOT NULL,
    end_time BIGINT,
    play_time BIGINT,
    pairs_completed INT,
    last_zone_clicked INT,
    cards_currently_revealed INT,
    last_card_pair_number_revealed INT
        )`;

  connection.query(createPairsTableQuery, function (err, result) {
    if (err) {
      console.log(err, "error creating pairs table");
    }
  });
};

const createPairsGridTableIfNotExists = async () => {
  let createPairsGridTablePromise = new Promise<void>(function (
    resolve,
    reject
  ) {
    const createPairsGridTableQuery = `CREATE TABLE IF NOT EXISTS pairs_grid (
    pairs_grid_id INT AUTO_INCREMENT PRIMARY KEY,
    grid_zone_number INT NOT NULL,
    is_grid_zone_paired BOOLEAN NOT NULL DEFAULT FALSE,
    grid_pair_number INT NOT NULL, 
    pairs_game_id INT NOT NULL,
    FOREIGN KEY (pairs_game_id) REFERENCES pairs (pairs_game_id)
    )`;

    connection.query(createPairsGridTableQuery, function (err, result) {
      if (err) {
        console.log(err, "error creating pairs_grid table");
        reject(err);
      }
      if (result) {
      }
      console.log(result, "pairs_grid table Created");
      resolve(result);
    });
  });
  await createPairsGridTablePromise;
};

const populatePairsGrid = async (pairs_game_id: number) => {
  const generatedPairs = generateRandomPairs();
  let pairsGameGridValsArr: [number, number, number][] = [];

  for (let i = 0; i < generatedPairs.length; i++) {
    const gameGridItem: [number, number, number] = [
      i,
      generatedPairs[i],
      pairs_game_id,
    ];
    pairsGameGridValsArr[i] = gameGridItem;
  }

  const populatePairsGridQuery =
    "INSERT INTO pairs_grid (grid_zone_number, grid_pair_number, pairs_game_id) VALUES ?";

  connection.query(
    populatePairsGridQuery,
    [pairsGameGridValsArr],
    function (err, result) {
      if (err) {
        console.log(err, "error populating pairs grid");
      } else {
        // console.log(result, "result populating pairs grid");
      }
    }
  );
};

const createPairsGame = async (userAddress: string, contestant: number) => {
  const pairsGameValue = {
    userAddress,
    contestant,
    isPairsRunning: true,
    timesClicked: 0,
    pairsCompleted: 0,
    cardsCurrentlyRevealed: 0,
    startTime: Date.now(),
  };

  await createPairsGridTableIfNotExists();

  const createPairsGameQuery = "INSERT INTO pairs SET ?";

  let getCreatedPairsGameIdPromise = new Promise<number>(function (
    resolve,
    reject
  ) {
    connection.query(
      createPairsGameQuery,
      pairsGameValue,
      function (error, results, fields) {
        if (error) return reject(error);
        if (results) {
          const createdPairsGameId = results.insertId;
          populatePairsGrid(createdPairsGameId);
          resolve(results.insertId);
        }
      }
    );
  });

  let createdPairsGameId = await getCreatedPairsGameIdPromise;
  return createdPairsGameId;
};

const generateRandomPairs = () => {
  const pairsArr = [
    1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10,
  ];

  let pairs: number[] = [];

  for (let i = 0; i < 20; i++) {
    let nextRandomCardArr = pairsArr.splice(
      Math.floor(pairsArr.length * Math.random()),
      1
    );
    pairs.push(nextRandomCardArr[0]);
  }

  return pairs;
};

const updateLastZoneClicked = async (
  _zoneClicked: number,
  _userAddress: string,
  _contestant: number
) => {
  const updateLastClickedPromise = new Promise(function (resolve, reject) {
    let updateLastClickedQuery =
      "UPDATE pairs SET lastZoneClicked = ? WHERE userAddress = ? AND contestant=?";

    connection.query(
      updateLastClickedQuery,
      [_zoneClicked, _userAddress, _contestant],
      function (error, results, fields) {
        if (error) reject(error);
        resolve(results);
      }
    );
  });

  await updateLastClickedPromise;
};

const getLastCardPairNumber = async (
  _userAddress: number,
  _contestant: number
) => {
  const getLastCardPairNumberPromise = new Promise<
    [{ last_card_pair_number_revealed: number }]
  >(function (resolve, reject) {
    let getLastCardPairNumberQuery = `
      SELECT
        last_card_pair_number_revealed
      FROM
        pairs
      WHERE
        user_address = ? AND contestant = ?
      `;

    connection.query(
      getLastCardPairNumberQuery,
      [_userAddress, _contestant],
      function (error, results, fields) {
        if (error) reject(error);
        resolve(results);
      }
    );
  });

  const getLastCardPairNumberResponse = await getLastCardPairNumberPromise;

  if (!getLastCardPairNumberResponse.length) return;

  const lastCardPairNumber =
    getLastCardPairNumberResponse[0].last_card_pair_number_revealed;

  return lastCardPairNumber;
};

const updateLastPairNumberRevealed = async (
  _cardPairNumber: number | null,
  _userAddress: string,
  _contestant: number
) => {
  const updateLastCardPairRevealedPromise = new Promise(function (
    resolve,
    reject
  ) {
    let updateLastCardPairRevealedQuery =
      "UPDATE pairs SET lastCardPairNumberRevealed = ? WHERE userAddress = ? AND contestant=?";

    connection.query(
      updateLastCardPairRevealedQuery,
      [_cardPairNumber, _userAddress, _contestant],
      function (error, results, fields) {
        if (error) reject(error);
        resolve(results);
      }
    );
  });

  await updateLastCardPairRevealedPromise;
};

const getPairsRunningDetails = async (
  _userAddress: string,
  _contestant: number
) => {
  const getPairsStatusPromise = new Promise<
    [
      {
        last_zone_clicked: number;
        is_pairs_running: boolean;
        times_clicked: number;
      }
    ]
  >(function (resolve, reject) {
    let getPairsStatusQuery = `
      SELECT
        last_zone_clicked,is_pairs_running, times_clicked
      from
        pairs
      WHERE
        user_address = ? AND contestant=?
      `;

    connection.query(
      getPairsStatusQuery,
      [_userAddress, _contestant],
      function (error, results, fields) {
        if (error) reject(error);
        resolve(results);
      }
    );
  });

  const getPairStatusResponse = await getPairsStatusPromise;

  if (!getPairStatusResponse.length) return;

  return getPairStatusResponse[0];
};

const incrementTimesClicked = async (
  _userAddress: string,
  _contestant: number
) => {
  const incrementTimesClickedPromise = new Promise(function (resolve, reject) {
    let incrementTimesClickedQuery =
      "UPDATE pairs SET timesClicked = timesClicked + 1 WHERE userAddress = ? AND contestant=?";

    connection.query(
      incrementTimesClickedQuery,
      [_userAddress, _contestant],
      function (error, results, fields) {
        if (error) reject(error);
        resolve(results);
      }
    );
  });

  await incrementTimesClickedPromise;
};

const getZoneClickObj = async (
  _userPairsGameId: number,
  _zoneClicked: number
) => {
  const getZoneClickedObjectPromise = new Promise<
    [{ grid_pair_number: number; is_grid_zone_paired: boolean }]
  >(function (resolve, reject) {
    let getCardAtZoneClickedQuery = `
      SELECT
        grid_pair_number,is_grid_zone_paired
      FROM
        pairs_grid
      WHERE
        pairs_game_id = ? AND grid_zone_number = ?
      `;

    connection.query(
      getCardAtZoneClickedQuery,
      [_userPairsGameId, _zoneClicked],
      function (error, results, fields) {
        if (error) reject(error);
        resolve(results);
      }
    );
  });

  const getZoneClickedObjectResponse = await getZoneClickedObjectPromise;

  if (!getZoneClickedObjectResponse.length) return;

  const clickedResponseObj = getZoneClickedObjectResponse[0];

  return clickedResponseObj;
};

const incrementPairsCompleted = async (
  _userAddress: string,
  _contestant: number,
  _userPairsGameId: number
) => {
  const incrementPairsCompletedPromise = new Promise(function (
    resolve,
    reject
  ) {
    let incrementPairsCompletedQuery =
      "UPDATE pairs,pairs_grid SET pairs.pairsCompleted = pairs.pairsCompleted + 1 WHERE pairs.userAddress = ? AND pairs.contestant=? AND pairs_grid.pairs_game_id = ?";

    connection.query(
      incrementPairsCompletedQuery,
      [_userAddress, _contestant, _userPairsGameId],
      function (error, results, fields) {
        if (error) reject(error);
        resolve(results);
      }
    );
  });

  await incrementPairsCompletedPromise;
};

const getPairsCompleted = async (_userAddress: string, _contestant: number) => {
  const getPairsCompletedPromise = new Promise<[{ pairs_completed: number }]>(
    function (resolve, reject) {
      let getPairsCompletedQuery = `
        SELECT
          pairs_completed
        FROM
          pairs
        WHERE
          user_address = ? AND contestant=?`;

      connection.query(
        getPairsCompletedQuery,
        [_userAddress, _contestant],
        function (error, results, fields) {
          if (error) reject(error);
          resolve(results);
        }
      );
    }
  );

  const getPairsCompletedResponse = await getPairsCompletedPromise;
  if (!getPairsCompletedResponse) return;
  console.log(
    getPairsCompletedResponse[0].pairs_completed,
    "getPairsCompletedResponse"
  );
  return getPairsCompletedResponse[0].pairs_completed;
};

const getCardsCurrentlyRevealed = async (
  _userAddress: string,
  _contestant: number
) => {
  const getCardsCurrentlyRevealedPromise = new Promise<
    [{ cards_currently_revealed: number }]
  >(function (resolve, reject) {
    const getCardsRevealedQuery = `
      SELECT 
        cards_currently_revealed
      FROM
        pairs
      WHERE
        user_address = ? AND contestant=?`;

    connection.query(
      getCardsRevealedQuery,
      [_userAddress, _contestant],
      function (error, results, fields) {
        if (error) reject(error);
        resolve(results);
      }
    );
  });

  const cardsCurrentlyRevealedResponse = await getCardsCurrentlyRevealedPromise;
  if (cardsCurrentlyRevealedResponse.length) return;

  const cardsCurrentlyRevealed =
    cardsCurrentlyRevealedResponse[0].cards_currently_revealed;
  return cardsCurrentlyRevealed;
};

const incrementCardsRevealed = async (
  _userAddress: string,
  _contestant: number
) => {
  const incrementCardsCurrentlyRevealedPromise = new Promise<[any]>(function (
    resolve,
    reject
  ) {
    const incrementCardRevealedQuery =
      "UPDATE pairs SET cardsCurrentlyRevealed = cardsCurrentlyRevealed + 1 WHERE userAddress = ? AND contestant=?";

    connection.query(
      incrementCardRevealedQuery,
      [_userAddress, _contestant],
      function (error, results, fields) {
        if (error) reject(error);
        resolve(results);
      }
    );
  });

  await incrementCardsCurrentlyRevealedPromise;
};

const resetNumberOfCardsRevealed = async (
  _userAddress: string,
  _contestant: number
) => {
  const resetCardsRevealedPromise = new Promise<void>(function (
    resolve,
    reject
  ) {
    const resetCardsRevealedQuery =
      "UPDATE pairs SET cardsCurrentlyRevealed = 0 WHERE userAddress = ? AND contestant=?";

    connection.query(
      resetCardsRevealedQuery,
      [_userAddress, _contestant],
      function (error, results, fields) {
        if (error) reject(error);
        resolve(results);
      }
    );
  });

  await resetCardsRevealedPromise;
};

const completePairsThenGetPlayTime = async (
  _userAddress: string,
  _contestant: number,
  _userClickIdentifier: string
) => {
  const getGameStartTimePromise = new Promise<[{ start_time: number }]>(
    function (resolve, reject) {
      const getStartTimeQuery = `
        SELECT
          start_time
        FROM pairs
          WHERE
        user_address = ? AND contestant=?
        `;

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

  const startTimeResponse = await getGameStartTimePromise;
  if (!startTimeResponse.length) throw "Game start time not found";

  const startTime = startTimeResponse[0].start_time;

  const endTime = Date.now();
  const playTime = endTime - startTime;

  const completeGamePromise = new Promise<void>(function (resolve, reject) {
    const completeGameQuery = `
      UPDATE 
        pairs
      SET
        is_pairs_running = false, end_time =?, play_time =?
      WHERE
        user_address = ? AND contestant=?
      `;

    connection.query(
      completeGameQuery,
      [endTime, playTime, _userAddress, _contestant],
      function (error, results, fields) {
        if (error) reject(error);
        resolve(results);
      }
    );
  });

  await completeGamePromise;
  isUserClickProcessingMap.delete(_userClickIdentifier);
  return playTime;
};

const abandonPairsGame = async (_userAddress: string, _contestant: number) => {
  console.log(
    `attempting abandon game,userAddress:${_userAddress},contestant:${_contestant}`
  );

  try {
    const abandonGamePromise = new Promise<void>(function (resolve, reject) {
      const abandoneGameQuery = `
        UPDATE
          pairs
        SET 
          is_pairs_running = 0, end_time = NULL, play_time = NULL,times_clicked = NULL
        WHERE
        user_address = ? AND contestant=?
        `;

      connection.query(
        abandoneGameQuery,
        [_userAddress, _contestant],
        function (error, results, fields) {
          if (error) reject(error);
          resolve(results);
        }
      );
    });

    await abandonGamePromise;
    const userClickIdentifier = `${_userAddress}-${_contestant}`;
    isUserClickProcessingMap.delete(userClickIdentifier);
    return true;
  } catch (e) {
    console.error("error abandoning game:", e);
    throw "e";
  }
};

const handleClickWhenOneCardRevealed = async (
  lastCardPairNumber: number,
  clickedCardPairNumber: number,
  userAddress: string,
  contestant: number,
  userPairsGameId: number,
  userClickIdentifier: string,
  timesClicked: number,
  lastZoneClicked: number,
  numberOfCardsCurrentlyRevealed: number,
  res: Response
) => {
  interface pairMadeResponseI {
    cardPairNumber: number;
    timesClicked: number;
    isGameComplete: boolean;
    cardsRevealed: 0;
    lastZoneClicked: number;
    isPairMade?: boolean;
    playTime?: number;
  }

  const responseObject: pairMadeResponseI = {
    cardPairNumber: clickedCardPairNumber,
    timesClicked,
    isGameComplete: false,
    cardsRevealed: 0,
    lastZoneClicked: lastZoneClicked,
  };

  if (lastCardPairNumber === clickedCardPairNumber) {
    await incrementPairsCompleted(userAddress, contestant, userPairsGameId);
    responseObject.isPairMade = true;
    const pairsCompleted = await getPairsCompleted(userAddress, contestant);
    if (pairsCompleted === 10) {
      let playTime = await completePairsThenGetPlayTime(
        userAddress,
        contestant,
        userClickIdentifier
      );
      responseObject.playTime = playTime;
      responseObject.isGameComplete = true;
    }
  }
  updateLastPairNumberRevealed(null, userAddress, contestant);
  await resetNumberOfCardsRevealed(userAddress, contestant);

  let waitTime;
  if (numberOfCardsCurrentlyRevealed === 0) {
    waitTime = 100;
  } else {
    waitTime = 1500;
  }

  setTimeout(() => {
    isUserClickProcessingMap.set(userClickIdentifier, false);
  }, waitTime);
  res.status(200).json(responseObject);
};

const handleClickWhenNoCardRevealed = async (
  userAddress: string,
  contestant: number,
  clickedCardPairNumber: number,
  timesClicked: number,
  userClickIdentifier: string,
  res: Response
) => {
  await incrementCardsRevealed(userAddress, contestant);

  updateLastPairNumberRevealed(clickedCardPairNumber, userAddress, contestant);
  res.status(200).json({
    cardPairNumber: clickedCardPairNumber,
    timesClicked,
    isGameComplete: false,
    cardsRevealed: 1,
  });
  isUserClickProcessingMap.set(userClickIdentifier, false);
};

const isUserClickProcessingMap = new Map<string, boolean>();
