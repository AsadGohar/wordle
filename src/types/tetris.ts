export interface scoredPayloadI {
  contestant: number;
  userAddress: string;
  userTetrisGameId: number;
  rowsCleared: number;
}

export interface basePayloadI {
  contestant: number;
  userAddress: string;
}

export type scoreAddedType = 40 | 100 | 300 | 1200;

export enum scoreToAddEnum {
  oneRowCleared = 40,
  twoRowsCleared = 100,
  threeRowsCleared = 300,
  fourRowsCleared = 1200,
}

