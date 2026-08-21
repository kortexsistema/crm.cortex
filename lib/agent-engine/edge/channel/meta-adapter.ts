import type pg from 'pg';

import type {
  ChannelAdapter,
  ChannelCapabilities,
  ChannelCost,
  ChannelSendInput,
  ChannelSendResult,
  ChannelSessionHealth,
} from '../../channel-adapter';

import { CrmTransportError, type CrmEdgeConfig } from '../crm/mcp-client';
import { sendTurnMessage, SendToolError } from '../crm/send-message';
import { SESSION_HEALTHY_STATUS } from '../crm/session-watchdog';

export const META_CLOUD_VIA_CRM_CHANNEL = 'meta_cloud_via_crm';

export class MetaChannelAdapter implements ChannelAdapter {
  readonly channel = META_CLOUD_VIA_CRM_CHANNEL;
  private readonly db: pg.Pool;
  private readonly crmCfg: CrmEdgeConfig;

  constructor(db: pg.Pool, crmCfg: CrmEdgeConfig) {
    this.db = db;
    this.crmCfg = crmCfg;
  }

  async send(input: ChannelSendInput): Promise<ChannelSendResult> {
    try {
      // Diferente de outros adapters, o MetaChannelAdapter não altera o payload e delega os metadados oficias do template para o sendTurnMessage
      const outcome = await sendTurnMessage(this.db, this.crmCfg, input);
      switch (outcome.kind) {
        case 'sent':
          return { kind: 'sent', idempotencyKey: outcome.idempotencyKey, messageId: outcome.crmMessageId };
        case 'already_sent':
          return { kind: 'already_sent', idempotencyKey: outcome.idempotencyKey, messageId: outcome.crmMessageId };
        case 'queued':
          return { kind: 'queued', idempotencyKey: outcome.idempotencyKey, messageId: outcome.crmMessageId };
        case 'blocked':
          return { kind: 'blocked', idempotencyKey: outcome.idempotencyKey };
        case 'failed':
          return { kind: 'failed', idempotencyKey: outcome.idempotencyKey, messageId: outcome.crmMessageId };
      }
    } catch (err) {
      if (err instanceof CrmTransportError || err instanceof SendToolError) {
        return { kind: 'unavailable', reason: err.name };
      }
      throw err;
    }
  }

  async sessionHealth(channelSessionId: string): Promise<ChannelSessionHealth> {
    const { rows } = await this.db.query<{ status: string; changed_at: string | null }>(
      `select status, status_changed_at::text as changed_at
       from channel_session_health where channel_session_id = $1`,
      [channelSessionId],
    );
    const row = rows[0];
    if (row === undefined) {
      return { healthy: false, status: 'unknown', since: null };
    }
    return {
      healthy: row.status === SESSION_HEALTHY_STATUS,
      status: row.status,
      since: row.changed_at ? new Date(row.changed_at).getTime() : null,
    };
  }

  capabilities(): ChannelCapabilities {
    // Cloud API não permite freeform fora da janela de 24h
    return { freeformAnytime: false, serviceWindowHours: 24 };
  }

  costPerMessage(): ChannelCost {
    // Cloud API é cobrada por mensagem
    return { perMessageUsdCents: 1, model: 'per_message' };
  }
}
