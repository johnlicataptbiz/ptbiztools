export interface LocalAction {
  id: string;
  actionType: string;
  description: string;
  createdAt: string;
  userName: string | null;
  userImageUrl: string | null;
  source: "remote" | "local";
}
