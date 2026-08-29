-- ============================================================
-- KPR BRI — Sebelas skenario keamanan wajib (PRD §17.2)
--
-- Jalankan di SQL Editor Supabase atau lewat apply/execute. Skrip ini membuat
-- fixture-nya sendiri, menjalankan tiap skenario dengan peran yang sesuai,
-- mencetak tabel lolos/gagal, lalu membersihkan seluruh jejaknya.
--
-- CATATAN PENTING soal peran: perubahan `set_config('role', ...)` bersifat
-- transaction-local, DAN akan dibatalkan ketika sebuah blok BEGIN...EXCEPTION
-- menangkap galat. Karena itu tiap skenario mengembalikan peran ke 'postgres'
-- SECARA EKSPLISIT sebelum menulis hasil — kalau tidak, INSERT hasilnya sendiri
-- akan ditolak dan yang tercatat adalah kegagalan palsu.
--
-- Skenario 11 ("kredensial admin123 masih berfungsi") tidak ada di sini karena
-- bersifat frontend: diverifikasi dengan `grep -rn admin123 src/` (harus nol)
-- dan dengan mencoba masuk memakai kata sandi itu di /admin/login.
-- ============================================================

drop table if exists public._uji_hasil;
create table public._uji_hasil (no int, skenario text, harapan text, hasil text, lolos boolean);

do $$
declare
  v_admin uuid := '11111111-1111-1111-1111-111111111111';
  v_pa    uuid := '22222222-2222-2222-2222-222222222222';
  v_pb    uuid := '33333333-3333-3333-3333-333333333333';
  v_da uuid; v_db uuid; v_draft uuid; v_pub uuid; v_lead uuid; n int; u uuid;
