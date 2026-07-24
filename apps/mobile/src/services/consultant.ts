import type { ConsultantServiceType, ConsultantTariff } from "@easymatch/shared";
import { apiRequest } from "./api/client";

export type ConsultantEngagementItem = {
  id: string;
  connectionId: string;
  serviceType: ConsultantServiceType;
  serviceLabelEn: string;
  amountBdt: string;
  currency: string;
  requestedById: string;
  status: string;
  assignedConsultantId: string | null;
  memberNotes: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ConsultantCheckoutResult = {
  gatewayUrl: string;
  tranId: string;
};

export type ConsultantConfirmResult = {
  synced: boolean;
  paymentStatus: string | null;
  engagement: ConsultantEngagementItem | null;
};

export type ConsultantCaseMessage = {
  id: string;
  body: string;
  createdAt: string;
  audience: "both" | "member";
  recipient: { id: string; displayName: string } | null;
  sender: {
    id: string;
    role: string;
    isConsultant: boolean;
    displayName: string;
  };
  isMine: boolean;
};

export type ConsultantMeeting = {
  id: string;
  scheduledAt: string;
  agenda: string | null;
  status: string;
  videoCall: {
    id: string;
    status: string;
    scheduledAt: string | null;
  } | null;
  createdAt: string;
};

export type ConsultantCaseDetail = {
  id: string;
  connectionId: string;
  serviceType: string;
  serviceLabelEn: string;
  amountBdt: string;
  status: string;
  assignedConsultantId: string | null;
  memberNotes: string | null;
  createdAt: string;
  requester: { fullName: string | null; profileCode: string | null };
  connection: {
    privacyLevel: number;
    memberLow: {
      userId: string;
      fullName: string | null;
      profileCode: string | null;
    };
    memberHigh: {
      userId: string;
      fullName: string | null;
      profileCode: string | null;
    };
  };
  linkedVideoCall: {
    id: string;
    status: string;
    scheduledAt: string | null;
  } | null;
  viewerIsConsultant: boolean;
  viewerIsMember: boolean;
};

export async function getConsultantTariffs(): Promise<ConsultantTariff[]> {
  return apiRequest<ConsultantTariff[]>("/consultant-tariffs", { auth: false });
}

export async function listConnectionConsultantEngagements(
  connectionId: string,
): Promise<ConsultantEngagementItem[]> {
  return apiRequest<ConsultantEngagementItem[]>(
    `/consultant/engagements?connectionId=${encodeURIComponent(connectionId)}`,
  );
}

export async function startConsultantCheckout(body: {
  connectionId: string;
  serviceType: ConsultantServiceType;
  memberNotes?: string;
}): Promise<ConsultantCheckoutResult> {
  return apiRequest<ConsultantCheckoutResult>("/consultant/checkout", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function confirmConsultantPayment(options?: {
  tranId?: string;
  valId?: string;
}): Promise<ConsultantConfirmResult> {
  return apiRequest<ConsultantConfirmResult>("/consultant/payments/confirm", {
    method: "POST",
    body: JSON.stringify({
      tranId: options?.tranId,
      valId: options?.valId,
    }),
  });
}

export async function getConsultantCaseDetail(caseId: string): Promise<ConsultantCaseDetail> {
  return apiRequest<ConsultantCaseDetail>(`/consultant/cases/${caseId}`);
}

export async function listConsultantCaseMessages(
  caseId: string,
): Promise<ConsultantCaseMessage[]> {
  return apiRequest<ConsultantCaseMessage[]>(`/consultant/cases/${caseId}/messages`);
}

export async function sendConsultantCaseMessage(
  caseId: string,
  body: string,
): Promise<ConsultantCaseMessage> {
  return apiRequest<ConsultantCaseMessage>(`/consultant/cases/${caseId}/messages`, {
    method: "POST",
    body: JSON.stringify({ body }),
  });
}

export async function listConsultantMeetings(caseId: string): Promise<ConsultantMeeting[]> {
  return apiRequest<ConsultantMeeting[]>(`/consultant/cases/${caseId}/meetings`);
}
