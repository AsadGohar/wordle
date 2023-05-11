import {
  AlchemyEnv,
  AppEnv,
  AuthEnv,
  DbEnv,
  EnvClassConstructorArgs,
  GameEnv,
} from "../types/config";

export class Env_Vars {
  constructor(envArgs: EnvClassConstructorArgs) {
    console.log("constructing env_vars - this message should only appear once");

    if (!envArgs.appEnv.BACKEND_PORT) throw "BACKEND_PORT not defined in env";
    if (!envArgs.DbEnv.HOST) throw "DB_HOST not defined in env";
    if (!envArgs.DbEnv.USER) throw "DB_USER not defined in env";
    if (!envArgs.DbEnv.PASSWORD) throw "DB_PASSWORD not defined in env";
    if (!envArgs.DbEnv.NAME) throw "DB_DATABASE_NAME not defined in env";
    if (!envArgs.DbEnv.PORT) throw "DB_PORT not defined in env";

    this.App = { BACKEND_PORT: Number(envArgs.appEnv.BACKEND_PORT) };
    if (isNaN(this.App.BACKEND_PORT))
      throw "BACKEND_PORT does not seem like a number";
    this.Db = {
      HOST: envArgs.DbEnv.HOST,
      USER: envArgs.DbEnv.USER,
      PASSWORD: envArgs.DbEnv.PASSWORD,
      NAME: envArgs.DbEnv.NAME,
      PORT: Number(envArgs.DbEnv.PORT),
    };
    if (isNaN(this.Db.PORT)) throw "DB_PORT does not seem like a valid number";

  }
  readonly App: AppEnv;
  readonly Db: DbEnv;
}
