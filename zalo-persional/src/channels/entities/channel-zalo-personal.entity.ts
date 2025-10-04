import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export interface ZaloPersonalCredentials {
  cookie?: any[];
  [key: string]: any;
}

@Entity('channel_zalo_personal')
@Index(['accountId'])
export class ChannelZaloPersonal {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column({ type: 'varchar' })
  name: string;

  @Column({ type: 'varchar', name: 'zalo_account_name' })
  zaloAccountName: string;

  @Column({ type: 'varchar', nullable: true })
  imei?: string;

  @Column({ type: 'varchar', nullable: true, name: 'user_agent' })
  userAgent?: string;

  @Column({ type: 'varchar', nullable: true })
  proxy?: string;

  @Column({ type: 'text', nullable: true, name: 'qr_code' })
  qrCode?: string;

  @Column({ type: 'jsonb', nullable: true })
  cookie?: ZaloPersonalCredentials[];

  @Column({ type: 'int', name: 'account_id' })
  accountId: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Computed properties
  get displayName(): string {
    return `${this.name} (${this.zaloAccountName})`;
  }

  // Helper methods
  sendMessageOnZalo(messageId: number, outgoingContent: string): void {
    // Forward to job queue or service
    // This would integrate with Chatwoot's job system
  }

  extractThreadId(conversationAttributes: any): string | null {
    return conversationAttributes?.['zalo_thread_id'] || null;
  }

  extractZaloUserId(conversationAttributes: any): string | null {
    return conversationAttributes?.['zalo_user_id'] || null;
  }

  handleErrorMessage(messageId: number, error: any): void {
    // Update message status to failed
    // This would integrate with Chatwoot's message service
  }
}
