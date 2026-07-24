export type SslCommerzInitResponse = {
  status?: string;
  failedreason?: string;
  GatewayPageURL?: string;
  sessionkey?: string;
  [key: string]: unknown;
};

export type SslCommerzValidationResponse = {
  status?: string;
  tran_id?: string;
  amount?: string;
  store_amount?: string;
  currency?: string;
  val_id?: string;
  [key: string]: unknown;
};
