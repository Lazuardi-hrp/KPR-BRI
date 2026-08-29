-- ============================================================
-- KPR BRI — Migrasi 0006_cron
-- pg_cron + pg_net: retensi UU PDP, sapuan outbox, pemangkasan analitik.
--
-- PENTING: ekspresi cron dievaluasi dalam UTC, operasional WIB (UTC+7).
--   02:00 WIB = '0 19 * * *'   03:00 WIB = '0 20 * * *'
-- Ini kesalahan pg_cron yang paling sering terjadi; salah di sini berarti
-- purge data pribadi berjalan di tengah jam kerja.
--
-- Rollback: select cron.unschedule('purge-leads'), dst.
-- ============================================================

create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;

set search_path = public, extensions;

create or replace function public.sweep_notification_outbox()
returns integer
language plpgsql
security definer
set search_path = public, extensions
as $$
declare v_url text; v_key text; v_n integer := 0; r record;
begin
  update public.notification_outbox
     set status = 'dead'
   where status = 'failed' and attempts >= 6;

  select value ->> 0 into v_url
    from public.app_settings where key = 'notify_lead_url';
  begin
    select decrypted_secret into v_key
      from vault.decrypted_secrets where name = 'service_role_key';
  exception when others then
    v_key := null;
  end;

  if v_url is null or v_url = '' or v_key is null then
    raise warning 'sweep_notification_outbox: konfigurasi belum lengkap, antrean dibiarkan utuh';
    return 0;
  end if;

  for r in
    update public.notification_outbox
       set status      = 'pending',
           attempts    = attempts + 1,
           next_try_at = now() + (interval '5 minutes' * power(2, attempts))
     where status = 'failed' and attempts < 6 and next_try_at <= now()
    returning id
  loop
    perform net.http_post(
      url     := v_url,
      headers := jsonb_build_object('Content-Type','application/json',
                                    'Authorization','Bearer ' || v_key),
      body    := jsonb_build_object('outbox_id', r.id),
      timeout_milliseconds := 5000);
    v_n := v_n + 1;
  end loop;
  return v_n;
end $$;

-- SECURITY DEFINER + membaca Vault: tanpa revoke ini PostgREST mengeksposnya
-- sebagai RPC anon — persis lubang L-1 yang ditutup di 0003.
revoke execute on function public.sweep_notification_outbox() from public, anon, authenticated;

do $$
begin
  if exists (select 1 from cron.job where jobname = 'purge-leads')  then perform cron.unschedule('purge-leads');  end if;
  if exists (select 1 from cron.job where jobname = 'sweep-outbox') then perform cron.unschedule('sweep-outbox'); end if;
  if exists (select 1 from cron.job where jobname = 'prune-events') then perform cron.unschedule('prune-events'); end if;
end $$;

select cron.schedule('purge-leads',  '0 19 * * *',   $$select public.purge_expired_leads()$$);
select cron.schedule('sweep-outbox', '*/5 * * * *',  $$select public.sweep_notification_outbox()$$);
select cron.schedule('prune-events', '0 20 * * *',
  $$delete from public.housing_events where created_at < now() - interval '180 days'$$);
