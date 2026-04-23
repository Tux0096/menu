declare namespace cp {
  interface Payer {
    firstName: string;
    phone: string;
    lastName?: string;
    middleName?: string;
    birth?: string;
    address?: string;
    street?: string;
    city?: string;
    country?: string;
    postcode?: string;
  }

  interface PaymentOptions {
    publicId: string;
    description: string;
    amount: number;
    currency: string;
    invoiceId?: number;
    skin?: string;
    autoClose?: number;
    payer: Payer;
  }

  interface PaymentCallbacks {
    onSuccess: (options: any) => void;
    onFail: (reason: any, options: any) => void;
    onComplete: (paymentResult: any, options: any) => void;
  }

  class CloudPayments {
    pay(method: string, options: PaymentOptions, callbacks: PaymentCallbacks): void;
  }
}
