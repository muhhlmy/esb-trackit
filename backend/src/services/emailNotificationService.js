import { pool } from "../config/database.js";
import { sendEmail, renderTicketEmailHtml } from "./emailService.js";

/**
 * PostgreSQL BIGINT columns return string values in node-postgres (e.g. "5").
 * actorUserId is converted to Number. Strict equality ("5" !== 5) would alwayss
 * be true, silently breaking every "don't email the actor" guard.
 * This hel1per normalises any ID to a Number for safe comparison.
 */
function toNumericId(value) {
  if (value == null) return null;
  const n = Number(value);
  return Number.isSafeInteger(n) && n > 0 ? n : null;
}

/**
 * Status-change notifications are meant for the end User (a reporter), not for
 * IT staff. Treat admin/superadmin accounts that happen to be the reporter as
 * staff too, so they are never emailed for these events.
 */
function isAdminRole(role) {
  const normalized = String(role || "")
    .trim()
    .toLowerCase();
  return (
    normalized === "admin" ||
    normalized === "superadmin" ||
    normalized === "super admin"
  );
}

/**
 * Fetch recipient details from database safely
 */
async function fetchUserById(queryable, userId) {
  if (!userId || !Number.isSafeInteger(Number(userId))) return null;
  try {
    const res = await queryable.query(
      `SELECT id, nama, email, role FROM users WHERE id = $1 AND is_active = true AND deleted_at IS NULL`,
      [Number(userId)],
    );
    return res.rows[0] || null;
  } catch (err) {
    if (process.env.NODE_ENV !== "test") {
      console.error(
        `[emailNotificationService] Error fetching user ${userId}:`,
        err.message,
      );
    }
    return null;
  }
}

async function fetchQueueAdmins(queryable, queueId) {
  if (!queueId || !Number.isSafeInteger(Number(queueId))) return [];
  try {
    const res = await queryable.query(
      `SELECT DISTINCT u.id, u.nama, u.email, u.role
       FROM users u
       LEFT JOIN user_ticket_queues utq ON utq.user_id = u.id
       WHERE (utq.queue_id = $1 OR u.role IN ('superadmin', 'super admin'))
         AND u.is_active = true
         AND u.deleted_at IS NULL`,
      [Number(queueId)],
    );
    return res.rows;
  } catch (err) {
    if (process.env.NODE_ENV !== "test") {
      console.error(
        `[emailNotificationService] Error fetching queue admins for queue ${queueId}:`,
        err.message,
      );
    }
    return [];
  }
}

async function fetchReporterUser(queryable, ticket) {
  if (ticket.pelapor_user_id) {
    const user = await fetchUserById(queryable, ticket.pelapor_user_id);
    if (user && user.email) return user;
  }
  if (ticket.pelapor) {
    try {
      // Fallback berbasis nama: lewati akun admin/superadmin agar tabrakan nama
      // tidak pernah menyelesaikan staf IT sebagai pelapor. Dengan begitu tiket
      // legacy (tanpa pelapor_user_id) tetap jatuh ke karyawan yang benar.
      const resUser = await queryable.query(
        `SELECT id, nama, email, role FROM users WHERE LOWER(TRIM(nama)) = LOWER(TRIM($1)) AND LOWER(TRIM(COALESCE(role, ''))) NOT IN ('admin', 'superadmin', 'super admin') AND is_active = true AND deleted_at IS NULL LIMIT 1`,
        [ticket.pelapor],
      );
      if (resUser.rows[0] && resUser.rows[0].email) return resUser.rows[0];

      const resKaryawan = await queryable.query(
        `SELECT id, nama_karyawan AS nama, email_kantor AS email, 'user' AS role
         FROM karyawan
         WHERE LOWER(TRIM(nama_karyawan)) = LOWER(TRIM($1)) AND email_kantor IS NOT NULL AND BTRIM(email_kantor) <> '' LIMIT 1`,
        [ticket.pelapor],
      );
      if (resKaryawan.rows[0]) return resKaryawan.rows[0];
    } catch (err) {
      if (process.env.NODE_ENV !== "test") {
        console.error(
          "[emailNotificationService] Error searching reporter by name:",
          err.message,
        );
      }
    }
  }
  return null;
}

