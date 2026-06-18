// cp is a global variable from https://widget.cloudpayments.ru/bundles/cloudpayments.js

export interface IPaymentData {
  publicId: string;
  amount: number;
  invoiceId: number;
  firstName: string;
  phone: string;
}

export type SuccessCallback = (options: any) => void;
export type FailCallback = (reason: any, options: any) => void;
export type CompleteCallback = (paymentResult: any, options: any) => void;

/**
 * Executes the payment process using CloudPayments widget.
 *
 * @param {IPaymentData} data - Payment information.
 * @param {SuccessCallback} onSuccess - Callback on successful payment.
 * @param {FailCallback} onFail - Callback on failed payment.
 * @param {CompleteCallback} onComplete - Callback on completion of payment process.
 */
export function pay(
  data: IPaymentData,
  onSuccess?: SuccessCallback,
  onFail?: FailCallback,
  onComplete?: CompleteCallback,
) {
  if (!cp) {
    console.error('CloudPayments global object (cp) is not defined.');
    return;
  }

  const {
    publicId,
    amount,
    invoiceId,
    firstName,
    phone,
  } = data;

  const widget = new cp.CloudPayments();

  widget.pay(
    'auth',
    {
      publicId,
      description: 'Оплата заказа Фуджи',
      amount,
      currency: 'RUB',
      invoiceId,
      skin: 'mini',
      autoClose: 3,
      payer: {
        firstName,
        phone,
      },
    },
    {
      onSuccess,
      onFail,
      onComplete,
    },
  );
}
