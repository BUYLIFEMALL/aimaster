-- Review editing, publish progress and completed post history; no schema changes.
update public.programs set version = 'v1.88' where slug = 'threads-content-ops';
