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
  gameEnv: GameProcessEnvArg;
  DbEnv: DbProcessEnvArg;
  AuthEnv: AuthEnvArg;
  Alchemy: AlchemyEnvArg;
}

interface App_ProcessEnvArg {
  BACKEND_PORT: string | undefined;
}

interface GameProcessEnvArg {
  TETRIS_KEY: string | undefined;
  TETRIS_GAMETIME_SECONDS: string | undefined;
  SLIDER_GAMETIME_SECONDS: string | undefined;
}

interface DbProcessEnvArg {
  HOST: string | undefined;
  USER: string | undefined;
  PASSWORD: string | undefined;
  NAME: string | undefined;
  PORT: string | undefined;
}

interface AuthEnvArg {
  THIRDWEB_AUTH_PRIVATE_KEY: string | undefined;
  THIRDWEB_AUTH_DOMAIN: string | undefined;
  CHAINID: string | undefined;
}

interface AlchemyEnvArg {
  API_KEY: string | undefined;
}
