-- Extend reviews SELECT policy so customers can see their own reviews
-- regardless of status. The account/reviews page assumes this — without it,
-- pending reviews are silently filtered out and the "awaiting review" list
-- shows duplicates after submission.

drop policy if exists "reviews: public read published" on public.reviews;

create policy "reviews: public + owner + admin read" on public.reviews
  for select using (
    status = 'published'
    or profile_id = auth.uid()
    or public.app_current_role() = 'admin'
  );
