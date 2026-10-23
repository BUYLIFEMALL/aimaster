-- v1.04: AI keys are the member's own only (operator env fallback and shared analysis copy removed).
update public.programs set version = 'v1.04', updated_at = now() where slug = 'real-estate-sales';