begin
  -- ---------- fixture ----------
  insert into public.developers (name, slug) values ('Uji Pengembang A','uji-a')
    on conflict (slug) do update set name = excluded.name returning id into v_da;
  insert into public.developers (name, slug) values ('Uji Pengembang B','uji-b')
    on conflict (slug) do update set name = excluded.name returning id into v_db;

  foreach u in array array[v_admin, v_pa, v_pb] loop
    insert into auth.users (id, instance_id, aud, role, email, encrypted_password,
                            email_confirmed_at, created_at, updated_at,
                            raw_app_meta_data, raw_user_meta_data)
    values (u,'00000000-0000-0000-0000-000000000000','authenticated','authenticated',
            'uji-' || left(u::text,8) || '@example.invalid',
            crypt('x', gen_salt('bf')), now(), now(), now(), '{}'::jsonb, '{}'::jsonb)
    on conflict (id) do nothing;
  end loop;

  update public.profiles set role='admin',      developer_id=null where id=v_admin;
  update public.profiles set role='pengembang', developer_id=v_da  where id=v_pa;
  update public.profiles set role='pengembang', developer_id=v_db  where id=v_pb;

  insert into public.housings (legacy_id, slug, name, developer_id, address, lat, lng,
                               price_min, price_max, subsidi_units, sold_subsidi_units,
                               status, needs_review)
  values (901,'uji-draft-milik-a','Uji Draft Milik A', v_da,'Jl Uji',2.96,99.05,
          150000000,150000000,10,2,'draft',true)
  on conflict (legacy_id) do update set developer_id = excluded.developer_id
  returning id into v_draft;

  select id into v_pub from public.housings where status='published' limit 1;

  insert into public.leads (housing_id, name, phone, consent_at, consent_version, ip_hash)
  values (v_draft,'Uji Prospek A','081234567890',now(),'v1','hash-uji-a');

  -- ---------- 1. anon membaca leads ----------
  begin
    perform set_config('role','anon',true);
    execute 'select count(*) from public.leads' into n;
    perform set_config('role','postgres',true);
    insert into public._uji_hasil values (1,'anon membaca leads','ditolak','TERBACA: '||n,false);
  exception when others then
    perform set_config('role','postgres',true);
    insert into public._uji_hasil values (1,'anon membaca leads','ditolak',sqlerrm,true);
  end;

  -- ---------- 2. anon INSERT langsung ke leads ----------
  begin
    perform set_config('role','anon',true);
    execute format('insert into public.leads (housing_id,name,phone,consent_at,consent_version)
                    values (%L,''Peretas'',''081200000000'',now(),''v1'')', v_pub);
    perform set_config('role','postgres',true);
    insert into public._uji_hasil values (2,'anon INSERT ke leads','ditolak','BERHASIL MENULIS',false);
  exception when others then
    perform set_config('role','postgres',true);
    insert into public._uji_hasil values (2,'anon INSERT ke leads','ditolak',sqlerrm,true);
  end;

  -- ---------- 3. anon UPDATE harga perumahan ----------
  begin
    perform set_config('role','anon',true);
    execute format('update public.housings set price_min = 1 where id = %L', v_pub);
    get diagnostics n = row_count;
    perform set_config('role','postgres',true);
    insert into public._uji_hasil values (3,'anon UPDATE harga','ditolak',
      case when n=0 then 'row_count=0' else 'MENGUBAH '||n||' BARIS' end, n=0);
  exception when others then
    perform set_config('role','postgres',true);
    insert into public._uji_hasil values (3,'anon UPDATE harga','ditolak',sqlerrm,true);
  end;

  -- ---------- 4. anon membaca perumahan draft ----------
  begin
    perform set_config('role','anon',true);
    execute format('select count(*) from public.housings where id = %L', v_draft) into n;
    perform set_config('role','postgres',true);
    insert into public._uji_hasil values (4,'anon membaca draft','tidak terlihat','count='||n, n=0);
  exception when others then
    perform set_config('role','postgres',true);
    insert into public._uji_hasil values (4,'anon membaca draft','tidak terlihat',sqlerrm,false);
  end;

  -- ---------- 5. Pengembang B membaca draft milik A ----------
  begin
    perform set_config('role','authenticated',true);
    perform set_config('request.jwt.claims','{"sub":"33333333-3333-3333-3333-333333333333","role":"authenticated"}',true);
    execute format('select count(*) from public.housings where id = %L', v_draft) into n;
    perform set_config('role','postgres',true);
    insert into public._uji_hasil values (5,'pengembang B baca draft milik A','tidak terlihat','count='||n, n=0);
  exception when others then
    perform set_config('role','postgres',true);
    insert into public._uji_hasil values (5,'pengembang B baca draft milik A','tidak terlihat',sqlerrm,false);
  end;

  -- ---------- 5b. KONTROL POSITIF: pengembang A melihat miliknya ----------
  begin
    perform set_config('role','authenticated',true);
    perform set_config('request.jwt.claims','{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}',true);
    execute format('select count(*) from public.housings where id = %L', v_draft) into n;
    perform set_config('role','postgres',true);
    insert into public._uji_hasil values (51,'KONTROL pengembang A baca draft miliknya','terlihat','count='||n, n=1);
  exception when others then
    perform set_config('role','postgres',true);
    insert into public._uji_hasil values (51,'KONTROL pengembang A baca draft miliknya','terlihat',sqlerrm,false);
  end;

  -- ---------- 6. Pengembang B membaca prospek milik A ----------
  begin
    perform set_config('role','authenticated',true);
    perform set_config('request.jwt.claims','{"sub":"33333333-3333-3333-3333-333333333333","role":"authenticated"}',true);
    execute 'select count(*) from public.leads' into n;
    perform set_config('role','postgres',true);
    insert into public._uji_hasil values (6,'pengembang B baca prospek milik A','tidak terlihat','count='||n, n=0);
  exception when others then
    perform set_config('role','postgres',true);
    insert into public._uji_hasil values (6,'pengembang B baca prospek milik A','tidak terlihat',sqlerrm,false);
  end;

  -- ---------- 7. rate limit: pengajuan ke-4 dalam satu jam ----------
  begin
    perform set_config('role','anon',true);
    for n in 1..3 loop
      execute format('select public.submit_lead(%L,''Uji RL %s'',''08123456789%s'',null,null,''v1'',''hash-rate-limit'',null)', v_pub, n, n) into v_lead;
    end loop;
    perform set_config('role','postgres',true);
    insert into public._uji_hasil values (71,'KONTROL 3 pengajuan pertama','diterima','3 lead tersimpan',true);
  exception when others then
    perform set_config('role','postgres',true);
    insert into public._uji_hasil values (71,'KONTROL 3 pengajuan pertama','diterima',sqlerrm,false);
  end;

  begin
    perform set_config('role','anon',true);
    execute format('select public.submit_lead(%L,''Uji RL 4'',''081234567894'',null,null,''v1'',''hash-rate-limit'',null)', v_pub) into v_lead;
    perform set_config('role','postgres',true);
    insert into public._uji_hasil values (7,'pengajuan ke-4 dari ip sama','ditolak','DITERIMA',false);
  exception when others then
    perform set_config('role','postgres',true);
    insert into public._uji_hasil values (7,'pengajuan ke-4 dari ip sama','ditolak',sqlerrm,true);
  end;

  -- ---------- 8. submit_lead ke perumahan draft ----------
  begin
    perform set_config('role','anon',true);
    execute format('select public.submit_lead(%L,''Uji Draft'',''081211112222'',null,null,''v1'',''hash-uji-draft'',null)', v_draft) into v_lead;
    perform set_config('role','postgres',true);
    insert into public._uji_hasil values (8,'submit_lead ke draft','ditolak','DITERIMA',false);
  exception when others then
    perform set_config('role','postgres',true);
    insert into public._uji_hasil values (8,'submit_lead ke draft','ditolak',sqlerrm,true);
  end;

  -- ---------- 9. available_units diisi manual ----------
  begin
    execute format('update public.housings set available_units = 999 where id = %L', v_pub);
    insert into public._uji_hasil values (9,'available_units diisi manual','ditolak','BERHASIL DIUBAH',false);
  exception when others then
    insert into public._uji_hasil values (9,'available_units diisi manual','ditolak',sqlerrm,true);
  end;

  -- ---------- 10. terjual > total ----------
  begin
    execute format('update public.housings set sold_subsidi_units = subsidi_units + 1 where id = %L', v_pub);
    insert into public._uji_hasil values (10,'terjual > total unit','ditolak','BERHASIL DIUBAH',false);
  exception when others then
    insert into public._uji_hasil values (10,'terjual > total unit','ditolak',sqlerrm,true);
  end;

  -- ---------- 12. anon memanggil purge_expired_leads (lubang L-1) ----------
  begin
    perform set_config('role','anon',true);
    execute 'select public.purge_expired_leads()' into n;
    perform set_config('role','postgres',true);
    insert into public._uji_hasil values (12,'anon panggil purge_expired_leads','ditolak','BERHASIL MENGHAPUS DATA',false);
  exception when others then
    perform set_config('role','postgres',true);
    insert into public._uji_hasil values (12,'anon panggil purge_expired_leads','ditolak',sqlerrm,true);
  end;

  -- ---------- 13. profil: pembaruan sah berhasil, eskalasi ditolak ----------
  -- Menangkap cacat rekursi RLS: kebijakan yang gagal TERTUTUP tetap lolos uji
  -- eskalasi, padahal ia juga memblokir pemakaian yang sah. Karena itu di sini
  -- ada kontrol positif DAN dua kontrol negatif.
  begin
    perform set_config('role','authenticated',true);
    perform set_config('request.jwt.claims','{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}',true);
    execute format('update public.profiles set full_name = ''Nama Diubah'' where id = %L', v_pa);
    get diagnostics n = row_count;
    perform set_config('role','postgres',true);
    insert into public._uji_hasil values (13,'KONTROL pengembang ubah nama sendiri','berhasil','row_count='||n, n=1);
  exception when others then
    perform set_config('role','postgres',true);
    insert into public._uji_hasil values (13,'KONTROL pengembang ubah nama sendiri','berhasil',sqlerrm,false);
  end;

  begin
    perform set_config('role','authenticated',true);
    perform set_config('request.jwt.claims','{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}',true);
    execute format('update public.profiles set role = ''admin'' where id = %L', v_pa);
    get diagnostics n = row_count;
    perform set_config('role','postgres',true);
    insert into public._uji_hasil values (14,'pengembang naikkan diri jadi admin','ditolak',
      case when n=0 then 'row_count=0' else 'BERHASIL ESKALASI' end, n=0);
  exception when others then
    perform set_config('role','postgres',true);
    insert into public._uji_hasil values (14,'pengembang naikkan diri jadi admin','ditolak',
      'ditolak: '||sqlerrm, sqlerrm not like '%recursion%');
  end;

  begin
    perform set_config('role','authenticated',true);
    perform set_config('request.jwt.claims','{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}',true);
    execute format('update public.profiles set developer_id = %L where id = %L', v_db, v_pa);
    get diagnostics n = row_count;
    perform set_config('role','postgres',true);
    insert into public._uji_hasil values (15,'pengembang pindah ke developer lain','ditolak',
      case when n=0 then 'row_count=0' else 'BERHASIL ESKALASI' end, n=0);
  exception when others then
    perform set_config('role','postgres',true);
    insert into public._uji_hasil values (15,'pengembang pindah ke developer lain','ditolak',
      'ditolak: '||sqlerrm, sqlerrm not like '%recursion%');
  end;

  -- ---------- pembersihan ----------
  perform set_config('role','postgres',true);
  delete from public.leads where ip_hash in ('hash-uji-a','hash-rate-limit','hash-uji-draft');
  -- Hanya buang antrean milik prospek uji yang baru saja dihapus. Menghapus
  -- seluruh isi notification_outbox akan ikut membuang notifikasi sungguhan
  -- yang belum terkirim.
  delete from public.notification_outbox o
   where o.template = 'lead_baru'
     and not exists (select 1 from public.leads l
                      where l.id = (o.payload ->> 'lead_id')::uuid);
  delete from public.housings where legacy_id = 901;
  delete from auth.users where email like 'uji-%@example.invalid';
  delete from public.developers where slug in ('uji-a','uji-b');
end $$;

select no, skenario, harapan, hasil,
       case when lolos then 'LOLOS' else 'GAGAL' end as status
from public._uji_hasil order by no;

select count(*) filter (where lolos) as lolos,
       count(*) filter (where not lolos) as gagal
from public._uji_hasil;

drop table public._uji_hasil;
