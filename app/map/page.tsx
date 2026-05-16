import { unstable_noStore as noStore } from "next/cache";
import { prisma } from "@/lib/prisma";
import { MapClient } from "./MapClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const metadata = { title: "Карта задач" };

async function getMapTasks() {
  noStore();
  try {
    return await prisma.task.findMany({
      where: {
        status: "OPEN",
        latitude: { not: null },
        longitude: { not: null },
      },
      select: {
        id: true,
        title: true,
        category: true,
        budget: true,
        city: true,
        address: true,
        latitude: true,
        longitude: true,
        _count: { select: { offers: true } },
      },
      take: 200,
    });
  } catch {
    return [];
  }
}

export default async function MapPage() {
  const tasks = await getMapTasks();
  return <MapClient tasks={tasks as Parameters<typeof MapClient>[0]["tasks"]} />;
}
