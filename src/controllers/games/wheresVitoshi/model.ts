import { connection } from "../../../database/database";
import {
  WheresVitoshiRecord,
  WheresVitoshiGuessReq,
  User,
} from "../../../types/wheresVitoshi";
import { Img } from "./Image";

class wheresVitoshiClass {
  async createTable() {
    await this.getCreateTablePromise();
  }

  createGameAndGetGameId(
    userAddress: string,
    contestant: number
  ): Promise<{ createdGameId: number; img_num: number }> {
    const img_num = Img.getRandomImg();
    const wheresVitoshiRecord: WheresVitoshiRecord = {
      user_address: userAddress,
      contestant: contestant,
      img_num,
      is_wheres_vitoshi_running: true,
      guesses: 0,
      start_time: Date.now(),
    };

    return new Promise((resolve, reject) => {
      connection.query(
        "INSERT INTO wheres_vitoshi SET ?",
        wheresVitoshiRecord,
        (error, results) => {
          if (error) {
            reject(error);
          } else {
            resolve({ createdGameId: results.insertId, img_num });
          }
        }
      );
    });
  }

  async guess(
    guess: WheresVitoshiGuessReq
  ): Promise<
    | { isVitoshiFound: boolean; playTime: number | undefined }
    | "game already played"
  > {
    const isGameRunning = await this.getIsGameRunningPromise(guess.gameId);
    if (!isGameRunning) return "game already played";

    const distance = await this.getDistanceFromAnswer(guess);
    // Add the guess record to the wheres_vitoshi_guesses table
    await this.addGuessRecord(guess, distance);

    // Check if the guess was correct
    const isVitoshiFound = await this.getIsVitoshiFound(distance);

    const playTime = await this.updateGameRecord(isVitoshiFound, guess.gameId);

    return { isVitoshiFound, playTime };
  }

  async getAllCompletedGames() {
    const getAllCompletedGamesPromise = new Promise<
      {
        user_address: string;
        contestant: number;
        play_time: bigint;
        guesses: number;
      }[]
    >(function (resolve, reject) {
      const getDidPass = `
    SELECT
      user_address, contestant,play_time, guesses
    FROM
      wheres_vitoshi
    WHERE
      play_time IS NOT NULL
    ORDER BY
      play_time ASC;
      `;

      connection.query(getDidPass, function (err, result) {
        if (err) {
          reject(err);
        } else resolve(result);
      });
    });
    return getAllCompletedGamesPromise;
  }

  async abandonGame(userAddress: string, contestant: number): Promise<void> {
    const isGameRunning = this.getIsGameRunningByUser(userAddress, contestant);
    if (!isGameRunning) return;

    const updateQuery = `
    UPDATE
      wheres_vitoshi
    SET
      is_wheres_vitoshi_running = false, guesses = 999
    WHERE
      contestant = ? AND
      user_address = ?`;

    await new Promise<void>((resolve, reject) => {
      connection.query(
        updateQuery,
        [contestant, userAddress],
        (error, _results, _fields) => {
          if (error) {
            reject(error);
          } else {
            resolve();
          }
        }
      );
    });
  }

  protected async getIsGameRunningPromise(gameId: number) {
    const getIsGameRunningPromise = new Promise<boolean>(function (
      resolve,
      reject
    ) {
      const isGameRunningRunningQuery = `
    SELECT
      is_wheres_vitoshi_running 
    FROM
      wheres_vitoshi
    WHERE
      wheres_vitoshi_game_id = ?
      `;

      connection.query(
        isGameRunningRunningQuery,
        [gameId],
        function (err, result) {
          if (err) {
            reject(err);
          } else resolve(result[0].is_wheres_vitoshi_running);
        }
      );
    });
    return getIsGameRunningPromise;
  }

  protected async getIsGameRunningByUser(
    userAddress: string,
    contestant: number
  ) {
    const getIsGameRunningPromise = new Promise<boolean>(function (
      resolve,
      reject
    ) {
      const isGameRunningRunningQuery = `
    SELECT
      is_wheres_vitoshi_running 
    FROM
      wheres_vitoshi
    WHERE
      user_address = ? AND contestant = ?
      `;

      connection.query(
        isGameRunningRunningQuery,
        [userAddress, contestant],
        function (err, result) {
          if (err) {
            reject(err);
          } else resolve(result[0].is_wheres_vitoshi_running);
        }
      );
    });
    return getIsGameRunningPromise;
  }

  protected getCreateTablePromise = async function () {
    let createWheresVitoshiTablePromise = new Promise<void>(function (
      resolve,
      reject
    ) {
      const createWheresVitoshiTableQuery = `CREATE TABLE IF NOT EXISTS wheres_vitoshi (
              wheres_vitoshi_game_id INT AUTO_INCREMENT PRIMARY KEY, 
              user_address VARCHAR(255) NOT NULL, 
              contestant INT NOT NULL,
              img_num INT NOT NULL,
              is_wheres_vitoshi_running BOOLEAN NOT NULL, 
              guesses INT NOT NULL,
              start_time BIGINT NOT NULL,
              end_time BIGINT,
              play_time BIGINT
            )`;

      connection.query(
        createWheresVitoshiTableQuery,
        async function (err, result) {
          if (err) {
            console.error(err, "error creating wheres_vitoshi table");
            reject(err);
          } else if (result) {
            await getCreateWheresVitoshiGuessesPromise();
            resolve();
          }
        }
      );
    });
    return createWheresVitoshiTablePromise;

    function getCreateWheresVitoshiGuessesPromise() {
      let createWheresVitoshiGuessesTablePromise = new Promise<void>(function (
        resolve,
        reject
      ) {
        const createWheresVitoshiGuessesTableQuery = `
        CREATE TABLE IF NOT EXISTS 
          wheres_vitoshi_guesses (
        wheres_vitoshi_guess_id
          INT AUTO_INCREMENT PRIMARY KEY,
          placed_x INT NOT NULL,
                    placed_y INT NOT NULL,
                    dist INT NOT NULL,
                    wheres_vitoshi_game_id INT NOT NULL,
                    FOREIGN KEY (wheres_vitoshi_game_id) REFERENCES wheres_vitoshi (wheres_vitoshi_game_id)
                    )`;
        connection.query(
          createWheresVitoshiGuessesTableQuery,
          function (err, result) {
            if (err) {
              console.error(err, "error creating wheres_vitoshi_table table");
              reject(err);
            }
            if (result) {
              resolve();
            }
          }
        );
      });
      return createWheresVitoshiGuessesTablePromise;
    }
  };

