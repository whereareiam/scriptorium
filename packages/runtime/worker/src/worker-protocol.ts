export interface PrepareCommand {
  type: "prepare";
}

export interface ShutdownCommand {
  type: "shutdown";
}

export type WorkerCommand =
  | PrepareCommand
  | ShutdownCommand;

export interface OnlineMessage {
  type: "online";
}

export interface PrepareFinishedMessage {
  type: "prepare-finished";
}

export type WorkerMessage =
  | OnlineMessage
  | PrepareFinishedMessage;
