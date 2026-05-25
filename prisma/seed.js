"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const prisma = new client_1.PrismaClient();
async function main() {
    console.log("🌱 Seeding database...");
    // Create demo users
    const passwordHash = await bcryptjs_1.default.hash("password123", 12);
    const alice = await prisma.user.upsert({
        where: { email: "alice@taskchi.tj" },
        update: {},
        create: {
            name: "Алиса Нурова",
            email: "alice@taskchi.tj",
            passwordHash,
            city: "Душанбе",
            bio: "Опытный организатор, помогаю с различными задачами уже 3 года",
            rating: 4.8,
            reviewCount: 24,
            isVerified: true,
        },
    });
    const bob = await prisma.user.upsert({
        where: { email: "bob@taskchi.tj" },
        update: {},
        create: {
            name: "Бобур Рахимов",
            email: "bob@taskchi.tj",
            passwordHash,
            city: "Худжанд",
            bio: "Курьер, знаю весь город как свои пять пальцев",
            rating: 4.5,
            reviewCount: 15,
        },
    });
    // Demo tasks
    const tasks = [
        {
            title: "Забрать ребёнка из школы № 12",
            description: "Нужно забрать дочь (7 лет) из школы № 12 на проспекте Рудаки и отвести домой на улицу Айни. Каждый день в 13:00.",
            category: "CHILDREN",
            budget: 150,
            city: "Душанбе",
            address: "пр. Рудаки, 37",
            latitude: 38.5598,
            longitude: 68.7870,
            creatorId: alice.id,
            commissionFee: 7.5,
        },
        {
            title: "Купить продукты в Корвоне",
            description: "Список покупок: молоко 2л, хлеб 2 шт., яйца 1 десяток, масло сливочное, помидоры 1 кг. Доставить по адресу Айни 45.",
            category: "SHOPPING",
            budget: 30,
            city: "Душанбе",
            address: "ТЦ Корвон",
            latitude: 38.5512,
            longitude: 68.7956,
            creatorId: bob.id,
            commissionFee: 1.5,
        },
        {
            title: "Постоять в очереди за справкой в ХУКУМАТ",
            description: "Нужно занять очередь в хукумат районе Сино с 8 утра для получения справки. Ориентировочно 2-3 часа.",
            category: "QUEUE",
            budget: 80,
            city: "Душанбе",
            address: "Хукумат района Сино",
            latitude: 38.5789,
            longitude: 68.7654,
            creatorId: alice.id,
            commissionFee: 4,
        },
        {
            title: "Перевод документа с русского на таджикский",
            description: "Нужно профессионально перевести договор аренды (3 страницы) с русского языка на таджикский. Срочно, нужно сегодня.",
            category: "ONLINE",
            budget: 50,
            city: "Душанбе",
            creatorId: bob.id,
            commissionFee: 2.5,
        },
        {
            title: "Генеральная уборка квартиры (3 комнаты)",
            description: "Квартира 70 кв.м., 3 комнаты, нужна полная уборка: мытьё полов, окон, сантехники, вытирание пыли.",
            category: "HOUSEHOLD",
            budget: 200,
            city: "Душанбе",
            address: "мкр. Сино",
            latitude: 38.5634,
            longitude: 68.7823,
            creatorId: alice.id,
            commissionFee: 10,
            isGroupTask: true,
            executorsNeeded: 2,
        },
    ];
    for (const task of tasks) {
        await prisma.task.create({ data: task });
    }
    console.log(`✅ Created ${tasks.length} demo tasks`);
    console.log("✅ Demo users: alice@taskchi.tj / bob@taskchi.tj (password: password123)");
}
main()
    .catch((e) => { console.error(e); process.exit(1); })
    .finally(() => prisma.$disconnect());
