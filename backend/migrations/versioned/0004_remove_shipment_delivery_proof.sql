-- Delivery proof has been removed from the shipment workflow.
ALTER TABLE public.asset_shipments DROP COLUMN IF EXISTS delivery_proof_url;
