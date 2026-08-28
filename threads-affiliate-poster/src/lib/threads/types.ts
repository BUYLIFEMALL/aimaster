export interface ThreadsTokenExchangeResponse {
  access_token: string;
  user_id: string;
}

export interface ThreadsLongLivedTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number; // 초 단위, 보통 60일
}

export interface ThreadsUserProfile {
  id: string;
  username: string;
}

export interface ThreadsContainerResponse {
  id: string;
}

export interface ThreadsContainerStatusResponse {
  status: "EXPIRED" | "ERROR" | "FINISHED" | "IN_PROGRESS" | "PUBLISHED";
  error_message?: string;
}

export interface ThreadsPublishResponse {
  id: string;
}

export interface ThreadsApiError {
  error: {
    message: string;
    type?: string;
    code?: number;
  };
}

export interface PublishThreadsPostParams {
  accessToken: string;
  threadsUserId: string;
  text: string;
  imageUrl?: string | null;
  videoUrl?: string | null;
}

export interface PublishThreadsPostResult {
  threadsPostId: string;
  permalink: string;
}