export function formatTicketTag(nomorTiket) {
  if (!nomorTiket) return '#TIC26-0000'
  return nomorTiket.startsWith('#') ? nomorTiket : `#${nomorTiket}`
}

/**
 * Handle dispatching email notifications for ticket events asynchronously.
 * NEVER throw errors to caller — log failures silently.
 */
export async function handleTicketEventNotification(
  eventType,
  ticket,
  options = {},
) {
  const queryable = options.queryable || pool
  const actorUserId =
    options.actorUserId != null ? Number(options.actorUserId) : null
  const changes = Array.isArray(options.changes) ? options.changes : []
  const comment = options.comment || null

  if (process.env.EMAIL_ENABLED !== 'true') return
  if (!ticket || !ticket.id) return

  try {
    const ticketId = ticket.id

    // Enrich ticket with complete fields from DB to prevent missing title, queue, or raw numeric reporter IDs
    let fullTicket = { ...ticket }
    try {
      const enrichRes = await queryable.query(
        `SELECT
           t.id,
           t.nomor_tiket,
           t.judul,
           t.deskripsi,
           t.kategori,
           t.prioritas,
           t.status_tiket,
           t.queue_id,
           t.assigned_to_user_id,
           t.pelapor_user_id,
           q.nama_antrean AS queue_nama,
           q.kode_antrean AS queue_kode,
           COALESCE(u.nama, k.nama_karyawan) AS pelapor_nama
         FROM tickets t
         LEFT JOIN ticket_queues q ON q.id = t.queue_id
         LEFT JOIN users u ON u.id = t.pelapor_user_id
         LEFT JOIN karyawan k ON LOWER(TRIM(u.email)) = LOWER(TRIM(k.email_kantor))
         WHERE t.id = $1`,
        [ticketId],
      )
      if (enrichRes.rows[0]) {
        const row = enrichRes.rows[0]
        fullTicket = {
          ...row,
          ...ticket,
          judul: ticket.judul || row.judul,
          prioritas: ticket.prioritas || row.prioritas,
          status_tiket: ticket.status_tiket || row.status_tiket,
          nomor_tiket: ticket.nomor_tiket || row.nomor_tiket,
          queue_nama: row.queue_nama,
          queue_kode: row.queue_kode,
          pelapor_nama: row.pelapor_nama,
          pelapor: (typeof ticket.pelapor === 'string' && !/^\d+$/.test(ticket.pelapor.trim()))
            ? ticket.pelapor
            : (row.pelapor_nama || 'Pengguna'),
        }
      }
    } catch (enrichErr) {
      if (process.env.NODE_ENV !== 'test') {
        console.error('[emailNotificationService] Error enriching ticket details:', enrichErr.message)
      }
    }

    const nomorTiket = fullTicket.nomor_tiket || `TIC26-${String(ticketId).padStart(4, '0')}`
    const tag = formatTicketTag(nomorTiket)

    // Fetch Reporter and Assignee users if available
    const reporterUser = await fetchReporterUser(queryable, fullTicket)
    const assigneeUser = fullTicket.assigned_to_user_id
      ? await fetchUserById(queryable, fullTicket.assigned_to_user_id)
      : null

    // Normalise all IDs to Number for safe comparison (BIGINT → string fix)
    const reporterId = toNumericId(reporterUser?.id)
    const assigneeId = toNumericId(assigneeUser?.id)

    if (process.env.NODE_ENV !== 'test') {
      console.log(
        `[emailNotificationService] Event: ${eventType} | Ticket: ${nomorTiket} (${tag}) | Actor ID: ${actorUserId} | Reporter: ${reporterUser?.email || 'N/A'} (ID: ${reporterId}) | Assignee: ${assigneeUser?.email || 'N/A'} (ID: ${assigneeId})`,
      )
    }

    // ──────────────────────────────────────────────────────────
    // EVENT 1: TICKET_CREATED
    // ──────────────────────────────────────────────────────────
    if (eventType === 'TICKET_CREATED') {
      // 1A. Confirm to Reporter -> format: [#TIC26-0001] Judul Tiket
      if (reporterUser && reporterUser.email && reporterId !== actorUserId) {
        if (process.env.NODE_ENV !== 'test') {
          console.log(
            `[emailNotificationService] Dispatching TICKET_CREATED email to Reporter <${reporterUser.email}>`,
          )
        }
        const html = renderTicketEmailHtml({
          recipientName: reporterUser.nama,
          title: `[${tag}] ${fullTicket.judul || 'Tiket Dibuat'}`,
          subtitle: `Tiket Anda telah berhasil dibuat dan saat ini sedang menunggu penanganan oleh Tim IT Support.`,
          ticket: fullTicket,
          actionText:
            'Anda dapat memantau status tiket melalui aplikasi IT Monitoring.',
        })
        await sendEmail({
          to: reporterUser.email,
          subject: `[${tag}] ${fullTicket.judul || 'Tiket Dibuat'}`,
          html,
          text: `Tiket Anda (${tag}: ${fullTicket.judul}) telah berhasil dibuat dan akan diproses oleh Tim IT.`,
        })
      }

      // 1B. Notify Queue Admins & Superadmins -> format: [Tiket Baru] [High] [#TIC26-0001] Judul - oleh Pelapor
      const queueAdmins = await fetchQueueAdmins(queryable, fullTicket.queue_id)
      const prioritasLabel = fullTicket.prioritas || 'Normal'
      const pelaporLabel = fullTicket.pelapor || reporterUser?.nama || 'Pengguna'

      for (const admin of queueAdmins) {
        if (!admin.email || toNumericId(admin.id) === actorUserId) continue

        if (process.env.NODE_ENV !== 'test') {
          console.log(
            `[emailNotificationService] Dispatching TICKET_CREATED email to Admin <${admin.email}>`,
          )
        }
        const html = renderTicketEmailHtml({
          recipientName: admin.nama,
          title: `[Tiket Baru] [${prioritasLabel}] [${tag}] ${fullTicket.judul || ''}`,
          subtitle: `Sebuah tiket baru telah dibuat oleh <strong>${pelaporLabel}</strong>. Harap cek Tiket terbaru pada TrackIT.`,
          ticket: fullTicket,
          actionText:
            'Silakan login ke sistem TrackIT untuk menindaklanjuti tiket ini.',
        })
        await sendEmail({
          to: admin.email,
          subject: `[Tiket Baru] [${prioritasLabel}] [${tag}] ${fullTicket.judul || ''} - oleh ${pelaporLabel}`,
          html,
          text: `Tiket baru (${tag}) telah dibuat oleh ${pelaporLabel}. Judul: ${fullTicket.judul}. Prioritas: ${prioritasLabel}`,
        })
      }
    }

    // ──────────────────────────────────────────────────────────
    // EVENT 2: TICKET_UPDATED
    // ──────────────────────────────────────────────────────────
    else if (eventType === 'TICKET_UPDATED') {
      // 2A. Notify Reporter - only for the end User, never for an admin/superadmin
      if (
        reporterUser &&
        reporterUser.email &&
        reporterId !== actorUserId &&
        !isAdminRole(reporterUser.role)
      ) {
        if (process.env.NODE_ENV !== 'test') {
          console.log(
            `[emailNotificationService] Dispatching TICKET_UPDATED email to Reporter <${reporterUser.email}>`,
          )
        }

        const isResolved =
          String(fullTicket.status_tiket || '').toLowerCase() === 'resolved' ||
          (Array.isArray(changes) && changes.some((c) => /resolved|selesai/i.test(String(c))))

        const updateSubject = isResolved
          ? `[${tag}] Tiket Selesai: ${fullTicket.judul || ''}`
          : `[${tag}] Status Update`

        const updateTitle = isResolved
          ? `[${tag}] Tiket Selesai`
          : `[${tag}] Status Update`

        const html = renderTicketEmailHtml({
          recipientName: reporterUser.nama,
          title: updateTitle,
          subtitle: isResolved
            ? `Tiket Anda telah diselesaikan oleh Tim IT Support.`
            : `Terdapat pembaruan status / informasi pada tiket Anda.`,
          ticket: fullTicket,
          changes,
          actionText: 'Silakan cek aplikasi untuk informasi selengkapnya.',
        })
        await sendEmail({
          to: reporterUser.email,
          subject: updateSubject,
          html,
          text: `Tiket Anda (${tag}) mengalami perubahan status atau informasi: ${updateSubject}`,
        })
      } else {
        if (process.env.NODE_ENV !== 'test') {
          console.log(
            `[emailNotificationService] TICKET_UPDATED skipped for Reporter. reporterUser: ${reporterUser?.email || 'None'}, reporterId: ${reporterId}, actorUserId: ${actorUserId}`,
          )
        }
      }
    }

    // ──────────────────────────────────────────────────────────
    // EVENT 3: COMMENT_CREATED
    // ──────────────────────────────────────────────────────────
    else if (eventType === 'COMMENT_CREATED') {
      const commentPesan = comment?.pesan || null
      const commentAuthor = comment?.nama_pengguna || 'Seseorang'

      // 3A. If comment made by Admin/Assignee -> Notify Reporter
      if (reporterUser && reporterUser.email && reporterId !== actorUserId) {
        const html = renderTicketEmailHtml({
          recipientName: reporterUser.nama,
          title: `[${tag}] Komentar Baru Ditambahkan`,
          subtitle: `<strong>${commentAuthor}</strong> menambahkan pesan baru pada tiket Anda.`,
          ticket: fullTicket,
          commentPesan,
          commentAuthor,
          actionText:
            'Silakan balas komentar ini melalui aplikasi IT Monitoring.',
        })
        await sendEmail({
          to: reporterUser.email,
          subject: `[${tag}] Komentar baru telah ditambahkan`,
          html,
          text: `Ada komentar baru pada tiket Anda (${tag}) oleh ${commentAuthor}: "${commentPesan}"`,
        })
      }

      // 3B. If comment made by Reporter -> Notify Assignee or Queue Admins
      if (reporterUser && actorUserId === reporterId) {
        const targetAdmins = assigneeUser
          ? [assigneeUser]
          : await fetchQueueAdmins(queryable, fullTicket.queue_id)

        for (const admin of targetAdmins) {
          if (!admin.email || toNumericId(admin.id) === actorUserId) continue

          const html = renderTicketEmailHtml({
            recipientName: admin.nama,
            title: `[Balasan Pelapor] [${tag}] ${fullTicket.judul || ''}`,
            subtitle: `Pelapor (<strong>${commentAuthor}</strong>) telah mengirimkan pesan baru pada tiket.`,
            ticket: fullTicket,
            commentPesan,
            commentAuthor,
            actionText:
              'Buka aplikasi untuk melihat dan merespon pesan pelapor.',
          })
          await sendEmail({
            to: admin.email,
            subject: `[Balasan Pelapor] [${tag}] ${fullTicket.judul || ''} - oleh ${commentAuthor}`,
            html,
            text: `Pelapor (${commentAuthor}) memberikan balasan di tiket ${tag}: "${commentPesan}"`,
          })
        }
      }
    }
  } catch (err) {
    console.error(
      `[emailNotificationService] Unhandled error dispatching email for ${eventType}:`,
      err.message,
    );
  }
}
