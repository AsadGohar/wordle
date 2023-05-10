export interface WheresVitoshiRecord {
  user_address: string;
  contestant: number;
  img_num: number;
  is_wheres_vitoshi_running: boolean;
  guesses: number;
  start_time: number;
  end_time?: number;
  play_time?: number;
}

export interface WheresVitoshiGuessReq {
  guess: wheresVitoshiGuessPointsI;
  user: User;
  gameId: number;
}

interface wheresVitoshiGuessPointsI {
  placedX: number;
  placedY: number;
  imgFromTop: number;
  imgFromLeft: number;
  Hratio: number;
  Wratio: number;
}

export interface User {
  userAddress: string;
  contestant: number;
}

export function isWheresVitoshiGuessReq(obj: any): obj is WheresVitoshiGuessReq {
    return (
      typeof obj === "object" &&
      obj.guess !== undefined &&
      isWheresVitoshiGuessPointsI(obj.guess) &&
      obj.user !== undefined &&
      isUserI(obj.user) &&
      obj.gameId !== undefined &&
      typeof obj.gameId === "number"
    );
  }
  
  function isWheresVitoshiGuessPointsI(obj: any): obj is wheresVitoshiGuessPointsI {
    return (
      typeof obj === "object" &&
      obj.placedX !== undefined &&
      typeof obj.placedX === "number" &&
      obj.placedY !== undefined &&
      typeof obj.placedY === "number" &&
      obj.imgFromTop !== undefined &&
      typeof obj.imgFromTop === "number" &&
      obj.imgFromLeft !== undefined &&
      typeof obj.imgFromLeft === "number" &&
      obj.Hratio !== undefined &&
      typeof obj.Hratio === "number" &&
      obj.Wratio !== undefined &&
      typeof obj.Wratio === "number"
    );
  }
  
  function isUserI(obj: any): obj is User {
    return (
      typeof obj === "object" &&
      obj.userAddress !== undefined &&
      typeof obj.userAddress === "string" &&
      obj.contestant !== undefined &&
      typeof obj.contestant === "number"
    );
  }