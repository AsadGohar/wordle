import mysql from "mysql";
import { connection } from "../database/database";

export class Login {
  constructor() {
    console.log("construcing login model for nonces - should only run once");

    const createLoginTableQuery = `
            CREATE TABLE IF NOT EXISTS
                login (
                    nonce binary(16) PRIMARY KEY
                       )`;

    connection.query(createLoginTableQuery, async function (err, result) {
      if (err) {
        console.error("error creating login table - ", err);
      } else if (result) {
        console.log("login table creation success");
      }
    });
  }

  readonly saveNonce = (nonce: string) => {
    connection.query(
      this.saveNonceInBinaryQuery(nonce),
      (error: unknown, results: unknown, fields: unknown) => {
        if (results) {
          console.log(`${nonce} saved`);
        } else if (error) {
          console.error(error, "error saving new login nonce");
        }
      }
    );
  };

  readonly doesNonceExist = async (nonce: string): Promise<boolean> => {
    const getNonceResult = await this.getSelectNoncePromise(nonce);
    if (getNonceResult.length) {
      return true;
    }
    return false;
  };

  private saveNonceInBinaryQuery = (nonce: string) => {
    const nonceBinary = this.convertNonceToBinary(nonce);

    return mysql.format(
      `
    INSERT INTO
        login
    SET
        nonce = ?`,
      [nonceBinary]
    );
  };

  private getSelectNoncePromise = (nonce: string) => {
    const nonceBinary = this.convertNonceToBinary(nonce);

    return new Promise<{ nonce: string }[]>(function (resolve, reject) {
      const getNonceQuery = mysql.format(
        `
SELECT
    nonce
FROM
    login
WHERE
    nonce = ?`,
        [nonceBinary]
      );

      connection.query(getNonceQuery, function (err, result) {
        if (err) {
          reject(err);
        }
        if (result) {
          resolve(result);
        }
      });
    });
  };

  private convertNonceToBinary(nonce: string) {
    return mysql.raw(`UUID_TO_BIN(${mysql.escape(nonce)})`);
  }
}
