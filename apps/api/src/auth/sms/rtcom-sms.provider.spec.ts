import { ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { formatOtpSmsMessage } from '@easymatch/shared';
import { RtcomSmsProvider } from './rtcom-sms.provider';

describe('RtcomSmsProvider', () => {
  const config = {
    get: jest.fn((key: string) => {
      const values: Record<string, string> = {
        SMS_RTCOM_ACODE: 'ACC1',
        SMS_RTCOM_API_KEY: 'key-1',
        SMS_RTCOM_SENDER_ID: 'EASYMT',
      };
      return values[key];
    }),
  } as unknown as ConfigService;

  beforeEach(() => {
    jest.restoreAllMocks();
  });

  it('formats Bangla copy with English digits', () => {
    expect(formatOtpSmsMessage('482913')).toBe(
      'ইজিম্যাচবিডি ওটিপি 482913 যা 5 মিনিটের মধ্যে মেয়াদ উত্তীর্ণ হবে',
    );
    expect(formatOtpSmsMessage('482913', { androidAppHash: 'AbCdEfGhIjK' })).toContain(
      'AbCdEfGhIjK',
    );
  });

  it('posts a unicode transactional SMS', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      json: async () => ({
        response: { code: 200, message: 'Success' },
        info: { requestID: 'req-1' },
      }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const provider = new RtcomSmsProvider(config);
    await provider.sendOtp('+8801712345678', '482913');

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.rtcom.xyz/onetomany',
      expect.objectContaining({ method: 'POST', signal: expect.any(AbortSignal) }),
    );
    const payload = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    expect(payload.type).toBe('unicode');
    expect(payload.transactionType).toBe('T');
    expect(payload.contentID).toBe('');
    expect(payload.contacts).toBe('+8801712345678');
    expect(payload.msg).toContain('482913');
  });

  it('fails closed when the gateway rejects the send', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      json: async () => ({
        response: { code: 301, message: 'Failed for low balance' },
      }),
    }) as unknown as typeof fetch;

    const provider = new RtcomSmsProvider(config);
    await expect(provider.sendOtp('+8801712345678', '482913')).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });

  it('retries a dropped connection then succeeds', async () => {
    const fetchMock = jest
      .fn()
      .mockRejectedValueOnce(new Error('fetch failed'))
      .mockResolvedValueOnce({
        status: 200,
        json: async () => ({
          response: { code: 200, message: 'Success' },
          info: { requestID: 'req-2' },
        }),
      });
    global.fetch = fetchMock as unknown as typeof fetch;

    const provider = new RtcomSmsProvider(config);
    await provider.sendOtp('+8801712345678', '482913');

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
