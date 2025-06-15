const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const initialServers = [
    {
        name: 'Local Test Server',
        host: '127.0.0.1',
        port: 25565,
        version: '1.20.4'
    },
    {
        name: 'MineBlaze',
        host: 'mc.mineblaze.net',
        port: 25565,
        version: '1.20.1'
    },
    {
        name: 'MasedWorld',
        host: 'mc.masedworld.net',
        port: 25565,
        version: '1.20.1'
    },
    {
        name: 'DexLand',
        host: 'mc.dexland.org',
        port: 25565,
        version: '1.20.1'
    },
    {
        name: 'CheatMine',
        host: 'mc.cheatmine.net',
        port: 25565,
        version: '1.20.1'
    }
];

async function main() {
    console.log('Start seeding initial servers...');

    await Promise.all(
        initialServers.map(server => 
            prisma.server.upsert({
                where: { name: server.name },
                update: {},
                create: server,
            })
        )
    );

    console.log(`${initialServers.length} серверов были успешно созданы или уже существовали.`);
}

main()
    .catch((e) => {
        console.error('Error during seeding:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });