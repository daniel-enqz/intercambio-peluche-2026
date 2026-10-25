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

-- Votación "¿A quién le toca arrullar al Niño?": contadores públicos.
-- Solo se modifican vía votar_arrullo(); el "un voto por dispositivo" lo controla la página.
create table if not exists public.votos_arrullo (
  person_id text primary key,
  votos     integer not null default 0 check (votos >= 0)
);
alter table public.votos_arrullo enable row level security;
drop policy if exists "votos publicos" on public.votos_arrullo;
create policy "votos publicos" on public.votos_arrullo for select to anon, authenticated using (true);
revoke insert, update, delete on public.votos_arrullo from anon, authenticated;
grant select on public.votos_arrullo to anon, authenticated;

create or replace function public.votar_arrullo(nuevo text, anterior text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if anterior is not null and exists (select 1 from palabras where person_id = anterior) then
    update votos_arrullo set votos = greatest(votos - 1, 0) where person_id = anterior;
  end if;
  if nuevo is not null and exists (select 1 from palabras where person_id = nuevo) then
    insert into votos_arrullo (person_id, votos) values (nuevo, 1)
    on conflict (person_id) do update set votos = votos_arrullo.votos + 1;
  end if;
end
$$;
revoke all on function public.votar_arrullo(text, text) from public;
grant execute on function public.votar_arrullo(text, text) to anon, authenticated;

-- Cena de posada: lista pública de platillos y quién los lleva.
-- Solo se agregan vía agregar_platillo(), que valida que la persona exista.
create table if not exists public.cena_platillos (
  id        bigint generated always as identity primary key,
  platillo  text not null check (char_length(platillo) between 1 and 80),
  person_id text not null,
  creado    timestamptz not null default now()
);
alter table public.cena_platillos enable row level security;
drop policy if exists "cena publica" on public.cena_platillos;
create policy "cena publica" on public.cena_platillos for select to anon, authenticated using (true);
revoke insert, update, delete on public.cena_platillos from anon, authenticated;
grant select on public.cena_platillos to anon, authenticated;

create or replace function public.agregar_platillo(platillo text, quien text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  platillo := btrim(coalesce(platillo, ''));
  if platillo = '' or char_length(platillo) > 80 then
    raise exception 'platillo inválido';
  end if;
  if not exists (select 1 from palabras where person_id = quien) then
    raise exception 'persona inválida';
  end if;
  insert into cena_platillos (platillo, person_id) values (platillo, quien);
end
$$;
revoke all on function public.agregar_platillo(text, text) from public;
grant execute on function public.agregar_platillo(text, text) to anon, authenticated;

-- Cualquiera puede borrar un platillo de la cena (solo por id, vía esta función).
create or replace function public.borrar_platillo(platillo_id bigint)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from cena_platillos where id = platillo_id;
end
$$;
revoke all on function public.borrar_platillo(bigint) from public;
grant execute on function public.borrar_platillo(bigint) to anon, authenticated;
