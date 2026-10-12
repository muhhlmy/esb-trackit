import { pool } from "../config/database.js";
import { sendEmail, renderTicketEmailHtml, renderEmailTemplate, getActiveEmailConfig } from "./emailService.js";

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

  const cfg = await getActiveEmailConfig()
  if (!cfg.enabled) return
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

    const frontendBaseUrl = (
      process.env.FRONTEND_URL ||
      process.env.APP_URL ||
      'http://localhost:5173'
    ).replace(/\/+$/, '')

    const ticketUrl = `${frontendBaseUrl}/tickets?id=${ticketId}`

    // Fetch Reporter and Assignee users if available
    const reporterUser = await fetchReporterUser(queryable, fullTicket)
    const assigneeUser = fullTicket.assigned_to_user_id
      ? await fetchUserById(queryable, fullTicket.assigned_to_user_id)
      : null

    // Normalise all IDs to Number for safe comparison
    const reporterId = toNumericId(reporterUser?.id)
    const assigneeId = toNumericId(assigneeUser?.id)

    // ──────────────────────────────────────────────────────────
    // EVENT 1: TICKET_CREATED
    // ──────────────────────────────────────────────────────────
    if (eventType === 'TICKET_CREATED' && cfg.notify_ticket_create) {
      // 1A. Confirm to Reporter
      if (reporterUser && reporterUser.email && reporterId !== actorUserId) {
        const rendered = await renderEmailTemplate('ticket_created', {
          recipient_name: reporterUser.nama,
          nomor_tiket: tag,
          judul_tiket: fullTicket.judul || 'Tiket Dibuat',
          prioritas_tiket: fullTicket.prioritas || 'Normal',
          unit_support: fullTicket.queue_nama || fullTicket.kategori || 'IT Support',
          ticket_url: ticketUrl,
        })

        if (rendered) {
          await sendEmail({
            to: reporterUser.email,
            subject: rendered.subject,
            html: rendered.html,
            text: rendered.text,
          })
        }
      }

      // 1B. Notify Queue Admins & Superadmins
      const queueAdmins = await fetchQueueAdmins(queryable, fullTicket.queue_id)
      const prioritasLabel = fullTicket.prioritas || 'Normal'
      const pelaporLabel = fullTicket.pelapor || reporterUser?.nama || 'Pengguna'

      for (const admin of queueAdmins) {
        if (!admin.email || toNumericId(admin.id) === actorUserId) continue

        const renderedAdmin = await renderEmailTemplate('ticket_created', {
          recipient_name: admin.nama,
          nomor_tiket: tag,
          judul_tiket: `${fullTicket.judul || 'Tiket Baru'} (oleh ${pelaporLabel})`,
          prioritas_tiket: prioritasLabel,
          unit_support: fullTicket.queue_nama || fullTicket.kategori || 'IT Support',
          ticket_url: ticketUrl,
        })

        if (renderedAdmin) {
          await sendEmail({
            to: admin.email,
            subject: `[Tiket Baru] [${prioritasLabel}] [${tag}] ${fullTicket.judul || ''} - oleh ${pelaporLabel}`,
            html: renderedAdmin.html,
            text: renderedAdmin.text,
          })
        }
      }
    }

    // ──────────────────────────────────────────────────────────
    // EVENT 2: TICKET_UPDATED
    // ──────────────────────────────────────────────────────────
    else if (eventType === 'TICKET_UPDATED') {
      // 2A. Check for assignment change
      const isAssignment =
        (Array.isArray(changes) && changes.some((c) => /ditugaskan|ditangani|reassign|assignment/i.test(String(c)))) ||
        eventType === 'TICKET_ASSIGNED'

      if (isAssignment && cfg.notify_ticket_assign && assigneeUser && assigneeUser.email && assigneeId !== actorUserId) {
        const renderedAssignee = await renderEmailTemplate('ticket_assigned', {
          recipient_name: assigneeUser.nama,
          nomor_tiket: tag,
          judul_tiket: fullTicket.judul || 'Penugasan Tiket',
          prioritas_tiket: fullTicket.prioritas || 'Normal',
          unit_support: fullTicket.queue_nama || fullTicket.kategori || 'IT Support',
          ticket_url: ticketUrl,
        })

        if (renderedAssignee) {
          await sendEmail({
            to: assigneeUser.email,
            subject: renderedAssignee.subject,
            html: renderedAssignee.html,
            text: renderedAssignee.text,
          })
        }
      }

      // 2B. Status / Information update to Reporter
      if (
        cfg.notify_ticket_status &&
        reporterUser &&
        reporterUser.email &&
        reporterId !== actorUserId &&
        !isAdminRole(reporterUser.role)
      ) {
        const rendered = await renderEmailTemplate('ticket_status_changed', {
          recipient_name: reporterUser.nama,
          nomor_tiket: tag,
          judul_tiket: fullTicket.judul || 'Pembaruan Tiket',
          status_tiket: fullTicket.status_tiket || 'Updated',
          prioritas_tiket: fullTicket.prioritas || 'Normal',
          ticket_url: ticketUrl,
        })

        if (rendered) {
          await sendEmail({
            to: reporterUser.email,
            subject: rendered.subject,
            html: rendered.html,
            text: rendered.text,
          })
        }
      }
    }

    // ──────────────────────────────────────────────────────────
    // EVENT 3: COMMENT_CREATED
    // ──────────────────────────────────────────────────────────
    else if (eventType === 'COMMENT_CREATED' && cfg.notify_ticket_comment) {
      const commentPesan = comment?.pesan || ''
      const commentAuthor = comment?.nama_pengguna || 'Seseorang'
      const commentTicketUrl = `${ticketUrl}&tab=comments`

      // 3A. If comment made by Admin/Assignee -> Notify Reporter
      if (reporterUser && reporterUser.email && reporterId !== actorUserId) {
        const rendered = await renderEmailTemplate('ticket_comment', {
          recipient_name: reporterUser.nama,
          nomor_tiket: tag,
          judul_tiket: fullTicket.judul || '',
          comment_author: commentAuthor,
          comment_pesan: commentPesan,
          ticket_url: commentTicketUrl,
        })

        if (rendered) {
          await sendEmail({
            to: reporterUser.email,
            subject: rendered.subject,
            html: rendered.html,
            text: rendered.text,
          })
        }
      }

      // 3B. If comment made by Reporter -> Notify Assignee or Queue Admins
      if (reporterUser && actorUserId === reporterId) {
        const targetAdmins = assigneeUser
          ? [assigneeUser]
          : await fetchQueueAdmins(queryable, fullTicket.queue_id)

        for (const admin of targetAdmins) {
          if (!admin.email || toNumericId(admin.id) === actorUserId) continue

          const renderedAdmin = await renderEmailTemplate('ticket_comment', {
            recipient_name: admin.nama,
            nomor_tiket: tag,
            judul_tiket: fullTicket.judul || '',
            comment_author: commentAuthor,
            comment_pesan: commentPesan,
            ticket_url: commentTicketUrl,
          })

          if (renderedAdmin) {
            await sendEmail({
              to: admin.email,
              subject: `[Balasan Pelapor] [${tag}] ${fullTicket.judul || ''} - oleh ${commentAuthor}`,
              html: renderedAdmin.html,
              text: renderedAdmin.text,
            })
          }
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

/**
 * Dispatch BAST asset handover notification email
 */
export async function handleAssetHandoverNotification(submission, options = {}) {
  try {
    const cfg = await getActiveEmailConfig()
    if (!cfg.enabled || !cfg.notify_asset_assign) return
    if (!submission) return

    const payload = submission.payload || {}
    const recipientName = payload.penerima_nama || payload.nama_penerima || payload.penerima || 'Karyawan'
    const recipientEmail = payload.penerima_email || payload.email || null

    if (!recipientEmail) return

    const frontendBaseUrl = (
      process.env.FRONTEND_URL ||
      process.env.APP_URL ||
      'http://localhost:5173'
    ).replace(/\/+$/, '')

    const portalUrl = `${frontendBaseUrl}/my-assets`

    const rendered = await renderEmailTemplate('asset_assigned', {
      recipient_name: recipientName,
      nomor_bast: submission.submission_number || 'BAST-000',
      nama_aset: payload.nama_aset || payload.asset_name || payload.perangkat || 'Unit Operasional',
      nomor_seri: payload.nomor_seri || payload.serial_number || payload.sn || '-',
      tipe_aset: payload.kategori_aset || payload.tipe || 'Aset Kantor',
      portal_url: portalUrl,
    })

    if (rendered) {
      await sendEmail({
        to: recipientEmail,
        subject: rendered.subject,
        html: rendered.html,
        text: rendered.text,
      })
    }
  } catch (err) {
    console.error('[emailNotificationService] Error dispatching asset handover email:', err.message)
  }
}

/**
 * Dispatch Shipment / Logistics status update notification email
 */
export async function handleShipmentStatusNotification(shipment, options = {}) {
  try {
    const cfg = await getActiveEmailConfig()
    if (!cfg.enabled || !cfg.notify_shipment) return
    if (!shipment) return

    const recipientName = shipment.recipient_name || 'Penerima Paket'
    // Coba resolve email penerima jika cocok dengan user / karyawan
    let recipientEmail = shipment.recipient_email || null
    if (!recipientEmail && shipment.recipient_name) {
      try {
        const resUser = await pool.query(
          `SELECT email FROM users WHERE LOWER(TRIM(nama)) = LOWER(TRIM($1)) AND email IS NOT NULL AND is_active = true LIMIT 1`,
          [shipment.recipient_name],
        )
        if (resUser.rows[0]) recipientEmail = resUser.rows[0].email

        if (!recipientEmail) {
          const resKaryawan = await pool.query(
            `SELECT email_kantor AS email FROM karyawan WHERE LOWER(TRIM(nama_karyawan)) = LOWER(TRIM($1)) AND email_kantor IS NOT NULL LIMIT 1`,
            [shipment.recipient_name],
          )
          if (resKaryawan.rows[0]) recipientEmail = resKaryawan.rows[0].email
        }
      } catch (lookupErr) {
        // silent
      }
    }

    if (!recipientEmail) return

    const frontendBaseUrl = (
      process.env.FRONTEND_URL ||
      process.env.APP_URL ||
      'http://localhost:5173'
    ).replace(/\/+$/, '')

    const portalUrl = `${frontendBaseUrl}/shipments`

    const statusMap = {
      belum_dikirim: 'Menunggu Pengiriman',
      pending: 'Pending Ekspedisi',
      sedang_dikirim: 'Sedang Dalam Pengiriman',
      diterima: 'Telah Diterima',
      cancel: 'Dibatalkan',
    }

    const rendered = await renderEmailTemplate('shipment_status_changed', {
      recipient_name: recipientName,
      nomor_resi: shipment.tracking_number || '(Belum terbit)',
      ekspedisi: shipment.courier || 'Ekspedisi Logistik',
      status_pengiriman: statusMap[shipment.status] || shipment.status || 'Update Pengiriman',
      tujuan: shipment.destination || '-',
      deskripsi_barang: shipment.item_description || 'Perangkat Aset',
      portal_url: portalUrl,
    })

    if (rendered) {
      await sendEmail({
        to: recipientEmail,
        subject: rendered.subject,
        html: rendered.html,
        text: rendered.text,
      })
    }
  } catch (err) {
    console.error('[emailNotificationService] Error dispatching shipment status email:', err.message)
  }
}

/**
 * Dispatch Welcome email for newly registered users
 */
export async function handleWelcomeUserNotification(newUser, options = {}) {
  try {
    const cfg = await getActiveEmailConfig()
    if (!cfg.enabled || !cfg.notify_user_create) return
    if (!newUser || !newUser.email) return

    const frontendBaseUrl = (
      process.env.FRONTEND_URL ||
      process.env.APP_URL ||
      'http://localhost:5173'
    ).replace(/\/+$/, '')

    const loginUrl = `${frontendBaseUrl}/login`

    const rendered = await renderEmailTemplate('user_welcome', {
      recipient_name: newUser.nama || 'Pengguna Baru',
      user_email: newUser.email,
      user_role: newUser.role || 'user',
      login_url: loginUrl,
    })

    if (rendered) {
      await sendEmail({
        to: newUser.email,
        subject: rendered.subject,
        html: rendered.html,
        text: rendered.text,
      })
    }
  } catch (err) {
    console.error('[emailNotificationService] Error dispatching welcome user email:', err.message)
  }
}
