-- A failed reverse delivery returns the parcel to its origin (the customer).
-- Keep that journey intact while allowing a new collection for the approved request.
DROP INDEX shipping_return_leg_active;
CREATE UNIQUE INDEX shipping_return_leg_active ON shipping_shipment(return_request_id,leg)
  WHERE return_request_id IS NOT NULL AND status<>'CANCELLED'
    AND (leg<>'CUSTOMER_RETURN' OR status<>'RETURNED');