  getGamesByContestant = async function (_contestant: number) {
    const getGamesByUserPromise = new Promise<[{ guesses: number }] | []>(
      function (resolve, reject) {
        const getWheresVitoshiGamesQuery = `*
    SELECT
      guesses
    FROM
      wheres_vitoshi
    WHERE 
      contestant = ?
      `;

        connection.query(
          getWheresVitoshiGamesQuery,
          [_contestant],
          function (err, result) {
            if (err) {
              err.message = "getGamesByUserPromise-error";
              reject(err);
            } else {
              if (result) {
                resolve(result);
              }
            }
          }
        );
      }
    );
    const gamesByUser = await getGamesByUserPromise;
    if (gamesByUser.length) return gamesByUser[0];
    return;
  };

  protected async updateGameRecord(
    isVitoshiFound: boolean,
    gameId: number
  ): Promise<number | undefined> {
    try {
      const start_time = await this.getStartTime(gameId);

      const end_time = isVitoshiFound ? Date.now() : undefined;
      const play_time = end_time ? end_time - start_time : undefined;

      const updateQuery = `
        UPDATE wheres_vitoshi
        SET
          is_wheres_vitoshi_running = ?,
          end_time = ?,
          play_time = ?,
          guesses = guesses + 1
        WHERE wheres_vitoshi_game_id = ?;
      `;

      const values = [!isVitoshiFound, end_time, play_time, gameId];

      return new Promise((resolve, reject) => {
        connection.query(updateQuery, values, function (err, results) {
          if (err) {
            reject(err);
          } else {
            resolve(play_time);
          }
        });
      });
    } catch (error) {
      console.error(`Error updating wheres_vitoshi table: ${error}`);
      throw error;
    }
  }

  protected async getStartTime(gameId: number) {
    const getStartTimePromise = new Promise<number>(function (resolve, reject) {
      const getStartTimeQuery =
        "SELECT start_time FROM wheres_vitoshi WHERE wheres_vitoshi_game_id = ?";

      connection.query(getStartTimeQuery, [gameId], function (error, results) {
        if (error) reject(error);
        if (results) resolve(results[0].start_time);
      });
    });

    const start_time = await getStartTimePromise;
    return start_time;
  }

  protected async addGuessRecord(
    { guess, user, gameId }: WheresVitoshiGuessReq,
    distance: number
  ) {
    const query = `INSERT INTO wheres_vitoshi_guesses (placed_x, placed_y, dist, wheres_vitoshi_game_id)
                   VALUES (?, ?, ?, ?)`;

    await new Promise<void>((resolve, reject) => {
      connection.query(
        query,
        [guess.placedX, guess.placedY, distance, gameId],
        (err, result) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        }
      );
    });
  }

  protected async getIsVitoshiFound(distance: number) {
    if (distance <= 30) {
      //CORRECT
      return true;
    } else {
      // Incorrect
      return false;
    }
  }
  protected async getDistanceFromAnswer({
    gameId,
    guess,
    user,
  }: WheresVitoshiGuessReq) {
    const imgNum = await this.getImgNumByUserAndGame(user, gameId);

    const correctX = Img.getImgCoords(imgNum)[0];
    const correctY = Img.getImgCoords(imgNum)[1];

    // const CorrectYScaled = correctX * guess.Hratio + guess.imgFromTop - 30;
    // const CorrectXScaled = correctY * guess.Wratio + guess.imgFromLeft - 30;

    const CorrectYScaled = correctY * guess.Hratio;
    const CorrectXScaled = correctX * guess.Wratio;

    // console.log(
    //   "CorrectXScaled:" + CorrectXScaled + ", CorrectYScaled:" + CorrectYScaled
    // );
    // console.log("guessX:" + guess.placedX + ", guessY:" + guess.placedY);

    const dist = Math.sqrt(
      (guess.placedX - CorrectXScaled) ** 2 +
        (guess.placedY - CorrectYScaled) ** 2
    );

    // console.log(dist, "dist");

    return dist;
  }
  protected getImgNumByUserAndGame(
    user: User,
    gameId: number
  ): Promise<number> {
    const sql = `SELECT img_num FROM wheres_vitoshi
                 WHERE user_address = ? AND contestant = ? AND wheres_vitoshi_game_id = ?`;
    const values = [user.userAddress, user.contestant, gameId];
    return new Promise((resolve, reject) => {
      connection.query(sql, values, (error, results: WheresVitoshiRecord[]) => {
        if (error) {
          reject(error);
        }
        // console.log(results, "getImgNumByUserAndGame");
        if (results && results.length === 0) {
          reject(new Error("Record not found"));
          return;
        }
        resolve(results[0].img_num);
      });
    });
  }
}

export const wheresVitoshi = new wheresVitoshiClass();
