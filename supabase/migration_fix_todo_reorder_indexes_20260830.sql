-- Fix drag reorder persistence.
-- Project plan ordering is per project phase/backlog lane, while team
-- workspace ordering applies only to non-project todos.

drop index if exists todos_position_project_active_unique;
drop index if exists todos_position_project_phase_active_unique;
create unique index todos_position_project_phase_active_unique
  on todos (project_id, coalesce(phase_id, '00000000-0000-0000-0000-000000000000'::uuid), position)
  where project_id is not null and done = false and position is not null;

drop index if exists todos_position_team_active_unique;
create unique index todos_position_team_active_unique
  on todos (team_id, position)
  where team_id is not null and project_id is null and done = false and position is not null;
