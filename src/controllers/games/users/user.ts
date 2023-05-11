import { connection } from "../../../database/database";
import {
  UserRecord
} from "../../../types/user";

class userClass {
  async createTable() {
    await this.getCreateTablePromise();
  }

  createUserAndGetUserId(
    userEmail: string,
    word: string
  ): Promise<{ createdUserId: number; img_num: number }> {
    const userRecord: UserRecord = {
      user_email: userEmail,
      word,
      is_game_active: true,
      attempts: 0,
      start_time: Date.now(),
    };

    return new Promise((resolve, reject) => {
      connection.query(
        "INSERT INTO user SET ?",
        userRecord,
        (error, results) => {
          if (error) {
            reject(error);
          } else {
            resolve({ createdUserId: results.insertId, img_num:0 });
          }
        }
      );
    });
  }

  async getAllCompletedUsers() {
    const getAllCompletedUsersPromise = new Promise<
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
    return getAllCompletedUsersPromise;
  }

  async abandonUser(userEmail: string): Promise<void> {
    const isUserRunning = this.getIsUserRunningByUser(userEmail);
    if (!isUserRunning) return;

    const updateQuery = `
    UPDATE
      user
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

  protected async getIsUserRunningPromise(gameId: number) {
    const getIsUserRunningPromise = new Promise<boolean>(function (
      resolve,
      reject
    ) {
      const isUserRunningRunningQuery = `
    SELECT
      is_game_active 
    FROM
      games
    WHERE
      game_id = ?
      `;

      connection.query(
        isUserRunningRunningQuery,
        [gameId],
        function (err, result) {
          if (err) {
            reject(err);
          } else resolve(result[0].is_game_active);
        }
      );
    });
    return getIsUserRunningPromise;
  }

  protected async getIsUserRunningByUser(
    userEmail: string,
  ) {
    const getIsUserRunningPromise = new Promise<boolean>(function (
      resolve,
      reject
    ) {
      const isUserRunningRunningQuery = `
    SELECT
      is_game_active 
    FROM
      games
    WHERE
      user_email = ? 
      `;

      connection.query(
        isUserRunningRunningQuery,
        [userEmail],
        function (err, result) {
          if (err) {
            reject(err);
          } else resolve(result[0].is_game_active);
        }
      );
    });
    return getIsUserRunningPromise;
  }

  protected getCreateTablePromise = async function () {
    let createUserTablePromise = new Promise<void>(function (
      resolve,
      reject
    ) {
      const createUsersTableQuery = `CREATE TABLE IF NOT EXISTS users (
              user_id INT AUTO_INCREMENT PRIMARY KEY,
              user_email VARCHAR(255) NOT NULL, 
              user_password 
              games_played INT NOT NULL,
              games_won BIGINT NOT NULL,
              games_lost BIGINT,
              games_abandoned BOOLEAN NOT NULL
            )`;
      connection.query(
        createUsersTableQuery,
        async function (err, result) {
          if (err) {
            console.error(err, "error creating user table");
            reject(err);
          } else if (result) {
            resolve();
          }
        }
      );
    });
    return createUserTablePromise;
  };

  protected async updateUserRecord(
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

export const user = new userClass();
