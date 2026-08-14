-- Delivery tracking for AMAREE Club reward notifications.

alter table public.loyalty_rewards
  add column if not exists notification_email_message_id uuid references public.email_messages(id) on delete set null,
  add column if not exists notification_sent_at timestamptz;

create index if not exists loyalty_rewards_notification_pending_idx
  on public.loyalty_rewards(created_at)
  where notification_sent_at is null and status = 'available';
