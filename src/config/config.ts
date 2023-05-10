import { EnvClassConstructorArgs } from "../types/config";
import { Env_Vars } from "./env";
import * as dotenv from "dotenv"; // see https://github.com/motdotla/dotenv#how-do-i-use-dotenv-with-import
dotenv.config();

const envArg: EnvClassConstructorArgs = {
  appEnv: { BACKEND_PORT: process.env.BACKEND_PORT },
  gameEnv: {
    TETRIS_KEY: process.env.TETRIS_KEY,
    SLIDER_GAMETIME_SECONDS: process.env.SLIDER_GAMETIME_SECONDS,
    TETRIS_GAMETIME_SECONDS: process.env.TETRIS_GAMETIME_SECONDS,
  },
  DbEnv: {
    HOST: process.env.DB_HOST,
    USER: process.env.DB_USER,
    PASSWORD: process.env.DB_PASSWORD,
    NAME: process.env.DB_DATABASE_NAME,
    PORT: process.env.DB_PORT,
  },
  AuthEnv: {
    THIRDWEB_AUTH_PRIVATE_KEY: process.env.THIRDWEB_AUTH_PRIVATE_KEY,
    THIRDWEB_AUTH_DOMAIN: process.env.THIRDWEB_AUTH_DOMAIN,
    CHAINID: process.env.CHAINID,
  },
  Alchemy: {
    API_KEY: process.env.ALCHEMY_API_KEY,
  },
};

//? will env_Vars be created again each time I use the exported env_Vars
export const env_Vars = new Env_Vars(envArg);
