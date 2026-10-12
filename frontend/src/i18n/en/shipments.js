// TrackIT i18n - English - shipments domain
export const en = {
    // Shipment statuses (labels & filter options)
    shipments_status_all: 'All Statuses',
    shipments_status_belum_dikirim: 'Unshipped',
    shipments_status_pending: 'Pending',
    shipments_status_sedang_dikirim: 'In Transit',
    shipments_status_diterima: 'Delivered',
    shipments_status_cancel: 'Cancelled',

    // Empty state
    shipments_empty_add: 'Add your first shipment to start tracking.',
    shipments_empty_filtered: 'No shipment data matches the selected filters.',

    // Table & cards
    shipments_view_proof: 'View Proof',
    shipments_proof_link_title: 'Open the delivery proof link in a new tab',
    shipments_edit_shipment: 'Edit shipment',
    shipments_delete_shipment: 'Delete shipment',
    shipments_list_aria: 'Shipment list',
    shipments_resi_label: 'Tracking',

    // Form modal
    shipments_modal_edit_title: 'Edit Shipment',
    shipments_form_subtitle: 'Complete the recipient, item, and destination. Fields marked with * are required.',
    shipments_section_info: 'Shipment Information',
    shipments_section_info_hint: 'Set the request date and shipment status.',
    shipments_form_request_date: 'Request date',
    shipments_aria_status: 'Shipment status',
    shipments_placeholder_status: 'Select status',
    shipments_section_recipient: 'Recipient & Item',
    shipments_section_recipient_hint: 'Complete the recipient, destination, and details of the shipped items.',
    shipments_placeholder_recipient: 'Recipient name',
    shipments_placeholder_item: 'Details of the shipped items',
    shipments_placeholder_destination: 'Branch office, address, or destination location',
    shipments_section_tracking: 'Tracking & Proof',
    shipments_section_tracking_hint: 'Optional. Complete once the tracking number or proof is available.',
    shipments_optional: 'Optional',
    shipments_proof_link_label: 'Delivery Proof Link',
    shipments_placeholder_tracking: 'Courier tracking number',
    shipments_placeholder_proof_url: 'https://example.com/proof.jpg',
    shipments_saving: 'Saving...',
    shipments_save_changes: 'Save changes',

    // Filter modal
    shipments_filter_title: 'Filter Shipments',
    shipments_aria_filter_status: 'Filter status',
    shipments_aria_date_from: 'Start date',
    shipments_aria_date_to: 'End date',

    // Delete modal
    shipments_delete_modal_title: 'Delete Shipment Data',
    shipments_delete_msg_prefix: 'The shipment data for',
    shipments_delete_msg_suffix: 'will be deleted. This action cannot be undone.',
    shipments_deleting: 'Deleting...',
    shipments_delete_data: 'Delete Data',

    // Messages & notifications
    shipments_error_load: 'Failed to load shipment data.',
    shipments_error_request_date: 'Request date is required.',
    shipments_error_recipient: 'Recipient name is required.',
    shipments_error_item: 'Item description is required.',
    shipments_error_destination: 'Delivery destination is required.',
    shipments_error_proof_url: 'The delivery proof link must start with http:// or https://.',
    shipments_error_save: 'Failed to save shipment data.',
    shipments_error_delete: 'Failed to delete shipment data.',
    shipments_toast_added: 'Shipment data added successfully.',
    shipments_toast_updated: 'Shipment data updated successfully.',
    shipments_toast_deleted: 'Shipment data deleted successfully.',
}
