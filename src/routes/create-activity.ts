import type { FastifyInstance  } from "fastify";
import { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from 'zod'
import { prisma } from "../lib/prisma";
import { dayjs } from "../lib/dayjs";
import { ClientError } from "../errors/client-error";

export async function createActivity(app: FastifyInstance) {
    app.withTypeProvider<ZodTypeProvider>().post("/trips/:tripId/activities", {
        schema: {
            body: z.object({
                title: z.string().min(4),
                occurs_at: z.coerce.date(),
            }),
            params: z.object({
                tripId: z.string().uuid()
            })
        }
    }, async (request) => {
   
        const { title, occurs_at } = request.body;
        const { tripId } = request.params;

        const trip = await prisma.trip.findUnique({
            where: {
                id: tripId
            }
        });

        if (!trip) {
            throw new ClientError('Trip not found');
        }

        if (dayjs(occurs_at).isBefore(trip.starts_at) || dayjs(occurs_at).isAfter(trip.ends_at)) {
            throw new ClientError('Invalid activity date');
        }

        const activity = await prisma.activity.create({
            data: {
                title,
                occurs_at,
                tripId
            }
        })

        return { activityId: activity.id }
    });
}