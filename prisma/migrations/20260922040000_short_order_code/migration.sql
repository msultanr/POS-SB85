-- Eight random base32 characters (40 bits), excluding ambiguous I/O/0/1.
-- PostgreSQL 14+ provides gen_random_uuid without an extra extension.
CREATE FUNCTION generate_order_code() RETURNS TEXT
LANGUAGE plpgsql VOLATILE AS $$
DECLARE
  alphabet CONSTANT TEXT := '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  random_bytes BYTEA := decode(replace(gen_random_uuid()::text, '-', ''), 'hex');
  result TEXT := 'SB85-';
  i INTEGER;
BEGIN
  FOR i IN 8..15 LOOP
    result := result || substr(alphabet, (get_byte(random_bytes, i) % 32) + 1, 1);
  END LOOP;
  RETURN result;
END;
$$;

ALTER TABLE "Order" ADD COLUMN "code" VARCHAR(13);
CREATE UNIQUE INDEX "Order_code_key" ON "Order"("code");
ALTER TABLE "Order" ALTER COLUMN "code" SET DEFAULT generate_order_code();

-- Preserve every existing order and retry the unlikely random-code collision.
DO $$
DECLARE existing RECORD;
BEGIN
  FOR existing IN SELECT id FROM "Order" WHERE code IS NULL LOOP
    LOOP
      BEGIN
        UPDATE "Order" SET code = generate_order_code() WHERE id = existing.id;
        EXIT;
      EXCEPTION WHEN unique_violation THEN
        NULL;
      END;
    END LOOP;
  END LOOP;
END;
$$;
ALTER TABLE "Order" ALTER COLUMN "code" SET NOT NULL;
ALTER TABLE "Order" ADD CONSTRAINT "Order_code_format_check"
  CHECK (code ~ '^SB85-[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{8}$');
