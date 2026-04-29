/*
 * Plan 02-03 — /eventos slash command
 *
 * Lists the next 5 upcoming events fetched from the events-botListUpcoming
 * Cloud Function endpoint. Responds with a public embed listing event name,
 * date, location and RSVP count.
 */
import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import type { ChatInputCommandInteraction } from 'discord.js';
import { callFunction } from '../lib/functionClient.js';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export const data = new SlashCommandBuilder()
  .setName('eventos')
  .setDescription('Muestra los próximos 5 eventos de GameChangers');

type EventItem = {
  id: string;
  name: string;
  startsAt: number; // unix seconds
  location: string;
  capacity: number;
  rsvpCount: number;
};

type EventsData = {
  events: EventItem[];
};

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply();

  const result = await callFunction<EventsData>(
    process.env['EVENTS_BOT_LIST_UPCOMING_URL']!,
    { limit: 5 },
  );

  if (!result.ok) {
    await interaction.editReply({
      content: 'No se pudieron cargar los eventos. Intentá de nuevo más tarde.',
    });
    return;
  }

  const { events } = result.data;

  if (events.length === 0) {
    await interaction.editReply({
      content: 'No hay eventos próximos programados. Seguí el servidor para cuando anunciemos el siguiente!',
    });
    return;
  }

  const embed = new EmbedBuilder()
    .setTitle('Próximos Eventos GameChangers')
    .setColor(0x57f287) // green
    .setFooter({ text: 'Usá /link para vincular tu cuenta y hacer RSVP en la app!' });

  for (const evt of events) {
    const dateStr = format(new Date(evt.startsAt * 1000), 'dd MMM HH:mm', { locale: es });
    const spotsLeft = evt.capacity - evt.rsvpCount;
    const spotsText = spotsLeft > 0 ? `${spotsLeft} lugares disponibles` : 'Agotado';
    embed.addFields({
      name: `${evt.name}`,
      value: `📅 ${dateStr} | 📍 ${evt.location} | 👥 ${evt.rsvpCount}/${evt.capacity} (${spotsText})`,
    });
  }

  await interaction.editReply({ embeds: [embed] });
}
