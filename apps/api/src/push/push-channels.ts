/** Android notification channels used by Expo push (mobile app must define matching channels). */
export const PUSH_CHANNEL_MESSAGES = 'messages';
export const PUSH_CHANNEL_CALLS = 'incoming_calls';
export const PUSH_CHANNEL_ACTIVITY = 'incoming_activity';
export const PUSH_CHANNEL_VERIFICATION = 'verification';

export const MEMBER_INCOMING_PUSH = {
  priority: 'high' as const,
};
