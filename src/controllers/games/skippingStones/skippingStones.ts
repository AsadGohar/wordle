import { NextFunction, Request, Response } from "express";
import { connection } from "../../../database/database";

const getCreateSkippingStonesTablesPromise = async () => {
  let createSkippingStonesTablesPromise = new Promise<void>(function (
    resolve,
    reject
  ) {
    const createSkippingStonesTableQuery = `CREATE TABLE IF NOT EXISTS skipping_stones (
      skipping_stones_game_id INT AUTO_INCREMENT PRIMARY KEY, 
      user_address VARCHAR(255) NOT NULL, 
      contestant INT NOT NULL,
      is_skipping_stones_running BOOLEAN NOT NULL, 
      score INT NOT NULL,
      did_pass BOOLEAN
    )`;

    connection.query(
      createSkippingStonesTableQuery,
      async function (err, result) {
        if (err) {
          console.error(err, "error creating skipping_stones table");
          reject(err);
        } else if (result) {
          await getCreateSkippingStonesCardsTablesPromise();
          resolve();
        }
      }
    );
  });
  return createSkippingStonesTablesPromise;

  function getCreateSkippingStonesCardsTablesPromise() {
    let createSkippingStonesCardsTablesPromise = new Promise<void>(function (
      resolve,
      reject
    ) {
      const createSkippingStonesTableQuery = `CREATE TABLE IF NOT EXISTS skipping_stones_cards (
        skipping_stones_card_id INT AUTO_INCREMENT PRIMARY KEY,
        card_number INT NOT NULL,
        skipping_stones_game_id INT NOT NULL,
        FOREIGN KEY (skipping_stones_game_id) REFERENCES skipping_stones (skipping_stones_game_id)
        )`;
      connection.query(createSkippingStonesTableQuery, function (err, result) {
        if (err) {
          console.error(err, "error creating skipping_stones_cards table");
          reject(err);
        }
        if (result) {
          resolve();
        }
      });
    });
    return createSkippingStonesCardsTablesPromise;
  }
};

//Card numbering:   1 = A Spades
//                  2 = A Clubs
//                  3 = A Hearts
//                  4 = A Diamonds
//                  5 = 2 Spades
//                  6 = 2 Clubs ....
//                  52= K Diamonds

function getRandomInt(min: number, max: number) {
  //random num generator (inclusive)
  var num = Math.floor(Math.random() * (max - min + 1)) + min;
  return num;
}

async function getAddCardPromise(insertedId: number) {
  const shownCards = await getSkippingStoneCardValsPromise(insertedId);

  const addCardPromise = new Promise<{ card_number: number }[]>(function (
    resolve,
    reject
  ) {
    // "SELECT * FROM skipping_stones_cards WHERE user_address = ? AND contestant = ?";

    let newRandomNumber = getNewRandomCardNumber(shownCards);
    const addCardQuery = `INSERT INTO skipping_stones_cards SET ?`;

    const newCardObject = {
      card_number: newRandomNumber,
      skipping_stones_game_id: insertedId,
    };

    connection.query(
      addCardQuery,
      newCardObject,
      (error: unknown, results: unknown, fields: unknown) => {
        if (results) {
          //successfully added newRandomNumber, so can push newRandomNumber into shownCards and return it alright
          shownCards.push({ card_number: newRandomNumber });
          resolve(shownCards);
        } else if (error) {
          console.error(error, "error creating new skipping stones");
          reject(error);
        }
      }
    );
  });
  return addCardPromise;
}

function getSkippingStoneCardValsPromise(insertedId: number) {
  const getCardsPromise = new Promise<{ card_number: number }[]>(function (
    resolve,
    reject
  ) {
    const getCardValsQuery = `
  SELECT
    card_number
  FROM
    skipping_stones_cards
  WHERE
    skipping_stones_game_id = ?
    `;

    connection.query(getCardValsQuery, [insertedId], function (err, result) {
      if (err) {
        reject(err);
      }
      if (result) {
        resolve(result);
      }
    });
  });
  return getCardsPromise;
}

export const getSkippingStonesScoreEndpoint = async (
  req: Request,
  res: Response
) => {
  try {
    await getCreateSkippingStonesTablesPromise();

    const contestant = req.query.contestant;

    if (contestant === undefined || contestant === null) {
      res.status(400).json({ message: "user details missing" });
      return;
    }

    const skippingStonesScore = await getScoreByContestant(Number(contestant));

    if (!skippingStonesScore) {
      res.status(400).json({ message: "game not found for user-contestant" });
      return;
    }

    const score = skippingStonesScore.score;
    res.status(200).json({ score });
  } catch (e) {
    console.error(e, "error");
    res.status(500).json({});
  }
};

