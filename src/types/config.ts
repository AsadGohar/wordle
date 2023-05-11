export interface AppEnv {
  BACKEND_PORT: number;
}

export interface GameEnv {
  TETRIS_KEY: string;
  SLIDER_GAMETIME_SECONDS: number;
  TETRIS_GAMETIME_SECONDS: number;
}

export interface DbEnv {
  HOST: string;
  USER: string;
  PASSWORD: string;
  NAME: string;
  PORT: number;
}

export interface AuthEnv {
  THIRDWEB_AUTH_PRIVATE_KEY: string;
  THIRDWEB_AUTH_DOMAIN: string;
  CHAINID: string;
}

export interface AlchemyEnv {
  API_KEY: string;
}

export interface EnvClassConstructorArgs {
  appEnv: App_ProcessEnvArg;
  DbEnv: DbProcessEnvArg;
}

interface App_ProcessEnvArg {
  BACKEND_PORT: string | undefined;
}

interface DbProcessEnvArg {
  HOST: string | undefined;
  USER: string | undefined;
  PASSWORD: string | undefined;
  NAME: string | undefined;
  PORT: string | undefined;
}

