create table todos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  text text not null,
  done boolean not null default false,
  created_at timestamptz not null default now()
);

-- Only allow users to see and modify their own todos
alter table todos enable row level security;

create policy "Users can manage their own todos"
  on todos for all
  using (auth.uid() = user_id);
