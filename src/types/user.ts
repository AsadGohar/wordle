export interface UserRecord {
  user_email: string;
  word: string;
  is_game_active: boolean;
  attempts: number;
  start_time: number;
  end_time?: number;
  play_time?: number;
  has_user_won?: boolean;
}
