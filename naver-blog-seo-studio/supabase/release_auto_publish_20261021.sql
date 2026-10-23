-- AIMaster production ref esgxyikcnnvmlhygjkth. Metadata only; no DDL/RLS/env changes.
-- v1.81 applied after Ready dpl_HRqidUqkvf8CFCTJsKmnomDzGEb4.
-- v1.82 applied after Ready dpl_DyAwonM3e6p7fV3jSpBpv9dbZ1jE.
-- v1.83: apply only after its production Ready/official alias is verified.
update public.programs set version='v1.83', extension_version='v1.83'
where slug='naver-blog-seo-studio' and version='v1.82' and extension_version='v1.82'
returning slug, version, extension_version;
