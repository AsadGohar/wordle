import { NextFunction, Request, Response } from "express";
import { connection } from "../../database/database";
import { ErrorI } from "../../types/error";

export const verifyUser = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    let userAddress = req.headers.useraddress;
    let userKey = req.headers.userkey;

    if (userAddress === undefined || userKey === undefined) return;
    if (Array.isArray(userAddress)) userAddress = userAddress[0];
    if (Array.isArray(userKey)) userKey = userKey[0];

    doesUserKeyMatch(userAddress, userKey).then((doesUserKeyMatchResponse) => {
      if (doesUserKeyMatchResponse) {
        if (!req.body.userAddress) {
          req.body.userAddress = userAddress;
        } else {
          if (req.body.userAddress !== userAddress) {
            throw "user addresses don't match";
          }
        }
        if (
          !req.body.contestant &&
          req.headers.contestant !== undefined &&
          req.headers.contestant !== null
        )
          req.body.contestant = req.headers.contestant;
        next();
      } else {
        const err: ErrorI = new Error("User not verified");
        err.status = 401;
        return next(err);
      }
    });
  } catch (err) {
    console.log(err, "auth error");
    res.status(500).json({ err });
  }
};

export const doesUserKeyMatch = async (
  userAddress: string,
  userKey: string
) => {
  try {
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

    if (fetchedKey === userKey) {
      return true;
    } else {
      return false;
    }
  } catch (err) {
    console.log(err, "auth error");
    return err;
  }
};
