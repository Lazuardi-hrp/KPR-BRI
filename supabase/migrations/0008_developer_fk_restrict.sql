-- ============================================================
-- KPR BRI — Migrasi 0008_developer_fk_restrict
--
-- profiles.developer_id memakai ON DELETE SET NULL, tetapi
-- profiles_role_developer_ck mewajibkan 'pengembang' punya developer_id
-- yang tidak null. Akibatnya aksi FK itu TIDAK PERNAH bisa berhasil untuk
-- seorang pengembang: menghapus baris developers memicu error 23514 yang
-- membingungkan alih-alih pesan yang jelas.
--
-- Ditemukan saat membersihkan fixture uji RLS §17.2.
--
-- RESTRICT membuat kegagalannya jujur dan lebih awal. Prosedur mencabut
-- pengembang ada di docs/RUNBOOK.md.
--
-- Rollback: ... on delete set null;
-- ============================================================

alter table public.profiles drop constraint profiles_developer_fk;
alter table public.profiles
  add constraint profiles_developer_fk
  foreign key (developer_id) references public.developers(id) on delete restrict;
