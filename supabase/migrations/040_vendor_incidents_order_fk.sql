-- vendor_incidents.order_id had no FK; PostgREST embeds require one.
ALTER TABLE public.vendor_incidents
  DROP CONSTRAINT IF EXISTS vendor_incidents_order_id_fkey;

ALTER TABLE public.vendor_incidents
  ADD CONSTRAINT vendor_incidents_order_id_fkey
  FOREIGN KEY (order_id) REFERENCES public.orders(id)
  ON DELETE SET NULL;
