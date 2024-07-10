import type { FastifyInstance  } from "fastify";
import { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from 'zod'
import { prisma } from "../lib/prisma";
import { getMailClient } from "../lib/mail";
import { dayjs } from "../lib/dayjs";
import nodemailer from 'nodemailer';
import { ClientError } from "../errors/client-error";
import { env } from "../env";

export async function createInvite(app: FastifyInstance) {
    app.withTypeProvider<ZodTypeProvider>().post("/trips/:tripId/invites", {
        schema: {
            params: z.object({
                tripId: z.string().uuid()
            }),
            body: z.object({
                email: z.string().email(),
            })
        },
    }, async (request) => {
   
        const { email } = request.body;
        const { tripId } = request.params;

        const trip = await prisma.trip.findUnique({
            where: {
                id: tripId
            }
        });

        if (!trip) {
            throw new ClientError('Trip not found');
        }

        const participant = await prisma.participant.create({
            data: {
               email,
               trip_id: tripId
            }
        });

        const formattedStartDate = dayjs(trip.starts_at).format('LL')
        const formattedEndDate = dayjs(trip.starts_at).format('LL')

        const mail = await getMailClient();
        const confirmationLink = `${env.API_BASE_URL}/participants/${participant.id}/confirm`

        const message = await mail.sendMail({
            from: {
                name: 'Equipe planner',
                address: 'oi@planner'
            },
            to: participant.email,
            subject: `Confirme sua viagem para ${trip.destination} em ${formattedStartDate}`,
            html: `
                <div style="font-family: sans-serif; font-size: 16px; line-height: 1.6;">
                    <p></p>
                    <p>
                        Você foi convidado para participar de uma viagem para <strong>${trip.destination}</strong>, nas datas <strong>${formattedStartDate}</strong> a <strong>${formattedEndDate}</strong>
                    </p>
                    <p></p>

                    <p>Para confirmar sua vivagem, clique no link abaixo:</p>
                    <p></p>

                    <p><a href="${confirmationLink}">Confirmar viagem</a></p>
                    <p></p>

                    <p>Caso voce não reconheça, desconsidere</p>
                </div>
            `.trim()
        })

        console.log(nodemailer.getTestMessageUrl(message));

        return { participantId: participant.id }
    });
}