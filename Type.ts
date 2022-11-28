export type PlayerRoleType = "player" | "streamer" | "viewer" | "admin";
export type AvatarNameType = "catcheur" | "alien";

export type VoiceIAType = { voice: string; text: string; answer: string };
export type PlayerType = {
  idServer?: string;
  idClient?: string;
  avatarName: AvatarNameType;

  room: string;
  name: string;
  pts: number;
  isTraitor: boolean;
  ptsCagnotte: number;
  hasVoted: boolean;
  voteConfirmed: boolean;
  role: PlayerRoleType;

  // isController: boolean;
  // isViewer: boolean;
};
export type CagnotteType = {
  name: "innocent" | "traitor";
  value: number;
};
export type ModeType = "" | "questions" | "justePrix" | "voiceIa" | "vote";

export type RoomType = {
  id: string;
  players: PlayerType[];
  cagnottes: CagnotteType[];
  votes: VoteType[];
  isGameLaunched: boolean;
  isGameStarted: boolean;

  mode: ModeType;
  // traitorId: string;
  isRevealRole: boolean;
  // votesLaunched: boolean;
  // questionsLaunched: boolean;
  // voiceIALaunched: boolean;
  // voiceIAVoicePlayed: boolean;
  // justePrixLaunched: boolean;
  revealAnswerQuestion: boolean;
  revealVoiceIAAnswer: boolean;
};
export type VoteType = {
  from: PlayerType;
  to: PlayerType;
  confirm: boolean;
};
export type QuestionType = {
  _id: string;
  question: string;
  response: string;
  numberOfSubs: number;
  __v: number;
};