function getScoreByContestant(_contestant: number) {
  const getScorePromise = new Promise<{ score: number } | undefined>(function (
    resolve,
    reject
  ) {
    const getScoreQuery = `
  SELECT
    score
  FROM
    skipping_stones
  WHERE
    contestant = ?
  `;
    connection.query(getScoreQuery, [_contestant], function (err, result) {
      if (err) {
        reject(err);
      }
      if (result.length) {
        resolve({ score: result[0].score });
      } else resolve(undefined);
    });
  });
  return getScorePromise;
}

function getScoreByGameId(gameId: number) {
  const getScorePromise = new Promise<number>(function (resolve, reject) {
    const getScoreQuery = `
  SELECT
    score, did_pass
  FROM
    skipping_stones
  WHERE
    skipping_stones_game_id = ?
    `;

    connection.query(getScoreQuery, [gameId], function (err, result) {
      if (err) {
        reject(err);
      }
      if (result) {
        resolve(result[0].score);
      }
    });
  });
  return getScorePromise;
}

async function makeGuess(
  gameId: number,
  userDetails: userDetailsI,
  guess?: "higher"
) {
  try {
    const shownCards = await getSkippingStoneCardValsPromise(gameId);
    const { userAddress, contestant } = userDetails;

    let prevCard = Math.floor(
      (shownCards[shownCards.length - 1].card_number - 1) / 4
    );

    const updatedShownCards = await getAddCardPromise(gameId);

    let isGuessSuccess: boolean;

    let newCard = Math.floor(
      (updatedShownCards[updatedShownCards.length - 1].card_number - 1) / 4
    );

    if (newCard * prevCard === 0) {
      //Ace
      await incrementScore(userAddress, contestant);
      isGuessSuccess = true;
    } else {
      if (guess == "higher") {
        if (prevCard <= newCard) {
          await incrementScore(userAddress, contestant);
          isGuessSuccess = true;
        } else {
          isGuessSuccess = false;
        }
      } else if (prevCard >= newCard) {
        await incrementScore(userAddress, contestant);
        isGuessSuccess = true;
      } else {
        isGuessSuccess = false;
      }
    }
    const makeGuessResults = {
      updatedShownCards,
      isGuessSuccess,
    };

    return makeGuessResults;
  } catch (e) {
    console.error(e, "makeGuess error");
  }
}

const incrementScore = async (_userAddress: string, _contestant: number) => {
  const incrementScorePromise = new Promise<void>(function (resolve, reject) {
    let incrementScoreQuery = `
      UPDATE
        skipping_stones
      SET
        score = score + 1
      WHERE
        user_address = ? AND contestant = ?`;

    connection.query(
      incrementScoreQuery,
      [_userAddress, _contestant],
      function (error, results, fields) {
        if (error) reject(error);
        resolve(results);
      }
    );
  });

  await incrementScorePromise;
};

async function markGameFailed(gameId: number) {
  const gameSuccessQuery = `
  UPDATE
    skipping_stones
  SET
    did_pass = false
  WHERE
  skipping_stones_game_id = ?`;

  connection.query(gameSuccessQuery, [gameId], (error, results, fields) => {
    if (error) throw error;
  });
}

async function markGameAsSuccess(gameId: number) {
  const gameSuccessQuery = `
          update skipping_stones SET did_pass = true WHERE skipping_stones_game_id = ?`;

  connection.query(gameSuccessQuery, [gameId], (error, results, fields) => {
    if (error) throw error;
  });
}

async function getDidUserPassGame(gameId: number) {
  const score = await getScoreByGameId(gameId);
  if (score === WINNING_SCORE) {
    return true;
  } else {
    return false;
  }
}

async function getIsGameDone(shownCards: { card_number: number }[]) {
  if (shownCards.length === 6) {
    return true;
  } else {
    return false;
  }
}

export async function startSkippingStones(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const contestant: string = req.body.contestant;
    const userAddress: string = req.body.userAddress;

    const createSkippingStonesTablesPromise =
      getCreateSkippingStonesTablesPromise();

    await createSkippingStonesTablesPromise;

    const getSkippingStonesGameQuery = `
    SELECT
      *
    FROM
      skipping_stones
    WHERE
      user_address = ? AND 
      contestant = ?
      `;

    connection.query(
      getSkippingStonesGameQuery,
      [userAddress, contestant],
      function (err, result: any[]) {
        if (err) {
          console.error(err, "error getting previous skipping stones games");
          res.status(500).json({ error: err });
          return;
        } else {
          if (result) {
            const areNoGamesByUserContestant = !result.length;
            if (areNoGamesByUserContestant) {
              const newSkippingStoneGameObj = {
                user_address: userAddress,
                contestant: contestant,
                is_skipping_stones_running: 1,
                score: 0,
              };

              // const createNewSkippingStoneQuery = `INSERT INTO skipping_stones (user_address, contestant, is_skipping_stones_running, did_pass) VALUES ?`;
              const createNewSkippingStoneQuery = `INSERT INTO skipping_stones SET ?`;

              connection.query(
                createNewSkippingStoneQuery,
                newSkippingStoneGameObj,
                async (error, results, fields) => {
                  if (results) {
                    const insertedId = results.insertId;
                    const addCardResult = await getAddCardPromise(insertedId);

                    if (Array.isArray(addCardResult)) {
                      const lastCard =
                        addCardResult[addCardResult.length - 1].card_number;
                      res.status(200).json({ insertedId, lastCard });
                    } else throw "addding card errored";
                  } else if (error) {
                    console.error(error, "error creating new skipping stones");
                    res.status(400).json({ error });
                  }
                }
              );
            }
          }
          return;
        }
      }
    );
  } catch (e) {
    console.error(e, "error startSkippingStones");
    res.status(500).json({ e: startSkippingStones });
  }
}

