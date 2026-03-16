import { prisma } from '../src/prisma.js';

const promoCodes = [
    {
        code: 'LECLERC',
        maxUses: 21,
        bonus: 75.00,
    },
];

async function main() {
    for (const promo of promoCodes) {
        await prisma.promoCode.upsert({
            where: { code: promo.code },
            update: {},
            create: promo,
        });

        console.log(`✓ ${promo.code} — бонус ${promo.bonus}`);
    }
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());