export type VideoCallStatus =
  | "scheduled"
  | "ringing"
  | "active"
  | "completed"
  | "cancelled"
  | "declined"
  | "missed";

export type VideoCallItem = {
  id: string;
  connectionId: string;
  initiatorId: string;
  isInitiator: boolean;
  scheduledAt: string | null;
  status: VideoCallStatus;
  startedAt: string | null;
  endedAt: string | null;
  createdAt: string;
  updatedAt: string;
  consultantEngagementId?: string | null;
};

export type VideoCallLogItem = VideoCallItem & {
  partnerName: string | null;
  partnerProfileCode: string | null;
  canCallBack: boolean;
};

export type VideoCallAlertKind =
  | "incoming"
  | "scheduled_partner"
  | "scheduled_reminder"
  | "scheduled_starting";

export type VideoCallAlertItem = {
  kind: VideoCallAlertKind;
  call: VideoCallItem;
  partnerName: string | null;
};
