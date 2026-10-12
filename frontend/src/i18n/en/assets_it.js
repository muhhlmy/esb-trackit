// TrackIT i18n - English - assets_it domain
export const en = {
  // Page stats & summary
  assets_it_stat_total: 'Total IT Assets',
  assets_it_stat_unavailable: 'Unavailable',
  assets_it_stat_all_data: 'All category data',
  assets_it_stat_summary_aria: 'Asset summary',

  // Search & filter toolbar
  assets_it_search_aria: 'Search assets, serial number, or holder',
  assets_it_search_placeholder: 'Search assets, serial numbers, or holders…',
  assets_it_btn_clear: 'Clear',

  // Device list heading
  assets_it_list_heading: 'Device list',
  assets_it_list_filtered_sub: 'Results matching your search and filters',
  assets_it_list_sub: 'Company IT device inventory',
  assets_it_assets_word: 'assets',

  // Asset table & cards
  assets_it_th_user: 'User',
  assets_it_th_type: 'Type',
  assets_it_table_caption: 'IT asset list',
  assets_it_view_detail_aria: 'View details of',
  assets_it_asset_word: 'asset',
  assets_it_actions_aria: 'Actions for asset',

  // Empty state
  assets_it_empty_title: 'No IT Assets Yet',
  assets_it_empty_desc:
    'No IT assets are registered in the inventory or match your search keywords.',

  // Add/edit asset form modal
  assets_it_form_add_title: 'Add IT Asset',
  assets_it_form_edit_title: 'Edit IT Asset',
  assets_it_form_add_subtitle: 'Complete the device data. Fields marked * are required.',
  assets_it_form_edit_subtitle: 'Update the specifications and configuration of the IT asset unit.',
  assets_it_new_device: 'New device',
  assets_it_form_summary_hint: 'Complete the device identity, placement, and specifications.',
  assets_it_steps_aria: 'Asset form steps',
  assets_it_step_info: 'Device',
  assets_it_step_info_hint: 'Core identity',
  assets_it_step_placement: 'Placement',
  assets_it_step_placement_hint: 'User & location',
  assets_it_step_specs: 'Specifications',
  assets_it_step_specs_hint: 'Details & condition',
  assets_it_step_1_of_3: 'Step 1 of 3',
  assets_it_step_2_of_3: 'Step 2 of 3',
  assets_it_step_3_of_3: 'Step 3 of 3',

  // Step 1: device identity
  assets_it_device_identity: 'Device identity',
  assets_it_step1_guidance: 'Start with the identity printed on the device.',
  assets_it_hostname_label: 'Hostname / Asset Label',
  assets_it_hostname_aria: 'Asset Hostname',
  assets_it_hostname_ph: 'e.g. LAPTOP-IT-04 or WS-FINANCE-01',
  assets_it_serial_aria: 'Asset Serial Number',
  assets_it_serial_ph: 'e.g. PF3ABCDE or 5CD1234XYZ',
  assets_it_device_type: 'Device Type',
  assets_it_device_type_aria: 'Asset Device Type',
  assets_it_device_type_ph: 'Select device type',
  assets_it_step1_tip: 'Use the hostname and serial number printed on the device.',

  // Step 2: placement & holder
  assets_it_placement_section: 'User and location',
  assets_it_step2_guidance: 'Assign the user and the storage location of the device.',
  assets_it_holder_label: 'Asset Holder / Responsible User',
  assets_it_optional: 'Optional',
  assets_it_holder_ph: 'Select the employee holder (leave empty to store as IT Stock)',
  assets_it_holder_search_ph: 'Search by employee name or NIK…',
  assets_it_employee_selected: 'Selected Employee',
  assets_it_dept_default: 'General',
  assets_it_will_be_assigned: 'Will be assigned',
  assets_it_clear_employee_title: 'Clear employee selection (set as Stock)',
  assets_it_stock_title: 'Unit Status: Available Stock',
  assets_it_stock_desc:
    'The device is not assigned to any employee and is stored in the IT inventory pool.',
  assets_it_location_label: 'Asset Placement Location',
  assets_it_location_hint: 'Branch office or physical area',
  assets_it_location_ph: 'Select or type a location (e.g. Solo, Pluit, IT Warehouse)',
  assets_it_location_search_ph: 'Search or type a new location…',
  assets_it_use_new_location: '+ Use new location',

  // Step 3: specifications & condition
  assets_it_specs_section: 'Specifications & Technical Condition',
  assets_it_step3_guidance: 'Complete the specifications and condition before saving.',
  assets_it_brand_label: 'Brand',
  assets_it_brand_ph: 'Select or type a brand',
  assets_it_brand_search_ph: 'Search brands (Lenovo, Dell, HP, Apple)…',
  assets_it_use_new_brand: '+ Use new brand',
  assets_it_model_label: 'Model / Series',
  assets_it_model_ph: 'e.g. ThinkPad T14 Gen 3',
  assets_it_status_label: 'Asset Status',
  assets_it_status_ph: 'Select asset status',
  assets_it_condition_physical: 'Physical Condition',
  assets_it_condition_label: 'Asset Condition',
  assets_it_condition_ph: 'Select asset condition',
  assets_it_specs_label: 'Technical Specifications',
  assets_it_specs_hint: 'CPU, RAM, SSD, OS, etc.',
  assets_it_specs_ph: 'e.g. Intel Core i7-12700H, 16GB DDR5, 512GB NVMe SSD, Windows 11 Pro',
  assets_it_note_label: 'Additional Notes',
  assets_it_note_hint: 'Accessories or special history',
  assets_it_note_ph: 'e.g. Includes original 65W USB-C charger and laptop bag',

  // Form footer
  assets_it_continue: 'Continue',
  assets_it_saving: 'Saving...',
  assets_it_save_changes: 'Save Changes',

  // Validation & error messages
  assets_it_err_step1_incomplete:
    'Please complete the Hostname, Serial Number, and Device Type first.',
  assets_it_err_info_incomplete: 'Please complete the device information data first.',
  assets_it_err_location_required: 'The asset placement location must be selected first.',
  assets_it_err_step1_required: 'Hostname, Serial Number, and Device Type are required.',
  assets_it_err_location_required_short: 'The asset placement location is required.',
  assets_it_err_read_only: 'You only have read access to assets.',
  assets_it_err_hostname_required: 'Hostname is required.',
  assets_it_err_placement_required: 'Asset placement is required.',
  assets_it_err_server_format: 'Invalid data format from the server.',
  assets_it_err_load: 'Failed to load asset data.',
  assets_it_err_save: 'Failed to save the asset.',
  assets_it_err_delete: 'Failed to delete the asset.',
  assets_it_err_export: 'Failed to export assets.',

  // Toast notifications
  assets_it_import_success: 'Excel data successfully imported to the database!',
  assets_it_add_success: 'IT asset added successfully.',
  assets_it_update_success: 'IT asset updated successfully.',
  assets_it_delete_success: 'IT asset deleted successfully.',
  assets_it_export_no_data: 'No asset data matches the export filters.',
  assets_it_export_xlsx_success: 'Asset XLSX created successfully.',
  assets_it_export_pdf_success: 'Report PDF generated successfully.',

  // Filter options
  assets_it_filter_all_status: 'All Statuses',
  assets_it_filter_all_type: 'All Device Types',
  assets_it_filter_all_location: 'All Locations',
  assets_it_filter_all_condition: 'All Conditions',
  assets_it_filter_all_types_short: 'All Types',
  assets_it_all_status_ph: 'All statuses',
  assets_it_all_types_ph: 'All types',
  assets_it_filter_status_label: 'Filter Status',
  assets_it_filter_type_label: 'Filter Device Type',
  assets_it_filter_aria_status: 'Filter status',
  assets_it_filter_aria_type: 'Filter device type',
  assets_it_filter_aria_location: 'Filter location',
  assets_it_filter_aria_condition: 'Filter condition',
  assets_it_filter_title: 'Filter IT Assets',

  // Row actions
  assets_it_action_view_detail: 'View Details',
  assets_it_action_print_label: 'Print Label',
  assets_it_action_edit: 'Edit Asset',
  assets_it_action_assign: 'Assign / Transfer',
  assets_it_action_change_status: 'Change Status',
  assets_it_action_delete: 'Delete Asset',

  // Delete modal
  assets_it_delete_title: 'Delete IT Asset',
  assets_it_delete_word: 'Delete',
  assets_it_delete_confirm: 'The asset data will be permanently deleted.',
  assets_it_deleting: 'Deleting...',

  // Specification modal
  assets_it_spec_title: 'Specification Details',
  assets_it_spec_section: 'Device Specifications',
  assets_it_spec_empty: 'No specification information is available for this asset yet.',

  // Details modal
  assets_it_detail_title: 'Asset Details',
  assets_it_detail_tab_info: 'Detailed Information',
  assets_it_detail_tab_logs: 'Change Log',
  assets_it_serial_number: 'Serial Number',
  assets_it_brand: 'Brand',
  assets_it_employee_name: 'Employee Name',
  assets_it_asset_location: 'Asset Location',
  assets_it_specs_short: 'Specifications',
  assets_it_note_asset: 'Asset Notes',
  assets_it_logs_empty: 'No change history is available for this device yet.',
  assets_it_log_col_before: 'Before',
  assets_it_log_col_after: 'After',
  assets_it_log_field_tipe: 'Type',
  assets_it_log_field_merek: 'Brand',

  // Export modal
  assets_it_export_title: 'Export IT Assets',
  assets_it_export_format_label: 'Select Export Format',
  assets_it_export_pdf_label: 'PDF Report',
  assets_it_exporting: 'Exporting...',

  // Export file sheets & columns
  assets_it_export_filename: 'IT_Assets_Export',
  assets_it_export_sheet_employees: 'Employee Table',
  assets_it_export_sheet_assets: 'Asset Table',
  assets_it_export_col_start_date: 'Employment Start Date',
  assets_it_export_col_supervisor_nik: 'Direct Supervisor NIK',
  assets_it_export_col_office_email: 'Office Email',
  assets_it_export_col_work_location: 'Work Location',
  assets_it_export_col_holder_nik: 'Holder NIK',
  assets_it_export_col_holder_name: 'Holder Employee Name',
  assets_it_export_col_holder_dept: 'Holder Department',
  assets_it_export_col_brand: 'Brand',

  // Display data values
  assets_it_status_disposal: 'Disposal',
  assets_it_kondisi_baru: 'New',
  assets_it_kondisi_baik: 'Good',
  assets_it_kondisi_rusak_ringan: 'Slightly Damaged',
  assets_it_kondisi_rusak_sedang: 'Moderately Damaged',
  assets_it_kondisi_rusak_berat: 'Severely Damaged',
  assets_it_other: 'Other',

  // Asset label print modal
  assets_it_label_modal_title: 'Print Asset Label',
  assets_it_label_modal_subtitle:
    'Print asset barcode sticker (2.17 x 0.98 inch / 55 x 25 mm - Rectangle)',
  assets_it_label_hostname_field: 'Hostname / Label Barcode Value',
  assets_it_label_hostname_ph: 'Enter asset hostname (e.g. IT-UPS-052026-01)',
  assets_it_label_encode_note:
    'This value is encoded into the Code 128 barcode and printed on the label body.',
  assets_it_label_preview: 'Sticker Label Preview (2.17" × 0.98" Rectangle)',
  assets_it_label_barcode_empty: '(Empty Barcode)',
  assets_it_label_code_placeholder: 'LABEL-CODE-0',
  assets_it_label_property_line1: 'THIS ASSET IS THE PROPERTY OF',
  assets_it_printing: 'Opening Print...',
  assets_it_print_label_btn: 'Print Label',
}
