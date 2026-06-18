export interface SendingSMSResponse {
  success: boolean;
  message?: string;
  expireAt?: number;
  error?: string;
  token?: string;
}

export interface VerifySMSResponse {
  success: boolean;
  token?: string,
  error?: string;
}
