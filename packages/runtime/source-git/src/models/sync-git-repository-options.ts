export interface SyncGitRepositoryOptions {
  repoDir: string;
  repoUrl: string;
  defaultBranch: string;
  authToken?: string;
  authUsername?: string;
}
