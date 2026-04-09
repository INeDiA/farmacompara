
CREATE TABLE public.rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address text NOT NULL,
  requested_at timestamptz NOT NULL DEFAULT now(),
  blocked_until timestamptz
);

CREATE INDEX idx_rate_limits_ip_time ON public.rate_limits (ip_address, requested_at);
CREATE INDEX idx_rate_limits_ip_blocked ON public.rate_limits (ip_address, blocked_until);

ALTER TABLE public.search_cache ALTER COLUMN expires_at SET DEFAULT (now() + interval '48 hours');
