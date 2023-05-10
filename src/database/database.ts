import mysql from "mysql";
import { env_Vars } from "../config/config";

export const connection = mysql.createConnection({
  host: env_Vars.Db.HOST,
  user: env_Vars.Db.USER,
  password: env_Vars.Db.PASSWORD,
  database: env_Vars.Db.NAME,
  port: env_Vars.Db.PORT,
});

connection.connect(function (err) {
  if (err) {
    console.error("error connecting db: " + err.stack);
    return;
  }

  console.log("database connected with id : " + connection.threadId);
});