export async function guess(req: Request, res: Response, next: NextFunction) {
  try {
    const contestant: number = req.body.contestant;
    const userAddress: string = req.body.userAddress;
    const gameId: number = req.body.gameId;

    const isNotRunning = !(await getIsRunning(gameId));

    if (isNotRunning) {
      res.status(400).json({ message: "game not running" });
      return;
    }

    const userDetails = {
      contestant,
      userAddress,
    };

    const guess: string = req.body.guess;

    let guessFuncVal: "higher" | undefined;
    if (guess === "higher") guessFuncVal = guess;

    const makeGuessResults = await makeGuess(gameId, userDetails, guessFuncVal);

    if (makeGuessResults) {
      const { updatedShownCards, isGuessSuccess } = makeGuessResults;

      const lastCard = updatedShownCards[updatedShownCards?.length - 1];

      const isGameDone = await getIsGameDone(updatedShownCards);

      const guessResponseObject: guessResponseObjectI = {
        isGuessSuccess,
        lastCard,
        isGameDone,
      };

      if (isGameDone) {
        const didUserPassGame = await getDidUserPassGame(gameId);
        if (didUserPassGame) {
          await markGameAsSuccess(gameId);
          guessResponseObject.didUserPass = true;
          res.status(200).json(guessResponseObject);
        } else {
          await markGameFailed(gameId);
          guessResponseObject.didUserPass = false;
          res.status(200).json(guessResponseObject);
        }
        endSkippingStones(gameId);
      } else {
        res.status(200).json(guessResponseObject);
      }

      return;
    }
  } catch (e) {
    console.error(e, "guess error");
    res.status(500).json({ error: "error guessing" });
  }
}

const endSkippingStones = async (gameId: number) => {
  // Update the column
  const endSkippingQuery = `UPDATE skipping_stones SET is_skipping_stones_running = false WHERE skipping_stones_game_id = ${gameId}`;
  connection.query(endSkippingQuery, (error, results) => {
    if (error) {
      console.error(error);
    } else {
    }
  });
};

export async function getAllDidPass(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const allDidPassRecords = await getAllDidPassRecordsPromise();

    res.json({ allDidPassRecords });
  } catch (e) {
    console.error(e, getAllDidPass);
    res.status(500).json({ error: "error getting records" });
  }
}

function getAllDidPassRecordsPromise() {
  const getAllDidPassRecordsPromise = new Promise<any[]>(function (
    resolve,
    reject
  ) {
    const getDidPass = `
  SELECT
    did_pass, user_address, contestant
  FROM
    skipping_stones
    `;

    connection.query(getDidPass, function (err, result) {
      if (err) {
        reject(err);
      } else resolve(result);
    });
  });
  return getAllDidPassRecordsPromise;
}

// app.get("/lastCard", (_, res) => {
//   res.json(shownCards[shownCards.length - 1]);
// });

// app.listen(5000, () => {
//   console.log(`App listening on port ${5000}`);
// });

type guessType = "higher" | "lower";

interface userDetailsI {
  userAddress: string;
  contestant: number;
}

function getNewRandomCardNumber(shownCards: { card_number: number }[]) {
  let newRandomNumber: number;
  let shownCardsArr = shownCards.map((card) => card.card_number);
  do {
    newRandomNumber = getRandomInt(1, 52);
  } while (shownCardsArr.includes(newRandomNumber));
  return newRandomNumber;
}

interface guessResponseObjectI {
  isGuessSuccess: boolean;
  lastCard: { card_number: number };
  isGameDone: boolean;
  didUserPass?: boolean;
}

async function getIsRunning(gameId: number) {
  const isRunning = await getIsSkippingStonesRunningPromise(gameId);
  return isRunning;
}

function getIsSkippingStonesRunningPromise(gameId: number) {
  const getIsRunningPromise = new Promise<boolean>(function (resolve, reject) {
    const getIsRunningQuery = `
  SELECT
    is_skipping_stones_running
  FROM
    skipping_stones
  WHERE
    skipping_stones_game_id = ?
    `;

    connection.query(getIsRunningQuery, [gameId], function (err, result) {
      if (err) {
        reject(err);
        console.error(err, "getIsSkippingStonesRunningPromise-err");
      }
      if (result) {
        resolve(result[0].is_skipping_stones_running);
      }
    });
  });
  return getIsRunningPromise;
}

const WINNING_SCORE = 5;
