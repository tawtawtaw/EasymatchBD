import { All, Controller, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import { ConsultantPaymentService } from './consultant-payment.service';

function mergeCallbackPayload(req: Request): Record<string, string | undefined> {
  const merged: Record<string, string | undefined> = {};

  function assign(source: Record<string, unknown>) {
    for (const [key, value] of Object.entries(source)) {
      if (typeof value === 'string') {
        merged[key] = value;
      } else if (Array.isArray(value) && typeof value[0] === 'string') {
        merged[key] = value[0];
      }
    }
  }

  assign(req.query as Record<string, unknown>);
  assign((req.body ?? {}) as Record<string, unknown>);
  return merged;
}

@Controller('consultant/payments/sslcommerz')
export class ConsultantSslCommerzCallbackController {
  constructor(private readonly payments: ConsultantPaymentService) {}

  @All('ipn')
  async ipn(@Req() req: Request, @Res() res: Response) {
    const payload = mergeCallbackPayload(req);
    const ok = await this.payments.handleIpn(payload);
    res.status(200).send(ok ? 'Successful' : 'Failed');
  }

  @All('success')
  async success(@Req() req: Request, @Res() res: Response) {
    const payload = mergeCallbackPayload(req);
    const result = await this.payments.handleBrowserReturn(payload, 'success');
    const locale = 'en';
    const query = {
      tran_id: payload.tran_id,
      val_id: payload.val_id,
      connection_id: payload.value_b,
    };
    if (result.ok) {
      res.redirect(
        302,
        this.payments.webRedirectPath('success', locale, query),
      );
      return;
    }
    res.redirect(302, this.payments.webRedirectPath('fail', locale, query));
  }

  @All('fail')
  async fail(@Req() req: Request, @Res() res: Response) {
    const payload = mergeCallbackPayload(req);
    await this.payments.handleBrowserReturn(payload, 'fail');
    res.redirect(302, this.payments.webRedirectPath('fail', 'en'));
  }

  @All('cancel')
  async cancel(@Req() req: Request, @Res() res: Response) {
    const payload = mergeCallbackPayload(req);
    await this.payments.handleBrowserReturn(payload, 'cancel');
    res.redirect(302, this.payments.webRedirectPath('cancel', 'en'));
  }
}
