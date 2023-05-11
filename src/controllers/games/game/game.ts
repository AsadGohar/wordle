import { connection } from "../../../database/database";
import {
  GameRecord
} from "../../../types/game";

class gameClass {
  async createTable() {
    await this.getCreateTablePromise();
  }

  createGameAndGetGameId(
    userEmail: string,
    word: string
  ): Promise<{ createdGameId: number; img_num: number }> {
    const gameRecord: GameRecord = {
      user_email: userEmail,
      word,
      is_game_active: true,
      attempts: 0,
      start_time: Date.now(),
    };

    return new Promise((resolve, reject) => {
      connection.query(
        "INSERT INTO game SET ?",
        gameRecord,
        (error, results) => {
          if (error) {
            reject(error);
          } else {
            resolve({ createdGameId: results.insertId, img_num:0 });
          }
        }
      );
    });
  }

  async getAllCompletedGames() {
    const getAllCompletedGamesPromise = new Promise<
      {
        user_email: string;
        play_time: bigint;
        attempts: number;
      }[]
    >(function (resolve, reject) {
      const getDidPass = `
    SELECT
      user_email,play_time, attempts
    FROM
      games
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

  async abandonGame(userEmail: string): Promise<void> {
    const isGameRunning = this.getIsGameRunningByUser(userEmail);
    if (!isGameRunning) return;

    const updateQuery = `
    UPDATE
      game
    SET
      is_game_active = false, attempts = 1000
    WHERE
      user_email = ?`;

    await new Promise<void>((resolve, reject) => {
      connection.query(
        updateQuery,
        [userEmail],
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
      is_game_active 
    FROM
      games
    WHERE
      game_id = ?
      `;

      connection.query(
        isGameRunningRunningQuery,
        [gameId],
        function (err, result) {
          if (err) {
            reject(err);
          } else resolve(result[0].is_game_active);
        }
      );
    });
    return getIsGameRunningPromise;
  }

  protected async getIsGameRunningByUser(
    userEmail: string,
  ) {
    const getIsGameRunningPromise = new Promise<boolean>(function (
      resolve,
      reject
    ) {
      const isGameRunningRunningQuery = `
    SELECT
      is_game_active 
    FROM
      games
    WHERE
      user_email = ? 
      `;

      connection.query(
        isGameRunningRunningQuery,
        [userEmail],
        function (err, result) {
          if (err) {
            reject(err);
          } else resolve(result[0].is_game_active);
        }
      );
    });
    return getIsGameRunningPromise;
  }

  protected getCreateTablePromise = async function () {
    let createGameTablePromise = new Promise<void>(function (
      resolve,
      reject
    ) {
      const createGamesTableQuery = `CREATE TABLE IF NOT EXISTS games (
              game_id INT AUTO_INCREMENT PRIMARY KEY,
              word VARCHAR(255) NOT NULL,
              user_email VARCHAR(255) NOT NULL, 
              is_game_active BOOLEAN NOT NULL, 
              attempts INT NOT NULL,
              start_time BIGINT NOT NULL,
              end_time BIGINT,
              has_user_won BOOLEAN NOT NULL
            )`;
      connection.query(
        createGamesTableQuery,
        async function (err, result) {
          if (err) {
            console.error(err, "error creating game table");
            reject(err);
          } else if (result) {
            resolve();
          }
        }
      );
    });
    return createGameTablePromise;
  };

  protected async updateGameRecord(
    hasUserWon: boolean,
    gameId: number
  ): Promise<number | undefined> {
    try {
      const start_time = await this.getStartTime(gameId);

      const end_time = hasUserWon ? Date.now() : undefined;
      const play_time = end_time ? end_time - start_time : undefined;

      const updateQuery = `
        UPDATE games
        SET
          is_game_active = ?,
          end_time = ?,
          play_time = ?,
          attempts = attempts + 1
        WHERE game_id = ?;
      `;

      const values = [!hasUserWon, end_time, play_time, gameId];

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
      console.error(`Error updating games table: ${error}`);
      throw error;
    }
  }

  protected async getStartTime(gameId: number) {
    const getStartTimePromise = new Promise<number>(function (resolve, reject) {
      const getStartTimeQuery =
        "SELECT start_time FROM games WHERE game_id = ?";

      connection.query(getStartTimeQuery, [gameId], function (error, results) {
        if (error) reject(error);
        if (results) resolve(results[0].start_time);
      });
    });

    const start_time = await getStartTimePromise;
    return start_time;
  }

}

export const game = new gameClass();
