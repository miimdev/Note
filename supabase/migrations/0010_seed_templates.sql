-- 0010_seed_templates.sql
-- Built-in templates. They live once in the database (user_id = null,
-- is_system = true) and are readable by every authenticated user through RLS.

insert into public.templates (user_id, name, description, icon, position, content, is_system)
select null, v.name, v.description, v.icon, v.position, v.content, true
from (
  values
    ('جلسه', 'صورت‌جلسه با شرکت‌کنندگان، تصمیم‌ها و کارهای بعدی', 'calendar', 0,
     '{"type":"doc","content":[{"type":"heading","attrs":{"level":1},"content":[{"type":"text","text":"صورت‌جلسه"}]},{"type":"paragraph"},{"type":"heading","attrs":{"level":2},"content":[{"type":"text","text":"شرکت‌کنندگان"}]},{"type":"bulletList","content":[{"type":"listItem","content":[{"type":"paragraph"}]}]},{"type":"heading","attrs":{"level":2},"content":[{"type":"text","text":"دستور جلسه"}]},{"type":"orderedList","content":[{"type":"listItem","content":[{"type":"paragraph"}]}]},{"type":"heading","attrs":{"level":2},"content":[{"type":"text","text":"تصمیم‌ها"}]},{"type":"bulletList","content":[{"type":"listItem","content":[{"type":"paragraph"}]}]},{"type":"heading","attrs":{"level":2},"content":[{"type":"text","text":"کارهای بعدی"}]},{"type":"taskList","content":[{"type":"taskItem","attrs":{"checked":false},"content":[{"type":"paragraph"}]}]}]}'::jsonb),
    ('لیست کارها', 'چک‌لیست ساده برای کارهای روزانه', 'check-square', 1,
     '{"type":"doc","content":[{"type":"heading","attrs":{"level":1},"content":[{"type":"text","text":"کارهای امروز"}]},{"type":"taskList","content":[{"type":"taskItem","attrs":{"checked":false},"content":[{"type":"paragraph"}]},{"type":"taskItem","attrs":{"checked":false},"content":[{"type":"paragraph"}]},{"type":"taskItem","attrs":{"checked":false},"content":[{"type":"paragraph"}]}]},{"type":"heading","attrs":{"level":2},"content":[{"type":"text","text":"یادداشت"}]},{"type":"paragraph"}]}'::jsonb),
    ('ژورنال', 'نوشتار روزانه: چه خوب پیش رفت؟ چه چیزی سخت بود؟', 'book-open', 2,
     '{"type":"doc","content":[{"type":"heading","attrs":{"level":1},"content":[{"type":"text","text":"ژورنال روزانه"}]},{"type":"heading","attrs":{"level":2},"content":[{"type":"text","text":"امروز چه خوب پیش رفت؟"}]},{"type":"paragraph"},{"type":"heading","attrs":{"level":2},"content":[{"type":"text","text":"چه چیزی سخت بود؟"}]},{"type":"paragraph"},{"type":"heading","attrs":{"level":2},"content":[{"type":"text","text":"کاری که فردا مهم است"}]},{"type":"taskList","content":[{"type":"taskItem","attrs":{"checked":false},"content":[{"type":"paragraph"}]}]}]}'::jsonb),
    ('پروژه', 'هدف، محدوده، وظایف و ریسک‌های یک پروژه', 'rocket', 3,
     '{"type":"doc","content":[{"type":"heading","attrs":{"level":1},"content":[{"type":"text","text":"نام پروژه"}]},{"type":"paragraph"},{"type":"heading","attrs":{"level":2},"content":[{"type":"text","text":"محدوده"}]},{"type":"bulletList","content":[{"type":"listItem","content":[{"type":"paragraph"}]}]},{"type":"heading","attrs":{"level":2},"content":[{"type":"text","text":"وظایف"}]},{"type":"taskList","content":[{"type":"taskItem","attrs":{"checked":false},"content":[{"type":"paragraph"}]}]},{"type":"heading","attrs":{"level":2},"content":[{"type":"text","text":"ریسک‌ها"}]},{"type":"paragraph"}]}'::jsonb)
) as v(name, description, icon, position, content)
where not exists (
  select 1 from public.templates t where t.is_system = true and t.name = v.name
);
