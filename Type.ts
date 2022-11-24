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
  room: string;
  traitorValue: number;
  innocentValue: number;
};
export type Room = {
  name: string;
  isInGame: boolean;
  players: Player[];
  cagnotte: Cagnotte;
  votes: Vote[];
  votesLaunched: boolean;
  questionsLaunched: boolean;
  voiceIALaunched: boolean;
  voiceIAVoicePlayed: boolean;
  justePrixLaunched: boolean;
  revealAnswerQuestion: boolean;
  revealVoiceIAAnswer: boolean;
  traitorId: string;
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
