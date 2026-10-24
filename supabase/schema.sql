-- Cartas navideñas: cualquiera puede LEER las cartas; solo se pueden ESCRIBIR
-- a través de guardar_carta(), que valida la palabra secreta.
-- Las palabras nunca se guardan: solo un hash con una sal distinta a la de data.js
-- (los hashes de data.js son públicos, así que no sirven para escribir cartas).

create table if not exists public.cartas (
  person_id   text primary key,
  contenido   text not null check (char_length(contenido) <= 2000),
  actualizado timestamptz not null default now()
);
alter table public.cartas enable row level security;
drop policy if exists "cartas publicas" on public.cartas;
create policy "cartas publicas" on public.cartas for select to anon, authenticated using (true);
revoke insert, update, delete on public.cartas from anon, authenticated;
grant select on public.cartas to anon, authenticated;

-- Sin policies: la API no puede leer esta tabla.
create table if not exists public.palabras (
  hash      text primary key,
  person_id text not null unique
);
alter table public.palabras enable row level security;
revoke all on public.palabras from anon, authenticated;

create or replace function public.guardar_carta(palabra text, texto text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  pid text;
begin
  select person_id into pid
  from palabras
  where hash = encode(sha256(convert_to('peluche2026|carta|' || coalesce(palabra, ''), 'UTF8')), 'hex');

  if pid is null then
    raise exception 'palabra incorrecta' using errcode = '28000';
  end if;

  texto := btrim(coalesce(texto, ''));
  if char_length(texto) > 2000 then
    raise exception 'carta muy larga';
  end if;

  if texto = '' then
    delete from cartas where person_id = pid;
  else
    insert into cartas (person_id, contenido) values (pid, texto)
    on conflict (person_id) do update set contenido = excluded.contenido, actualizado = now();
  end if;

  return pid;
end
$$;
revoke all on function public.guardar_carta(text, text) from public;
grant execute on function public.guardar_carta(text, text) to anon, authenticated;
