/** Android notification channels used by Expo push (mobile app must define matching channels). */
export const PUSH_CHANNEL_MESSAGES = 'messages';
/** `_v2` carries the long custom ringtone; the original channel is retired. */
export const PUSH_CHANNEL_CALLS = 'incoming_calls_v2';
export const PUSH_CHANNEL_ACTIVITY = 'incoming_activity';
export const PUSH_CHANNEL_VERIFICATION = 'verification';

export const MEMBER_INCOMING_PUSH = {
  priority: 'high' as const,
};
