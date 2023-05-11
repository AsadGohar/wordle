import { EnvClassConstructorArgs } from "../types/config";
import { Env_Vars } from "./env";
import * as dotenv from "dotenv"; // see https://github.com/motdotla/dotenv#how-do-i-use-dotenv-with-import
dotenv.config();

const envArg: EnvClassConstructorArgs = {
  appEnv: { BACKEND_PORT: process.env.BACKEND_PORT },
  DbEnv: {
    HOST: process.env.DB_HOST,
    USER: process.env.DB_USER,
    PASSWORD: process.env.DB_PASSWORD,
    NAME: process.env.DB_DATABASE_NAME,
    PORT: process.env.DB_PORT,
  }
};

//? will env_Vars be created again each time I use the exported env_Vars
export const env_Vars = new Env_Vars(envArg);
