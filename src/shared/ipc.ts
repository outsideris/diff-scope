export const IpcChannels = {
  ping: "diff-scope:ping",
} as const;

export type IpcChannel = (typeof IpcChannels)[keyof typeof IpcChannels];
