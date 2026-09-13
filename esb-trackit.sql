--
-- PostgreSQL database dump
--

\restrict z7IURKKLinyEZtK6Cbw7NRp8bBPQCl8gUjonb0aNGRaShC8V0M8kOOdsRa4MCeC

-- Dumped from database version 18.4
-- Dumped by pg_dump version 18.4

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: auto_update_timestamp(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.auto_update_timestamp() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


--
-- Name: prevent_hard_delete(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.prevent_hard_delete() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    RAISE EXCEPTION 'Hard delete prohibited for %. Use soft delete by setting deleted_at.', TG_TABLE_NAME USING ERRCODE = 'integrity_constraint_violation';
END;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: account_security_state; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.account_security_state (
    account_key character varying(255) NOT NULL,
    failed_attempt_count integer DEFAULT 0 NOT NULL,
    first_failed_at timestamp with time zone,
    last_failed_at timestamp with time zone,
    locked_until timestamp with time zone,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: app_schema_migrations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.app_schema_migrations (
    version integer NOT NULL,
    name character varying(160) NOT NULL,
    checksum_sha256 character(64) NOT NULL,
    applied_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    applied_by character varying(150) NOT NULL,
    recovery_proof_id character varying(160) NOT NULL,
    change_id character varying(160),
    execution_ms integer NOT NULL,
    CONSTRAINT app_schema_migrations_execution_ms_check CHECK ((execution_ms >= 0))
);


--
-- Name: aset_ga; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.aset_ga (
    id integer NOT NULL,
    hostname character varying(50) NOT NULL,
    quantity integer DEFAULT 1 NOT NULL,
    tipe_fasilitas character varying(50) NOT NULL,
    nama_asset character varying(150) NOT NULL,
    ukuran character varying(100),
    detail text,
    lokasi character varying(100) NOT NULL,
    lokasi_detail character varying(150),
    kondisi character varying(20) DEFAULT 'Baik'::character varying NOT NULL,
    deleted_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT chk_aset_ga_kondisi CHECK (((kondisi)::text = ANY (ARRAY[('Baik'::character varying)::text, ('Rusak Ringan'::character varying)::text, ('Rusak Sedang'::character varying)::text, ('Rusak Berat'::character varying)::text]))),
    CONSTRAINT chk_aset_ga_quantity CHECK ((quantity > 0))
);


--
-- Name: aset_ga_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.aset_ga_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: aset_ga_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.aset_ga_id_seq OWNED BY public.aset_ga.id;


--
-- Name: aset_ops; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.aset_ops (
    id integer NOT NULL,
    hostname character varying(50) NOT NULL,
    nama_asset character varying(150) NOT NULL,
    kategori character varying(50) NOT NULL,
    lokasi character varying(100) NOT NULL,
    pic character varying(150),
    tanggal_beli date,
    total_asset_amount numeric(15,2) DEFAULT 0,
    kondisi character varying(20) DEFAULT 'Baik'::character varying NOT NULL,
    status character varying(20) DEFAULT 'Aktif'::character varying NOT NULL,
    deleted_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT chk_aset_ops_amount CHECK ((total_asset_amount >= (0)::numeric)),
    CONSTRAINT chk_aset_ops_kondisi CHECK (((kondisi)::text = ANY (ARRAY[('Baik'::character varying)::text, ('Rusak Ringan'::character varying)::text, ('Rusak Sedang'::character varying)::text, ('Rusak Berat'::character varying)::text]))),
    CONSTRAINT chk_aset_ops_status CHECK (((status)::text = ANY (ARRAY[('Aktif'::character varying)::text, ('Tidak Aktif'::character varying)::text, ('Maintenance'::character varying)::text, ('Rusak'::character varying)::text, ('Disposed'::character varying)::text])))
);


--
-- Name: aset_ops_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.aset_ops_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: aset_ops_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.aset_ops_id_seq OWNED BY public.aset_ops.id;


--
-- Name: aset_ti; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.aset_ti (
    id integer NOT NULL,
    hostname character varying(50),
    serial_number character varying(50),
    spesifikasi text,
    nik_pemegang_asset character varying(20),
    nama_karyawan_pemegang_asset character varying(150),
    departemen_pemegang_asset character varying(100),
    lokasi_asset character varying(100),
    tipe_perangkat character varying(50),
    brand_merek character varying(50),
    model character varying(100),
    status character varying(20) DEFAULT 'In Use'::character varying NOT NULL,
    kondisi character varying(20) DEFAULT 'Normal'::character varying NOT NULL,
    note_asset character varying(255),
    deleted_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT chk_asset_kondisi CHECK (((kondisi)::text = ANY (ARRAY[('Baru'::character varying)::text, ('Normal'::character varying)::text, ('Rusak Ringan'::character varying)::text, ('Rusak Sedang'::character varying)::text, ('Rusak Berat'::character varying)::text]))),
    CONSTRAINT chk_asset_status CHECK (((status)::text = ANY (ARRAY[('In Use'::character varying)::text, ('Stock'::character varying)::text, ('Damaged'::character varying)::text, ('In Service'::character varying)::text, ('Disposal'::character varying)::text])))
);


--
-- Name: aset_ti_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.aset_ti_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: aset_ti_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.aset_ti_id_seq OWNED BY public.aset_ti.id;


--
-- Name: asset_shipments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.asset_shipments (
    id integer NOT NULL,
    request_date date NOT NULL,
    recipient_name character varying(150) NOT NULL,
    item_description text NOT NULL,
    destination character varying(255) NOT NULL,
    tracking_number character varying(100),
    status character varying(30) DEFAULT 'Menunggu Pickup'::character varying NOT NULL,
    created_by integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    sender_name character varying(150) DEFAULT ''::character varying,
    sender_address text DEFAULT ''::text,
    recipient_address text DEFAULT ''::text,
    item_detail text,
    awb_number character varying(100),
    delivery_proof_url text,
    CONSTRAINT chk_asset_shipments_status CHECK (((status)::text = ANY ((ARRAY['Menunggu Pickup'::character varying, 'Di Pickup'::character varying, 'Dalam Pengiriman'::character varying, 'Terkirim'::character varying, 'Dibatalkan'::character varying, 'belum_dikirim'::character varying, 'pending'::character varying, 'sedang_dikirim'::character varying, 'diterima'::character varying, 'cancel'::character varying])::text[])))
);


--
-- Name: asset_shipments_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.asset_shipments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: asset_shipments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.asset_shipments_id_seq OWNED BY public.asset_shipments.id;


--
-- Name: backup_audit_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.backup_audit_log (
    id integer NOT NULL,
    user_id integer NOT NULL,
    user_name character varying(150),
    operation character varying(50) NOT NULL,
    target_database character varying(100) NOT NULL,
    backup_id integer,
    status character varying(50) DEFAULT 'success'::character varying NOT NULL,
    error_summary text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: backup_audit_log_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.backup_audit_log_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: backup_audit_log_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.backup_audit_log_id_seq OWNED BY public.backup_audit_log.id;


--
-- Name: backup_metadata; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.backup_metadata (
    id integer NOT NULL,
    filename character varying(255) NOT NULL,
    filepath text NOT NULL,
    file_size bigint DEFAULT 0 NOT NULL,
    database_name character varying(100) NOT NULL,
    backup_type character varying(50) DEFAULT 'manual'::character varying NOT NULL,
    status character varying(50) DEFAULT 'success'::character varying NOT NULL,
    checksum character varying(128),
    created_by integer NOT NULL,
    created_by_name character varying(150),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: backup_metadata_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.backup_metadata_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: backup_metadata_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.backup_metadata_id_seq OWNED BY public.backup_metadata.id;


--
-- Name: case_bookmarks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.case_bookmarks (
    id integer NOT NULL,
    user_id integer NOT NULL,
    case_id integer NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: case_bookmarks_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.case_bookmarks_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: case_bookmarks_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.case_bookmarks_id_seq OWNED BY public.case_bookmarks.id;


--
-- Name: cases; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cases (
    id integer NOT NULL,
    title character varying(300) NOT NULL,
    category character varying(100) NOT NULL,
    severity character varying(20) DEFAULT 'medium'::character varying NOT NULL,
    tags jsonb DEFAULT '[]'::jsonb NOT NULL,
    summary text,
    problem_context text,
    action_steps jsonb DEFAULT '[]'::jsonb NOT NULL,
    dos jsonb DEFAULT '[]'::jsonb NOT NULL,
    donts jsonb DEFAULT '[]'::jsonb NOT NULL,
    snippets jsonb DEFAULT '[]'::jsonb NOT NULL,
    status character varying(20) DEFAULT 'DRAFT'::character varying NOT NULL,
    is_custom boolean DEFAULT false NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    content_html text,
    CONSTRAINT chk_cases_severity CHECK (((severity)::text = ANY ((ARRAY['low'::character varying, 'medium'::character varying, 'high'::character varying])::text[]))),
    CONSTRAINT chk_cases_status CHECK (((status)::text = ANY ((ARRAY['DRAFT'::character varying, 'PUBLISHED'::character varying])::text[])))
);


--
-- Name: cases_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.cases_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: cases_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.cases_id_seq OWNED BY public.cases.id;


--
-- Name: karyawan; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.karyawan (
    id integer NOT NULL,
    nik character varying(20) NOT NULL,
    nama_karyawan character varying(150) NOT NULL,
    status character varying(20) DEFAULT 'Active'::character varying NOT NULL,
    title character varying(150) NOT NULL,
    job_level character varying(10) NOT NULL,
    departemen character varying(100) NOT NULL,
    directorate character varying(100) NOT NULL,
    tanggal_mulai_bekerja date NOT NULL,
    employeement_status character varying(20) DEFAULT 'Permanent'::character varying NOT NULL,
    nik_atasan_langsung character varying(20),
    email_kantor character varying(150) NOT NULL,
    lokasi_kerja character varying(100),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT chk_karyawan_employeement_status CHECK (((employeement_status)::text = ANY (ARRAY[('Permanent'::character varying)::text, ('Contract'::character varying)::text, ('Freelance'::character varying)::text, ('Intern'::character varying)::text]))),
    CONSTRAINT chk_karyawan_status CHECK (((status)::text = ANY (ARRAY[('Active'::character varying)::text, ('Outsource'::character varying)::text, ('Resigned'::character varying)::text])))
);


--
-- Name: daftar_aset_ti_lengkap; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.daftar_aset_ti_lengkap AS
 SELECT a.id,
    a.hostname,
    a.serial_number,
    a.spesifikasi,
    k.nik AS nik_pemegang,
    k.nama_karyawan AS nama_karyawan_pemegang,
    k.departemen AS departemen_pemegang,
    k.lokasi_kerja AS lokasi_karyawan,
    a.lokasi_asset,
    a.tipe_perangkat,
    a.brand_merek,
    a.model,
    a.status,
    a.kondisi,
    a.note_asset
   FROM (public.aset_ti a
     LEFT JOIN public.karyawan k ON (((a.nik_pemegang_asset)::text = (k.nik)::text)))
  WHERE (a.deleted_at IS NULL);


--
-- Name: faq; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.faq (
    id integer NOT NULL,
    question character varying(500) NOT NULL,
    answer text NOT NULL,
    category character varying(100) NOT NULL,
    status character varying(20) DEFAULT 'DRAFT'::character varying NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    steps jsonb DEFAULT '[]'::jsonb NOT NULL,
    code_snippet text,
    action_text character varying(150),
    action_link text,
    is_emergency boolean DEFAULT false NOT NULL,
    emergency_title character varying(200),
    emergency_text text,
    CONSTRAINT chk_faq_status CHECK (((status)::text = ANY ((ARRAY['DRAFT'::character varying, 'PUBLISHED'::character varying])::text[])))
);


--
-- Name: faq_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.faq_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: faq_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.faq_id_seq OWNED BY public.faq.id;


--
-- Name: karyawan_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.karyawan_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: karyawan_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.karyawan_id_seq OWNED BY public.karyawan.id;


--
-- Name: kb_categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.kb_categories (
    id integer NOT NULL,
    key character varying(50) NOT NULL,
    title character varying(150) NOT NULL,
    description text,
    icon character varying(50),
    is_featured boolean DEFAULT false NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    status character varying(20) DEFAULT 'PUBLISHED'::character varying NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT chk_kb_categories_status CHECK (((status)::text = ANY ((ARRAY['DRAFT'::character varying, 'PUBLISHED'::character varying])::text[])))
);


--
-- Name: kb_categories_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.kb_categories_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: kb_categories_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.kb_categories_id_seq OWNED BY public.kb_categories.id;


--
-- Name: kb_search_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.kb_search_logs (
    id bigint NOT NULL,
    query character varying(300) NOT NULL,
    results_count integer DEFAULT 0 NOT NULL,
    user_id integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: kb_search_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.kb_search_logs_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: kb_search_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.kb_search_logs_id_seq OWNED BY public.kb_search_logs.id;


--
-- Name: komentar_tiket; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.komentar_tiket (
    id integer NOT NULL,
    id_tiket integer NOT NULL,
    pesan text NOT NULL,
    attachment_data text,
    user_id integer NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    attachment_name character varying(255)
);


--
-- Name: komentar_tiket_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.komentar_tiket_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: komentar_tiket_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.komentar_tiket_id_seq OWNED BY public.komentar_tiket.id;


--
-- Name: log_audit_login; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.log_audit_login (
    id integer NOT NULL,
    user_id integer,
    email character varying(150),
    login_time timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    ip_address character varying(45),
    user_agent text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    status_login character varying(50) DEFAULT 'LOGIN_SUCCESS'::character varying
);


--
-- Name: log_audit_login_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.log_audit_login_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: log_audit_login_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.log_audit_login_id_seq OWNED BY public.log_audit_login.id;


--
-- Name: log_riwayat_aset; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.log_riwayat_aset (
    id integer NOT NULL,
    id_aset integer NOT NULL,
    label_aset character varying(100),
    aksi character varying(50) NOT NULL,
    perubahan text,
    oleh_pengguna character varying(150) DEFAULT 'Sistem'::character varying NOT NULL,
    dibuat_pada timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: log_riwayat_aset_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.log_riwayat_aset_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: log_riwayat_aset_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.log_riwayat_aset_id_seq OWNED BY public.log_riwayat_aset.id;


--
-- Name: log_riwayat_tiket; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.log_riwayat_tiket (
    id integer NOT NULL,
    id_tiket integer NOT NULL,
    action character varying(50) NOT NULL,
    old_value jsonb,
    new_value jsonb,
    actor_name character varying(200) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: log_riwayat_tiket_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.log_riwayat_tiket_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: log_riwayat_tiket_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.log_riwayat_tiket_id_seq OWNED BY public.log_riwayat_tiket.id;


--
-- Name: password_reset_otps; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.password_reset_otps (
    id integer NOT NULL,
    user_id integer NOT NULL,
    email character varying(150) NOT NULL,
    otp_hash text NOT NULL,
    reset_token character varying(255),
    attempts integer DEFAULT 0 NOT NULL,
    max_attempts integer DEFAULT 5 NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    used_at timestamp with time zone,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: password_reset_otps_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.password_reset_otps_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: password_reset_otps_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.password_reset_otps_id_seq OWNED BY public.password_reset_otps.id;


--
-- Name: riwayat_pemakaian_aset; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.riwayat_pemakaian_aset (
    id integer NOT NULL,
    id_aset integer NOT NULL,
    nik_pemegang character varying(20),
    tanggal_mulai timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    tanggal_selesai timestamp without time zone,
    catatan text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: riwayat_pemakaian_aset_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.riwayat_pemakaian_aset_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: riwayat_pemakaian_aset_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.riwayat_pemakaian_aset_id_seq OWNED BY public.riwayat_pemakaian_aset.id;


--
-- Name: ticket_casp_ratings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ticket_casp_ratings (
    id integer NOT NULL,
    id_tiket integer NOT NULL,
    reporter_user_id integer NOT NULL,
    assignee_user_id integer,
    rating_score integer NOT NULL,
    feedback text,
    submitted_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT chk_casp_rating CHECK (((rating_score >= 1) AND (rating_score <= 5)))
);


--
-- Name: ticket_casp_ratings_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.ticket_casp_ratings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: ticket_casp_ratings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.ticket_casp_ratings_id_seq OWNED BY public.ticket_casp_ratings.id;


--
-- Name: ticket_queues; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ticket_queues (
    id integer NOT NULL,
    kode character varying(50) NOT NULL,
    nama character varying(150) NOT NULL,
    deskripsi text,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: ticket_queues_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.ticket_queues_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: ticket_queues_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.ticket_queues_id_seq OWNED BY public.ticket_queues.id;


--
-- Name: tickets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tickets (
    id integer NOT NULL,
    nomor_tiket character varying(20) NOT NULL,
    judul character varying(255) NOT NULL,
    deskripsi text,
    kategori character varying(100),
    prioritas character varying(50) DEFAULT 'Medium'::character varying NOT NULL,
    status_tiket character varying(50) DEFAULT 'Open'::character varying NOT NULL,
    queue_id integer,
    assigned_to_user_id integer,
    pelapor_user_id integer NOT NULL,
    attachment_count integer DEFAULT 0,
    resolved_at timestamp without time zone,
    resolved_by_user_id integer,
    deleted_at timestamp without time zone,
    deleted_by_user_id integer,
    deletion_reason text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT chk_tickets_prioritas CHECK (((prioritas)::text = ANY ((ARRAY['Low'::character varying, 'Medium'::character varying, 'High'::character varying, 'Critical'::character varying])::text[]))),
    CONSTRAINT chk_tickets_status CHECK (((status_tiket)::text = ANY (ARRAY[('Open'::character varying)::text, ('In Progress'::character varying)::text, ('Pending'::character varying)::text, ('Resolved'::character varying)::text, ('Closed'::character varying)::text, ('Cancelled'::character varying)::text])))
);


--
-- Name: tickets_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.tickets_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: tickets_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.tickets_id_seq OWNED BY public.tickets.id;


--
-- Name: tipe_aset_ga; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tipe_aset_ga (
    id integer NOT NULL,
    nama_tipe character varying(100) NOT NULL,
    deskripsi text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    deleted_at timestamp without time zone
);


--
-- Name: tipe_aset_ga_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.tipe_aset_ga_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: tipe_aset_ga_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.tipe_aset_ga_id_seq OWNED BY public.tipe_aset_ga.id;


--
-- Name: user_sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_sessions (
    id integer NOT NULL,
    session_id uuid NOT NULL,
    user_id integer NOT NULL,
    issued_at timestamp without time zone NOT NULL,
    expires_at timestamp without time zone NOT NULL,
    revoked_at timestamp without time zone,
    last_seen_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: user_sessions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.user_sessions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: user_sessions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.user_sessions_id_seq OWNED BY public.user_sessions.id;


--
-- Name: user_ticket_queues; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_ticket_queues (
    id integer NOT NULL,
    user_id integer NOT NULL,
    queue_id integer NOT NULL,
    is_primary boolean DEFAULT false NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: user_ticket_queues_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.user_ticket_queues_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: user_ticket_queues_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.user_ticket_queues_id_seq OWNED BY public.user_ticket_queues.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id integer NOT NULL,
    nama character varying(150) NOT NULL,
    email character varying(150) NOT NULL,
    password_hash text NOT NULL,
    role character varying(50) DEFAULT 'user'::character varying NOT NULL,
    permissions jsonb DEFAULT '{}'::jsonb NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    deleted_at timestamp without time zone,
    deleted_by_id integer,
    deletion_reason text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT chk_users_role CHECK (((role)::text = ANY (ARRAY[('user'::character varying)::text, ('admin'::character varying)::text, ('superadmin'::character varying)::text, ('super admin'::character varying)::text])))
);


--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: v_employee_asset_summary; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_employee_asset_summary AS
 SELECT k.id AS karyawan_id,
    k.nik,
    k.nama_karyawan,
    k.departemen,
    count(a.id) AS total_assets,
    count(a.id) FILTER (WHERE ((a.status)::text = 'In Use'::text)) AS active_assets,
    count(a.id) FILTER (WHERE ((a.status)::text = 'Stock'::text)) AS stock_assets
   FROM (public.karyawan k
     LEFT JOIN public.aset_ti a ON ((((k.nik)::text = (a.nik_pemegang_asset)::text) AND (a.deleted_at IS NULL))))
  GROUP BY k.id, k.nik, k.nama_karyawan, k.departemen;


--
-- Name: v_ticket_stats_per_queue; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_ticket_stats_per_queue AS
 SELECT q.id AS queue_id,
    q.kode AS queue_kode,
    q.nama AS queue_nama,
    count(
        CASE
            WHEN ((t.status_tiket)::text = 'Open'::text) THEN 1
            ELSE NULL::integer
        END) AS open_count,
    count(
        CASE
            WHEN ((t.status_tiket)::text = ANY (ARRAY[('Resolved'::character varying)::text, ('Closed'::character varying)::text])) THEN 1
            ELSE NULL::integer
        END) AS closed_count,
    count(*) FILTER (WHERE ((t.status_tiket)::text = 'Open'::text)) AS total_open,
    count(*) FILTER (WHERE ((t.status_tiket)::text <> 'Open'::text)) AS total_closed
   FROM (public.ticket_queues q
     LEFT JOIN public.tickets t ON (((q.id = t.queue_id) AND (t.deleted_at IS NULL))))
  GROUP BY q.id, q.kode, q.nama;


--
-- Name: aset_ga id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.aset_ga ALTER COLUMN id SET DEFAULT nextval('public.aset_ga_id_seq'::regclass);


--
-- Name: aset_ops id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.aset_ops ALTER COLUMN id SET DEFAULT nextval('public.aset_ops_id_seq'::regclass);


--
-- Name: aset_ti id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.aset_ti ALTER COLUMN id SET DEFAULT nextval('public.aset_ti_id_seq'::regclass);


--
-- Name: asset_shipments id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.asset_shipments ALTER COLUMN id SET DEFAULT nextval('public.asset_shipments_id_seq'::regclass);


--
-- Name: backup_audit_log id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.backup_audit_log ALTER COLUMN id SET DEFAULT nextval('public.backup_audit_log_id_seq'::regclass);


--
-- Name: backup_metadata id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.backup_metadata ALTER COLUMN id SET DEFAULT nextval('public.backup_metadata_id_seq'::regclass);


--
-- Name: case_bookmarks id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.case_bookmarks ALTER COLUMN id SET DEFAULT nextval('public.case_bookmarks_id_seq'::regclass);


--
-- Name: cases id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cases ALTER COLUMN id SET DEFAULT nextval('public.cases_id_seq'::regclass);


--
-- Name: faq id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.faq ALTER COLUMN id SET DEFAULT nextval('public.faq_id_seq'::regclass);


--
-- Name: karyawan id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.karyawan ALTER COLUMN id SET DEFAULT nextval('public.karyawan_id_seq'::regclass);


--
-- Name: kb_categories id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kb_categories ALTER COLUMN id SET DEFAULT nextval('public.kb_categories_id_seq'::regclass);


--
-- Name: kb_search_logs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kb_search_logs ALTER COLUMN id SET DEFAULT nextval('public.kb_search_logs_id_seq'::regclass);


--
-- Name: komentar_tiket id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.komentar_tiket ALTER COLUMN id SET DEFAULT nextval('public.komentar_tiket_id_seq'::regclass);


--
-- Name: log_audit_login id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.log_audit_login ALTER COLUMN id SET DEFAULT nextval('public.log_audit_login_id_seq'::regclass);


--
-- Name: log_riwayat_aset id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.log_riwayat_aset ALTER COLUMN id SET DEFAULT nextval('public.log_riwayat_aset_id_seq'::regclass);


--
-- Name: log_riwayat_tiket id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.log_riwayat_tiket ALTER COLUMN id SET DEFAULT nextval('public.log_riwayat_tiket_id_seq'::regclass);


--
-- Name: password_reset_otps id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.password_reset_otps ALTER COLUMN id SET DEFAULT nextval('public.password_reset_otps_id_seq'::regclass);


--
-- Name: riwayat_pemakaian_aset id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.riwayat_pemakaian_aset ALTER COLUMN id SET DEFAULT nextval('public.riwayat_pemakaian_aset_id_seq'::regclass);


--
-- Name: ticket_casp_ratings id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ticket_casp_ratings ALTER COLUMN id SET DEFAULT nextval('public.ticket_casp_ratings_id_seq'::regclass);


--
-- Name: ticket_queues id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ticket_queues ALTER COLUMN id SET DEFAULT nextval('public.ticket_queues_id_seq'::regclass);


--
-- Name: tickets id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tickets ALTER COLUMN id SET DEFAULT nextval('public.tickets_id_seq'::regclass);


--
-- Name: tipe_aset_ga id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tipe_aset_ga ALTER COLUMN id SET DEFAULT nextval('public.tipe_aset_ga_id_seq'::regclass);


--
-- Name: user_sessions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_sessions ALTER COLUMN id SET DEFAULT nextval('public.user_sessions_id_seq'::regclass);


--
-- Name: user_ticket_queues id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_ticket_queues ALTER COLUMN id SET DEFAULT nextval('public.user_ticket_queues_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Name: account_security_state account_security_state_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.account_security_state
    ADD CONSTRAINT account_security_state_pkey PRIMARY KEY (account_key);


--
-- Name: app_schema_migrations app_schema_migrations_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.app_schema_migrations
    ADD CONSTRAINT app_schema_migrations_name_key UNIQUE (name);


--
-- Name: app_schema_migrations app_schema_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.app_schema_migrations
    ADD CONSTRAINT app_schema_migrations_pkey PRIMARY KEY (version);


--
-- Name: aset_ga aset_ga_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.aset_ga
    ADD CONSTRAINT aset_ga_pkey PRIMARY KEY (id);


--
-- Name: aset_ops aset_ops_hostname_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.aset_ops
    ADD CONSTRAINT aset_ops_hostname_key UNIQUE (hostname);


--
-- Name: aset_ops aset_ops_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.aset_ops
    ADD CONSTRAINT aset_ops_pkey PRIMARY KEY (id);


--
-- Name: aset_ti aset_ti_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.aset_ti
    ADD CONSTRAINT aset_ti_pkey PRIMARY KEY (id);


--
-- Name: asset_shipments asset_shipments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.asset_shipments
    ADD CONSTRAINT asset_shipments_pkey PRIMARY KEY (id);


--
-- Name: backup_audit_log backup_audit_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.backup_audit_log
    ADD CONSTRAINT backup_audit_log_pkey PRIMARY KEY (id);


--
-- Name: backup_metadata backup_metadata_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.backup_metadata
    ADD CONSTRAINT backup_metadata_pkey PRIMARY KEY (id);


--
-- Name: case_bookmarks case_bookmarks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.case_bookmarks
    ADD CONSTRAINT case_bookmarks_pkey PRIMARY KEY (id);


--
-- Name: cases cases_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cases
    ADD CONSTRAINT cases_pkey PRIMARY KEY (id);


--
-- Name: faq faq_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.faq
    ADD CONSTRAINT faq_pkey PRIMARY KEY (id);


--
-- Name: karyawan karyawan_email_kantor_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.karyawan
    ADD CONSTRAINT karyawan_email_kantor_key UNIQUE (email_kantor);


--
-- Name: karyawan karyawan_nik_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.karyawan
    ADD CONSTRAINT karyawan_nik_key UNIQUE (nik);


--
-- Name: karyawan karyawan_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.karyawan
    ADD CONSTRAINT karyawan_pkey PRIMARY KEY (id);


--
-- Name: kb_categories kb_categories_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kb_categories
    ADD CONSTRAINT kb_categories_key_key UNIQUE (key);


--
-- Name: kb_categories kb_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kb_categories
    ADD CONSTRAINT kb_categories_pkey PRIMARY KEY (id);


--
-- Name: kb_search_logs kb_search_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kb_search_logs
    ADD CONSTRAINT kb_search_logs_pkey PRIMARY KEY (id);


--
-- Name: komentar_tiket komentar_tiket_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.komentar_tiket
    ADD CONSTRAINT komentar_tiket_pkey PRIMARY KEY (id);


--
-- Name: log_audit_login log_audit_login_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.log_audit_login
    ADD CONSTRAINT log_audit_login_pkey PRIMARY KEY (id);


--
-- Name: log_riwayat_aset log_riwayat_aset_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.log_riwayat_aset
    ADD CONSTRAINT log_riwayat_aset_pkey PRIMARY KEY (id);


--
-- Name: log_riwayat_tiket log_riwayat_tiket_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.log_riwayat_tiket
    ADD CONSTRAINT log_riwayat_tiket_pkey PRIMARY KEY (id);


--
-- Name: password_reset_otps password_reset_otps_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.password_reset_otps
    ADD CONSTRAINT password_reset_otps_pkey PRIMARY KEY (id);


--
-- Name: riwayat_pemakaian_aset riwayat_pemakaian_aset_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.riwayat_pemakaian_aset
    ADD CONSTRAINT riwayat_pemakaian_aset_pkey PRIMARY KEY (id);


--
-- Name: ticket_casp_ratings ticket_casp_ratings_id_tiket_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ticket_casp_ratings
    ADD CONSTRAINT ticket_casp_ratings_id_tiket_key UNIQUE (id_tiket);


--
-- Name: ticket_casp_ratings ticket_casp_ratings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ticket_casp_ratings
    ADD CONSTRAINT ticket_casp_ratings_pkey PRIMARY KEY (id);


--
-- Name: ticket_queues ticket_queues_kode_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ticket_queues
    ADD CONSTRAINT ticket_queues_kode_key UNIQUE (kode);


--
-- Name: ticket_queues ticket_queues_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ticket_queues
    ADD CONSTRAINT ticket_queues_pkey PRIMARY KEY (id);


--
-- Name: tickets tickets_nomor_tiket_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tickets
    ADD CONSTRAINT tickets_nomor_tiket_key UNIQUE (nomor_tiket);


--
-- Name: tickets tickets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tickets
    ADD CONSTRAINT tickets_pkey PRIMARY KEY (id);


--
-- Name: tipe_aset_ga tipe_aset_ga_nama_tipe_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tipe_aset_ga
    ADD CONSTRAINT tipe_aset_ga_nama_tipe_key UNIQUE (nama_tipe);


--
-- Name: tipe_aset_ga tipe_aset_ga_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tipe_aset_ga
    ADD CONSTRAINT tipe_aset_ga_pkey PRIMARY KEY (id);


--
-- Name: case_bookmarks uq_case_bookmarks; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.case_bookmarks
    ADD CONSTRAINT uq_case_bookmarks UNIQUE (user_id, case_id);


--
-- Name: user_sessions user_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_sessions
    ADD CONSTRAINT user_sessions_pkey PRIMARY KEY (id);


--
-- Name: user_sessions user_sessions_session_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_sessions
    ADD CONSTRAINT user_sessions_session_id_key UNIQUE (session_id);


--
-- Name: user_ticket_queues user_ticket_queues_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_ticket_queues
    ADD CONSTRAINT user_ticket_queues_pkey PRIMARY KEY (id);


--
-- Name: user_ticket_queues user_ticket_queues_user_id_queue_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_ticket_queues
    ADD CONSTRAINT user_ticket_queues_user_id_queue_id_key UNIQUE (user_id, queue_id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: idx_account_security_locked_until; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_account_security_locked_until ON public.account_security_state USING btree (locked_until);


--
-- Name: idx_aset_ga_hostname; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_aset_ga_hostname ON public.aset_ga USING btree (hostname);


--
-- Name: idx_aset_ga_kondisi; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_aset_ga_kondisi ON public.aset_ga USING btree (kondisi);


--
-- Name: idx_aset_ga_lokasi; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_aset_ga_lokasi ON public.aset_ga USING btree (lokasi);


--
-- Name: idx_aset_hostname; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_aset_hostname ON public.aset_ti USING btree (hostname);


--
-- Name: idx_aset_kondisi; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_aset_kondisi ON public.aset_ti USING btree (kondisi);


--
-- Name: idx_aset_nik_pemegang; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_aset_nik_pemegang ON public.aset_ti USING btree (nik_pemegang_asset);


--
-- Name: idx_aset_ops_hostname; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_aset_ops_hostname ON public.aset_ops USING btree (hostname);


--
-- Name: idx_aset_ops_lokasi; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_aset_ops_lokasi ON public.aset_ops USING btree (lokasi);


--
-- Name: idx_aset_ops_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_aset_ops_status ON public.aset_ops USING btree (status) WHERE (deleted_at IS NULL);


--
-- Name: idx_aset_serial_number; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_aset_serial_number ON public.aset_ti USING btree (serial_number);


--
-- Name: idx_aset_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_aset_status ON public.aset_ti USING btree (status) WHERE (deleted_at IS NULL);


--
-- Name: idx_asset_shipments_awb_number; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_asset_shipments_awb_number ON public.asset_shipments USING btree (awb_number);


--
-- Name: idx_asset_shipments_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_asset_shipments_created_at ON public.asset_shipments USING btree (created_at DESC);


--
-- Name: idx_asset_shipments_recipient_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_asset_shipments_recipient_name ON public.asset_shipments USING btree (recipient_name);


--
-- Name: idx_asset_shipments_request_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_asset_shipments_request_date ON public.asset_shipments USING btree (request_date DESC);


--
-- Name: idx_asset_shipments_sender_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_asset_shipments_sender_name ON public.asset_shipments USING btree (sender_name);


--
-- Name: idx_asset_shipments_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_asset_shipments_status ON public.asset_shipments USING btree (status);


--
-- Name: idx_asset_shipments_tracking_number; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_asset_shipments_tracking_number ON public.asset_shipments USING btree (tracking_number);


--
-- Name: idx_backup_audit_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_backup_audit_created ON public.backup_audit_log USING btree (created_at DESC);


--
-- Name: idx_backup_audit_operation; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_backup_audit_operation ON public.backup_audit_log USING btree (operation);


--
-- Name: idx_backup_audit_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_backup_audit_user ON public.backup_audit_log USING btree (user_id);


--
-- Name: idx_backup_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_backup_created_at ON public.backup_metadata USING btree (created_at DESC);


--
-- Name: idx_backup_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_backup_status ON public.backup_metadata USING btree (status);


--
-- Name: idx_backup_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_backup_type ON public.backup_metadata USING btree (backup_type);


--
-- Name: idx_case_bookmarks_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_case_bookmarks_user ON public.case_bookmarks USING btree (user_id, created_at DESC);


--
-- Name: idx_cases_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cases_status ON public.cases USING btree (status);


--
-- Name: idx_faq_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_faq_status ON public.faq USING btree (status);


--
-- Name: idx_karyawan_departemen; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_karyawan_departemen ON public.karyawan USING btree (departemen);


--
-- Name: idx_karyawan_email; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_karyawan_email ON public.karyawan USING btree (email_kantor);


--
-- Name: idx_karyawan_nik_atasan; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_karyawan_nik_atasan ON public.karyawan USING btree (nik_atasan_langsung);


--
-- Name: idx_kb_categories_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_kb_categories_status ON public.kb_categories USING btree (status, sort_order);


--
-- Name: idx_kb_search_logs_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_kb_search_logs_created ON public.kb_search_logs USING btree (created_at DESC);


--
-- Name: idx_kb_search_logs_query; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_kb_search_logs_query ON public.kb_search_logs USING btree (query);


--
-- Name: idx_komentar_tiket_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_komentar_tiket_id ON public.komentar_tiket USING btree (id_tiket, created_at);


--
-- Name: idx_log_audit_login_email; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_log_audit_login_email ON public.log_audit_login USING btree (email);


--
-- Name: idx_log_audit_login_time; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_log_audit_login_time ON public.log_audit_login USING btree (login_time DESC);


--
-- Name: idx_log_riwayat_aset_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_log_riwayat_aset_id ON public.log_riwayat_aset USING btree (id_aset, dibuat_pada DESC);


--
-- Name: idx_log_riwayat_tiket_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_log_riwayat_tiket_id ON public.log_riwayat_tiket USING btree (id_tiket, created_at DESC);


--
-- Name: idx_reset_otps_email; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reset_otps_email ON public.password_reset_otps USING btree (email, expires_at);


--
-- Name: idx_reset_token; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reset_token ON public.password_reset_otps USING btree (reset_token);


--
-- Name: idx_rpa_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_rpa_active ON public.riwayat_pemakaian_aset USING btree (id_aset) WHERE (tanggal_selesai IS NULL);


--
-- Name: idx_tickets_assigned_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tickets_assigned_status ON public.tickets USING btree (assigned_to_user_id, status_tiket) WHERE (deleted_at IS NULL);


--
-- Name: idx_tickets_queue_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tickets_queue_status ON public.tickets USING btree (queue_id, status_tiket) WHERE (deleted_at IS NULL);


--
-- Name: idx_tickets_reporter_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tickets_reporter_created ON public.tickets USING btree (pelapor_user_id, created_at DESC) WHERE (deleted_at IS NULL);


--
-- Name: idx_tickets_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tickets_status ON public.tickets USING btree (status_tiket) WHERE (deleted_at IS NULL);


--
-- Name: idx_tipe_aset_ga_nama; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tipe_aset_ga_nama ON public.tipe_aset_ga USING btree (nama_tipe);


--
-- Name: idx_user_sessions_expires; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_sessions_expires ON public.user_sessions USING btree (expires_at);


--
-- Name: idx_user_sessions_revoked; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_sessions_revoked ON public.user_sessions USING btree (revoked_at);


--
-- Name: idx_user_sessions_sid; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_user_sessions_sid ON public.user_sessions USING btree (session_id);


--
-- Name: idx_user_sessions_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_sessions_user ON public.user_sessions USING btree (user_id);


--
-- Name: idx_users_email; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_email ON public.users USING btree (email);


--
-- Name: idx_users_is_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_is_active ON public.users USING btree (is_active) WHERE (is_active = true);


--
-- Name: aset_ti trg_aset_ti_auto_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_aset_ti_auto_updated_at BEFORE UPDATE ON public.aset_ti FOR EACH ROW EXECUTE FUNCTION public.auto_update_timestamp();


--
-- Name: karyawan trg_karyawan_auto_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_karyawan_auto_updated_at BEFORE UPDATE ON public.karyawan FOR EACH ROW EXECUTE FUNCTION public.auto_update_timestamp();


--
-- Name: riwayat_pemakaian_aset trg_riwayat_pemakaian_auto_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_riwayat_pemakaian_auto_updated_at BEFORE UPDATE ON public.riwayat_pemakaian_aset FOR EACH ROW EXECUTE FUNCTION public.auto_update_timestamp();


--
-- Name: ticket_queues trg_ticket_queues_auto_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_ticket_queues_auto_updated_at BEFORE UPDATE ON public.ticket_queues FOR EACH ROW EXECUTE FUNCTION public.auto_update_timestamp();


--
-- Name: tickets trg_tickets_auto_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_tickets_auto_updated_at BEFORE UPDATE ON public.tickets FOR EACH ROW EXECUTE FUNCTION public.auto_update_timestamp();


--
-- Name: tickets trg_tickets_prevent_hard_delete; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_tickets_prevent_hard_delete BEFORE DELETE ON public.tickets FOR EACH ROW EXECUTE FUNCTION public.prevent_hard_delete();


--
-- Name: users trg_users_auto_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_users_auto_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.auto_update_timestamp();


--
-- Name: users trg_users_prevent_hard_delete; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_users_prevent_hard_delete BEFORE DELETE ON public.users FOR EACH ROW EXECUTE FUNCTION public.prevent_hard_delete();


--
-- Name: asset_shipments asset_shipments_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.asset_shipments
    ADD CONSTRAINT asset_shipments_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: case_bookmarks case_bookmarks_case_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.case_bookmarks
    ADD CONSTRAINT case_bookmarks_case_id_fkey FOREIGN KEY (case_id) REFERENCES public.cases(id) ON DELETE CASCADE;


--
-- Name: case_bookmarks case_bookmarks_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.case_bookmarks
    ADD CONSTRAINT case_bookmarks_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: aset_ti fk_asset_pemegang; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.aset_ti
    ADD CONSTRAINT fk_asset_pemegang FOREIGN KEY (nik_pemegang_asset) REFERENCES public.karyawan(nik) ON DELETE SET NULL;


--
-- Name: ticket_casp_ratings fk_casp_assignee; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ticket_casp_ratings
    ADD CONSTRAINT fk_casp_assignee FOREIGN KEY (assignee_user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: ticket_casp_ratings fk_casp_reporter; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ticket_casp_ratings
    ADD CONSTRAINT fk_casp_reporter FOREIGN KEY (reporter_user_id) REFERENCES public.users(id);


--
-- Name: ticket_casp_ratings fk_casp_tiket; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ticket_casp_ratings
    ADD CONSTRAINT fk_casp_tiket FOREIGN KEY (id_tiket) REFERENCES public.tickets(id) ON DELETE CASCADE;


--
-- Name: karyawan fk_karyawan_atasan; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.karyawan
    ADD CONSTRAINT fk_karyawan_atasan FOREIGN KEY (nik_atasan_langsung) REFERENCES public.karyawan(nik) ON DELETE SET NULL;


--
-- Name: komentar_tiket fk_komentar_tiket; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.komentar_tiket
    ADD CONSTRAINT fk_komentar_tiket FOREIGN KEY (id_tiket) REFERENCES public.tickets(id) ON DELETE CASCADE;


--
-- Name: komentar_tiket fk_komentar_user; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.komentar_tiket
    ADD CONSTRAINT fk_komentar_user FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: log_riwayat_tiket fk_log_tiket; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.log_riwayat_tiket
    ADD CONSTRAINT fk_log_tiket FOREIGN KEY (id_tiket) REFERENCES public.tickets(id) ON DELETE CASCADE;


--
-- Name: log_audit_login fk_login_user; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.log_audit_login
    ADD CONSTRAINT fk_login_user FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: riwayat_pemakaian_aset fk_rpa_aset; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.riwayat_pemakaian_aset
    ADD CONSTRAINT fk_rpa_aset FOREIGN KEY (id_aset) REFERENCES public.aset_ti(id) ON DELETE CASCADE;


--
-- Name: riwayat_pemakaian_aset fk_rpa_nik; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.riwayat_pemakaian_aset
    ADD CONSTRAINT fk_rpa_nik FOREIGN KEY (nik_pemegang) REFERENCES public.karyawan(nik) ON DELETE SET NULL;


--
-- Name: tickets fk_tickets_assignee; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tickets
    ADD CONSTRAINT fk_tickets_assignee FOREIGN KEY (assigned_to_user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: tickets fk_tickets_deleted_by; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tickets
    ADD CONSTRAINT fk_tickets_deleted_by FOREIGN KEY (deleted_by_user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: tickets fk_tickets_queue; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tickets
    ADD CONSTRAINT fk_tickets_queue FOREIGN KEY (queue_id) REFERENCES public.ticket_queues(id) ON DELETE SET NULL;


--
-- Name: tickets fk_tickets_reporter; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tickets
    ADD CONSTRAINT fk_tickets_reporter FOREIGN KEY (pelapor_user_id) REFERENCES public.users(id) ON DELETE RESTRICT;


--
-- Name: tickets fk_tickets_resolved_by; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tickets
    ADD CONSTRAINT fk_tickets_resolved_by FOREIGN KEY (resolved_by_user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: user_sessions fk_user_sessions_user; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_sessions
    ADD CONSTRAINT fk_user_sessions_user FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: users fk_users_deleted_by; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT fk_users_deleted_by FOREIGN KEY (deleted_by_id) REFERENCES public.users(id) ON DELETE RESTRICT;


--
-- Name: user_ticket_queues fk_utq_queue; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_ticket_queues
    ADD CONSTRAINT fk_utq_queue FOREIGN KEY (queue_id) REFERENCES public.ticket_queues(id) ON DELETE CASCADE;


--
-- Name: user_ticket_queues fk_utq_user; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_ticket_queues
    ADD CONSTRAINT fk_utq_user FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: kb_search_logs kb_search_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kb_search_logs
    ADD CONSTRAINT kb_search_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: password_reset_otps password_reset_otps_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.password_reset_otps
    ADD CONSTRAINT password_reset_otps_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict z7IURKKLinyEZtK6Cbw7NRp8bBPQCl8gUjonb0aNGRaShC8V0M8kOOdsRa4MCeC

