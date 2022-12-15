export type RoomType = {
  id: string;
  players: PlayerType[];
  cagnottes: CagnotteType[];
  votes: VoteType[];
  isGameLaunched: boolean;
  isGameStarted: boolean;
  mode: ModeType;
  isRevealRole: boolean;
  revealAnswerQuestion: boolean;
  revealVoiceIAAnswer: boolean;
  questionsMode: {
    indexQuestion: number;
    isShowResponse: boolean;
    questionsList: QuestionType[];
  };
  justePrixMode: {
    justePrixList: QuestionType[];
    indexJustePrix: number;
    isShowResponse: boolean;
  };
  filmsMode: {
    filmsQuestions: QuestionsFilmType[];
    indexFilms: number;
    playerToDescribe?: PlayerType;
    playerToHide?: PlayerType;
  };
};
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

export type PlayerRoleType = "player" | "streamer" | "viewer" | "admin";

export type CagnotteType = {
  name: "innocent" | "traitor";
  value: number;
};
export type ModeType = "default" | "questions" | "justePrix" | "films";

export type VoteType = {
  from: PlayerType;
  to: PlayerType;
  confirm: boolean;
};
export type nav = "questions" | "justePrix" | "films";

export type QuestionType = {
  id: string;
  type: nav;
  question: string;
  response: string;
  subs: number;
};
export type QuestionsFilmType = {
  id: string;
  type: nav;
  question: string;
  response: undefined;

  subs: number;
};

export type AvatarJsonType = { name: string; value: any };

export type AvatarNameType =
  | "catcheur"
  | "alien"
  | "strawberry"
  | "donut"
  | "momie"
  | "pizza"
  | "iceCream"
  | "kraken"
  | "pumpkin"
  | "brush"
  | "burger"
  | "iceCreamSunglasses"
  | "zombie"
  | "pineapple"
  | "fish"
  | "pirate"
  | "pig"
  | "unicorn"
  | "viking"
  | "skull"
  | "knight"
  | "bomb"
  | "panda"
  | "mushroom"
  | "bird"
  | "flower"
  | "totemV1"
  | "totemV2"
  | "cactus"
  | "hoowl"
  | "cyclops"
  | "traitor"
  | "dino"
  | "dracula"
  | "robot"
  | "chicken"
  // | "ghost"
  // | "aviatorBird"
  // | "pencil"
  // | "bear"
  // | "yeti"
  | "alienWeird"
  | "lama"
  | "monkey"
  | "dinoV2"
  | "clown";
