"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const CATEGORY_EMOJI: Record<string, string> = {
  CHILDREN: "👶",
  SHOPPING: "🛒",
  DELIVERY: "🚚",
  QUEUE: "🕐",
  HOUSEHOLD: "🏠",
  ONLINE: "💻",
};

interface MapTask {
  id: string;
  title: string;
  category: string;
  budget: number;
  city: string;
  address?: string | null;
  latitude: number;
  longitude: number;
  _count: { offers: number };
}

interface MapClientProps {
  tasks: MapTask[];
}

export function MapClient({ tasks }: MapClientProps) {
  const [MapComponents, setMapComponents] = useState<{
    MapContainer: typeof import("react-leaflet")["MapContainer"];
    TileLayer: typeof import("react-leaflet")["TileLayer"];
    Marker: typeof import("react-leaflet")["Marker"];
    Popup: typeof import("react-leaflet")["Popup"];
  } | null>(null);

  const [selectedTask, setSelectedTask] = useState<MapTask | null>(null);

  useEffect(() => {
    // Dynamically import Leaflet to avoid SSR issues
    Promise.all([
      import("react-leaflet"),
      import("leaflet"),
      import("leaflet/dist/leaflet.css"),
    ]).then(([rl, L]) => {
      // Fix default marker icons
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (L.default.Icon.Default.prototype as any)._getIconUrl;
      L.default.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      setMapComponents({
        MapContainer: rl.MapContainer,
        TileLayer: rl.TileLayer,
        Marker: rl.Marker,
        Popup: rl.Popup,
      });
    });
  }, []);

  // Dushanbe center coordinates
  const CENTER: [number, number] = [38.5598, 68.7870];

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Карта задач</h1>
          <p className="text-slate-500 text-sm mt-0.5">{tasks.length} задач на карте</p>
        </div>
        <Link href="/tasks" className="btn-secondary text-sm">
          ← К ленте
        </Link>
      </div>

      {tasks.length === 0 ? (
        <div className="card text-center py-16">
          <div className="text-5xl mb-4">🗺️</div>
          <h2 className="text-xl font-semibold text-slate-700 mb-2">Задач с геолокацией пока нет</h2>
          <p className="text-slate-500 text-sm">При создании задачи укажите адрес, чтобы она появилась на карте</p>
          <Link href="/tasks/create" className="btn-primary inline-block mt-4">
            Создать задачу
          </Link>
        </div>
      ) : (
        <div className="grid md:grid-cols-3 gap-4">
          {/* Map */}
          <div className="md:col-span-2">
            <div className="rounded-2xl overflow-hidden shadow-sm border border-slate-100" style={{ height: "600px" }}>
              {MapComponents ? (
                <MapComponents.MapContainer
                  center={CENTER}
                  zoom={13}
                  style={{ height: "100%", width: "100%" }}
                >
                  <MapComponents.TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  {tasks.map((task) => (
                    <MapComponents.Marker
                      key={task.id}
                      position={[task.latitude, task.longitude]}
                      eventHandlers={{
                        click: () => setSelectedTask(task),
                      }}
                    >
                      <MapComponents.Popup>
                        <div className="text-center min-w-[160px]">
                          <div className="text-2xl mb-1">{CATEGORY_EMOJI[task.category]}</div>
                          <div className="font-semibold text-sm mb-1">{task.title}</div>
                          <div className="text-[#14A800] font-bold">{task.budget} сом</div>
                          <Link
                            href={`/tasks/${task.id}`}
                            className="block mt-2 text-xs text-[#14A800] hover:underline"
                          >
                            Подробнее →
                          </Link>
                        </div>
                      </MapComponents.Popup>
                    </MapComponents.Marker>
                  ))}
                </MapComponents.MapContainer>
              ) : (
                <div className="flex items-center justify-center h-full bg-slate-100">
                  <div className="text-slate-400">Загрузка карты...</div>
                </div>
              )}
            </div>
          </div>

          {/* Task list */}
          <div className="space-y-3 overflow-y-auto" style={{ maxHeight: "600px" }}>
            {tasks.map((task) => (
              <div
                key={task.id}
                onClick={() => setSelectedTask(task)}
                className={`card cursor-pointer transition-all ${
                  selectedTask?.id === task.id
                    ? "border-[#14A800] shadow-md"
                    : "hover:border-green-200 hover:shadow"
                }`}
              >
                <div className="flex items-start gap-2">
                  <span className="text-xl">{CATEGORY_EMOJI[task.category]}</span>
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-sm text-slate-800 line-clamp-2">
                      {task.title}
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      📍 {task.address || task.city}
                    </div>
                  </div>
                  <div className="text-[#14A800] font-bold text-sm whitespace-nowrap">
                    {task.budget} сом
                  </div>
                </div>
                {selectedTask?.id === task.id && (
                  <Link
                    href={`/tasks/${task.id}`}
                    className="btn-primary block text-center mt-3 text-sm py-2"
                    onClick={(e) => e.stopPropagation()}
                  >
                    Открыть задачу →
                  </Link>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
