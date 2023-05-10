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
    if (!envArgs.gameEnv.TETRIS_KEY) throw "TETRIS_KEY not defined in env";
    if (!envArgs.gameEnv.TETRIS_GAMETIME_SECONDS)
      throw "TETRIS_GAMETIME_SECONDS not defined in env";
    if (!envArgs.gameEnv.SLIDER_GAMETIME_SECONDS)
      throw "SLIDER_GAMETIME_SECONDS not defined in env";
    if (!envArgs.DbEnv.HOST) throw "DB_HOST not defined in env";
    if (!envArgs.DbEnv.USER) throw "DB_USER not defined in env";
    if (!envArgs.DbEnv.PASSWORD) throw "DB_PASSWORD not defined in env";
    if (!envArgs.DbEnv.NAME) throw "DB_DATABASE_NAME not defined in env";
    if (!envArgs.DbEnv.PORT) throw "DB_PORT not defined in env";
    if (!envArgs.AuthEnv.THIRDWEB_AUTH_PRIVATE_KEY)
      throw "THIRDWEB_AUTH_PRIVATE_KEY not defined in env";
    if (!envArgs.AuthEnv.THIRDWEB_AUTH_DOMAIN)
      throw "THIRDWEB_AUTH_DOMAIN not defined in env";
    if (!envArgs.AuthEnv.CHAINID) throw "CHAINID not defined in env";
    if (!envArgs.Alchemy.API_KEY) throw "Alchemy API_KEY not defined in env";

    this.App = { BACKEND_PORT: Number(envArgs.appEnv.BACKEND_PORT) };
    if (isNaN(this.App.BACKEND_PORT))
      throw "BACKEND_PORT does not seem like a number";

    this.Game = {
      TETRIS_KEY: envArgs.gameEnv.TETRIS_KEY,
      TETRIS_GAMETIME_SECONDS: Number(envArgs.gameEnv.TETRIS_GAMETIME_SECONDS),
      SLIDER_GAMETIME_SECONDS: Number(envArgs.gameEnv.SLIDER_GAMETIME_SECONDS),
    };
    if (isNaN(this.Game.TETRIS_GAMETIME_SECONDS))
      throw "TETRIS_GAMETIME_SECONDS does not seem like a valid number";
    if (isNaN(this.Game.SLIDER_GAMETIME_SECONDS))
      throw "SLIDER_GAMETIME_SECONDS does not seem like a valid number";

    this.Db = {
      HOST: envArgs.DbEnv.HOST,
      USER: envArgs.DbEnv.USER,
      PASSWORD: envArgs.DbEnv.PASSWORD,
      NAME: envArgs.DbEnv.NAME,
      PORT: Number(envArgs.DbEnv.PORT),
    };
    if (isNaN(this.Db.PORT)) throw "DB_PORT does not seem like a valid number";

    this.Auth = {
      THIRDWEB_AUTH_PRIVATE_KEY: envArgs.AuthEnv.THIRDWEB_AUTH_PRIVATE_KEY,
      THIRDWEB_AUTH_DOMAIN: envArgs.AuthEnv.THIRDWEB_AUTH_DOMAIN,
      CHAINID: envArgs.AuthEnv.CHAINID,
    };

    this.Alchemy = {
      API_KEY: envArgs.Alchemy.API_KEY,
    };
  }
  readonly App: AppEnv;
  readonly Game: GameEnv;
  readonly Db: DbEnv;
  readonly Auth: AuthEnv;
  readonly Alchemy: AlchemyEnv;
}
