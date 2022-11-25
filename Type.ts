export type VoiceIA = { voice: string; text: string; answer: string };
export type Player = {
  idServer?: string;
  idClient?: string;
  room: string;
  name: string;
  pts: number;
  isTraitor: boolean;
  ptsCagnotte: number;
  hasVoted: boolean;
  voteConfirmed: boolean;
  isController: boolean;
  isViewer: boolean;
};
export type Cagnotte = {
  name: "innocent" | "traitor";

  value: number;
};
export type Room = {
  id: string;
  players: Player[];
  cagnottes: Cagnotte[];
  votes: Vote[];
  isGameLaunched: boolean;
  mode: "" | "questions" | "justePrix" | "voiceIa" | "votes";
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
export type Vote = {
  from: Player;
  to: Player;
  confirm: boolean;
};
export type Question = {
  _id: string;
  question: string;
  response: string;
  numberOfSubs: number;
  __v: number;
};
